import { OUTBOX_STALE_AFTER_MS, classifyOutboxCounts } from './outbox-status';

/*
 * Health decision logic.
 *
 * These import the extracted logic rather than the Nest indicators, because
 * @nestjs/terminus 12 is ESM-only and a CommonJS test suite cannot load it.
 * That is what the extraction is for: the thresholds and the parsing -- the
 * parts that can be wrong -- are tested, while the indicators stay thin
 * adapters that translate an outcome into a terminus call.
 *
 * What matters here is not that a reachable store reports up, which is hard
 * to get wrong, but which conditions count as a problem. A backlog is normal;
 * a backlog that is not moving is not.
 */

describe('classifyOutboxCounts', () => {
  it('is up when the outbox is empty', () => {
    expect(classifyOutboxCounts({ pending: 0, stale: 0, failed: 0 })).toEqual({
      status: 'up',
      data: { pending: 0 },
    });
  });

  it('is up while a backlog is still draining', () => {
    // Pending work on its own is normal: a burst of ingestion is always
    // briefly ahead of a drain that runs every thirty seconds.
    const outcome = classifyOutboxCounts({ pending: 40, stale: 0, failed: 0 });

    expect(outcome.status).toBe('up');
    expect(outcome.data).toEqual({ pending: 40 });
  });

  it('is degraded when pending work has stopped moving', () => {
    const outcome = classifyOutboxCounts({ pending: 40, stale: 12, failed: 0 });

    expect(outcome.status).toBe('degraded');
    expect(outcome.data).toMatchObject({
      pending: 40,
      stale: 12,
      message: expect.stringContaining('not draining'),
    });
  });

  it('is degraded when writes have been given up on', () => {
    const outcome = classifyOutboxCounts({ pending: 0, stale: 0, failed: 3 });

    // Parked rows need somebody to decide whether to replay them, and no
    // connectivity check would ever surface that.
    expect(outcome.status).toBe('degraded');
    expect(outcome.data).toMatchObject({
      failed: 3,
      message: expect.stringContaining('exhausted their retries'),
    });
  });

  it('reports parked writes ahead of a stalled backlog', () => {
    // Both are wrong, but one needs a person and the other may yet recover.
    const outcome = classifyOutboxCounts({ pending: 9, stale: 9, failed: 2 });

    expect(outcome.data).toMatchObject({ failed: 2 });
    expect(outcome.data).not.toHaveProperty('stale');
  });

  it('allows more slack than the drain interval', () => {
    // The threshold has to sit well clear of the thirty-second drain, or a
    // normal burst would read as a stall.
    expect(OUTBOX_STALE_AFTER_MS).toBeGreaterThan(60_000);
  });
});
