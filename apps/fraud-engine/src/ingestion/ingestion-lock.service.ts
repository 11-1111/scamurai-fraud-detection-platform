import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/*
 * A cross-process lock around an ingestion run.
 *
 * The scheduled poll is already safe: the orchestrator derives a
 * deterministic job id from the source name, so several engine replicas
 * enqueueing the same minute's poll produce one job. The manual sync
 * endpoint bypasses that entirely and calls the service directly, so two
 * requests -- or a request and the scheduler -- could run the same batch at
 * the same time.
 *
 * Concurrent runs are not harmless. Both read the same rows from the same
 * cursor, both ingest them, and both then write the watermark; the slower one
 * can move it backwards, which makes the engine re-ingest work it had already
 * finished. The individual writes are idempotent, so nothing is corrupted,
 * but the run stops being a unit of progress.
 *
 * SQL Server application locks, rather than Redis or a lock table. Redis is
 * already a degraded-tolerant dependency -- ingestion is expected to keep
 * working without it -- so taking a correctness lock there would make it
 * suddenly required. FraudDb is the one store ingestion genuinely cannot
 * proceed without, which makes it the honest place for this.
 */

/* One lock per source, so adding a second source does not serialise it. */
export function ingestionLockName(sourceName: string): string {
  return `scamurai:ingestion:${sourceName}`;
}

type LockHandle = {
  release: () => Promise<void>;
};

@Injectable()
export class IngestionLockService {
  private readonly logger = new Logger(IngestionLockService.name);

  constructor(
    @InjectDataSource('fraud')
    private readonly dataSource: DataSource,
  ) {}

  /*
   * Run `work` while holding the lock, or return notAcquired without running
   * it. The timeout is zero on purpose: a caller asking for a sync that is
   * already running wants to be told, not queued behind it for minutes
   * holding an HTTP request open.
   */
  async runExclusively<T>(
    sourceName: string,
    work: () => Promise<T>,
  ): Promise<{ acquired: true; result: T } | { acquired: false }> {
    const lock = await this.acquire(sourceName);

    if (!lock) {
      return { acquired: false };
    }

    try {
      return { acquired: true, result: await work() };
    } finally {
      await lock.release();
    }
  }

  /*
   * Session-scoped, which is why this holds its own QueryRunner for the
   * duration. sp_getapplock ties the lock to the connection that took it, so
   * acquiring it on a pooled connection and releasing it on whichever one
   * came back next would release nothing -- and the lock would survive until
   * that connection was recycled.
   */
  private async acquire(sourceName: string): Promise<LockHandle | null> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();

    try {
      const rows = (await runner.query(
        `
        DECLARE @result INT;
        EXEC @result = sp_getapplock
          @Resource = @0,
          @LockMode = 'Exclusive',
          @LockOwner = 'Session',
          @LockTimeout = 0;
        SELECT @result AS result;
        `,
        [ingestionLockName(sourceName)],
      )) as Array<{ result: number }> | undefined;

      /*
       * 0 and 1 both mean granted (1 after waiting). Negative values mean it
       * was not: -1 timed out, -3 was chosen as a deadlock victim.
       */
      const status = Number(rows?.[0]?.result ?? -1);

      if (status < 0) {
        await runner.release();
        this.logger.warn(
          `Ingestion for ${sourceName} is already running; skipping this request.`,
        );
        return null;
      }

      return {
        release: async () => {
          try {
            await runner.query(
              `EXEC sp_releaseapplock @Resource = @0, @LockOwner = 'Session';`,
              [ingestionLockName(sourceName)],
            );
          } catch (error) {
            /*
             * Releasing failed, which is survivable: the lock is tied to this
             * connection and SQL Server drops it when the connection closes
             * below. Worth a line, because it should not happen.
             */
            this.logger.warn(
              `Could not release the ingestion lock for ${sourceName}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          } finally {
            await runner.release();
          }
        },
      };
    } catch (error) {
      await runner.release();
      throw error;
    }
  }
}
