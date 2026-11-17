import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import {
  FraudGraphOutboxEntity,
  FraudGraphOutboxStatus,
} from '../../database/entities/fraud-graph-outbox.entity';
import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';
import { GraphProjectionService } from './graph-projection.service';

/*
 * How many attempts a row gets before it is parked as FAILED. Five attempts
 * with the backoff below spans about eight minutes, which covers a restart or
 * a brief outage without retrying a genuinely broken row forever.
 *
 * A longer Neo4j outage will park rows. That is the intended outcome: they
 * stay in the table with their last error, and replaying them is a decision
 * someone makes after fixing the cause, not something that happens silently
 * hours later.
 */
const MAX_ATTEMPTS = 5;

/** Rows claimed per drain. Small, because the drain runs often. */
const BATCH_SIZE = 50;

/*
 * A row claimed but not completed for this long is assumed abandoned -- a
 * worker killed mid-apply leaves PROCESSING behind, and nothing else would
 * ever pick it up.
 */
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

type ClaimedRow = {
  id: string;
  transaction_id: string;
  attempts: number;
};

@Injectable()
export class GraphOutboxService {
  private readonly logger = new Logger(GraphOutboxService.name);

  constructor(
    @InjectDataSource('fraud')
    private readonly dataSource: DataSource,

    @InjectRepository(FraudGraphOutboxEntity, 'fraud')
    private readonly outboxRepo: Repository<FraudGraphOutboxEntity>,

    @InjectRepository(FraudTransactionEntity, 'fraud')
    private readonly transactionRepo: Repository<FraudTransactionEntity>,

    private readonly graphProjection: GraphProjectionService,
  ) {}

  /*
   * Record that the graph owes a write for this transaction.
   *
   * Takes the caller's EntityManager rather than using its own: the whole
   * point is for this insert to be in the same transaction as the rows it
   * refers to, so that a committed transaction and a recorded graph debt are
   * the same event.
   *
   * MERGE rather than INSERT because ingestion upserts. A transaction read
   * twice must not queue two writes, and a row that previously exhausted its
   * attempts should get a fresh start rather than stay parked.
   */
  async enqueue(manager: EntityManager, transactionId: string): Promise<void> {
    await manager.query(
      `
      MERGE dbo.fraud_graph_outbox AS target
      USING (VALUES (@0)) AS src (transaction_id)
        ON target.transaction_id = src.transaction_id
      WHEN MATCHED THEN
        UPDATE SET status = 'PENDING',
                   attempts = 0,
                   last_error = NULL,
                   available_at = SYSUTCDATETIME(),
                   updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (transaction_id) VALUES (src.transaction_id);
      `,
      [transactionId],
    );
  }

  /** Applied, so the debt is discharged and the row is no longer needed. */
  async markApplied(transactionId: string): Promise<void> {
    await this.outboxRepo.delete({ transactionId });
  }

  /*
   * Drain whatever is outstanding. Returns how many rows were applied, which
   * is what the worker logs and what tests assert on.
   */
  async drain(): Promise<{
    applied: number;
    deferred: number;
    failed: number;
  }> {
    await this.releaseAbandonedClaims();

    const rows = await this.claim();
    let applied = 0;
    let deferred = 0;
    let failed = 0;

    for (const row of rows) {
      const transaction = await this.transactionRepo.findOne({
        where: { id: row.transaction_id },
      });

      if (!transaction) {
        /*
         * The foreign key makes this all but impossible, and if it does
         * happen the write can never succeed, so retrying is pointless.
         */
        this.logger.warn(
          `Outbox row ${row.id} refers to transaction ${row.transaction_id}, which no longer exists; dropping it.`,
        );
        await this.outboxRepo.delete({ id: row.id });
        continue;
      }

      try {
        await this.graphProjection.project(transaction);
        await this.markApplied(row.transaction_id);
        applied += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (row.attempts >= MAX_ATTEMPTS) {
          await this.park(row, message);
          failed += 1;
          continue;
        }

        await this.deferWithBackoff(row, message);
        deferred += 1;
      }
    }

    if (applied > 0 || failed > 0) {
      this.logger.log(
        `Graph outbox: ${applied} applied, ${deferred} deferred, ${failed} parked.`,
      );
    }

    return { applied, deferred, failed };
  }

  /*
   * Claim a batch atomically.
   *
   * ROWLOCK keeps the lock off whole pages and READPAST steps over rows
   * another worker already holds, so several engine replicas drain the same
   * outbox without claiming the same rows or blocking each other. OUTPUT
   * returns what was claimed in the same statement, so there is no window
   * between selecting and claiming.
   */
  private async claim(): Promise<ClaimedRow[]> {
    return this.dataSource.query<ClaimedRow[]>(
      `
      UPDATE TOP (@0) dbo.fraud_graph_outbox WITH (ROWLOCK, READPAST)
      SET status = 'PROCESSING',
          attempts = attempts + 1,
          updated_at = SYSUTCDATETIME()
      OUTPUT inserted.id, inserted.transaction_id, inserted.attempts
      WHERE status = 'PENDING'
        AND available_at <= SYSUTCDATETIME();
      `,
      [BATCH_SIZE],
    );
  }

  /*
   * Return rows stuck in PROCESSING to the queue. A worker that dies between
   * claiming and applying leaves them there, and the filtered pending index
   * means nothing would ever look at them again.
   */
  private async releaseAbandonedClaims(): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE dbo.fraud_graph_outbox
      SET status = 'PENDING',
          available_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      WHERE status = 'PROCESSING'
        AND updated_at < DATEADD(millisecond, -@0, SYSUTCDATETIME());
      `,
      [CLAIM_TIMEOUT_MS],
    );
  }

  private async deferWithBackoff(
    row: ClaimedRow,
    message: string,
  ): Promise<void> {
    // 30s, 1m, 2m, 4m across the four deferrable attempts: long enough to
    // outlast a restart, short enough that a transient failure clears within
    // a drain cycle or two.
    const delayMs = 30_000 * 2 ** (row.attempts - 1);

    await this.outboxRepo.update(
      { id: row.id },
      {
        status: FraudGraphOutboxStatus.PENDING,
        lastError: message.slice(0, 2000),
        availableAt: new Date(Date.now() + delayMs),
        updatedAt: new Date(),
      },
    );
  }

  private async park(row: ClaimedRow, message: string): Promise<void> {
    this.logger.error(
      `Graph write for transaction ${row.transaction_id} failed ${row.attempts} times and will not be retried: ${message}`,
    );

    await this.outboxRepo.update(
      { id: row.id },
      {
        status: FraudGraphOutboxStatus.FAILED,
        lastError: message.slice(0, 2000),
        updatedAt: new Date(),
      },
    );
  }
}
