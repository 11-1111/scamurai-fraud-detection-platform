import { MetricsService } from '../observability/metrics.service';
import { IngestionService } from './ingestion.service';

/*
 * The two entry points, and the lock they both go through.
 *
 * The scheduled path is already deduplicated by the orchestrator's
 * deterministic job id. The manual endpoint bypasses the queue entirely, so
 * without a lock two requests -- or a request and the scheduler -- could run
 * the same batch at once, both ingest it, and both write the watermark, with
 * the slower one able to move it backwards.
 */

type LockOutcome<T> = { acquired: true; result: T } | { acquired: false };

function lockThat(granted: boolean) {
  return {
    runExclusively: jest.fn(
      async <T>(
        _source: string,
        work: () => Promise<T>,
      ): Promise<LockOutcome<T>> =>
        granted
          ? { acquired: true, result: await work() }
          : { acquired: false },
    ),
  };
}

function buildService(lock: ReturnType<typeof lockThat>) {
  const service = new IngestionService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    new MetricsService(),
    lock as never,
  );

  const runIngestion = jest.fn().mockResolvedValue({
    ingested: 0,
    message: 'No new transactions found',
  });
  jest.spyOn(service, 'runIngestion').mockImplementation(runIngestion);

  return { service, runIngestion };
}

describe('IngestionService entry points', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['runManualSync', (s: IngestionService) => s.runManualSync()],
    ['runScheduledSync', (s: IngestionService) => s.runScheduledSync()],
  ])('%s() runs the ingestion when it holds the lock', async (_name, call) => {
    const lock = lockThat(true);
    const { service, runIngestion } = buildService(lock);

    const result = await call(service);

    expect(runIngestion).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ingested: 0,
      message: 'No new transactions found',
    });
  });

  it.each([
    ['runManualSync', (s: IngestionService) => s.runManualSync()],
    ['runScheduledSync', (s: IngestionService) => s.runScheduledSync()],
  ])('%s() takes the lock before doing anything', async (_name, call) => {
    const lock = lockThat(true);
    const { service } = buildService(lock);

    await call(service);

    // Both paths, not just the manual one: they can collide with each other
    // as easily as with themselves.
    expect(lock.runExclusively).toHaveBeenCalledTimes(1);
  });

  it('does not run a second time while a run is in progress', async () => {
    const lock = lockThat(false);
    const { service, runIngestion } = buildService(lock);

    const result = await service.runManualSync();

    expect(runIngestion).not.toHaveBeenCalled();
    expect(result).toEqual({
      ingested: 0,
      message: 'An ingestion run is already in progress',
      skipped: true,
    });
  });

  it('distinguishes a skipped run from one that found nothing', async () => {
    /*
     * Both report zero ingested and mean entirely different things: one did
     * not happen, the other happened and there was no work. Collapsing them
     * would make a stuck lock look like an idle pipeline.
     */
    const skipped = await buildService(lockThat(false)).service.runManualSync();
    const empty = await buildService(lockThat(true)).service.runManualSync();

    expect(skipped).toHaveProperty('skipped', true);
    expect(empty).not.toHaveProperty('skipped');
  });

  it('does not throw when it cannot take the lock', async () => {
    // Another run doing the work is not an error, and the scheduled path
    // must not log a failure every minute because a long run is in flight.
    const { service } = buildService(lockThat(false));

    await expect(service.runScheduledSync()).resolves.toBeDefined();
  });
});
