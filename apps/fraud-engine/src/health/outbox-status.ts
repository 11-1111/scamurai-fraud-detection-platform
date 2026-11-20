/*
 * Turning graph-outbox counts into a health status.
 *
 * Separate from the health indicator for the same reason as the Redis INFO
 * parsing: @nestjs/terminus 12 is ESM-only and cannot be loaded by a
 * CommonJS test suite, so the thresholds live where they can be tested.
 */

/*
 * How long a pending graph write may sit before it stops being normal. The
 * drain runs every thirty seconds, so anything older than a few minutes means
 * it is failing rather than merely behind.
 */
export const OUTBOX_STALE_AFTER_MS = 5 * 60 * 1000;

export type OutboxCounts = {
  pending: number;
  /** Pending rows older than OUTBOX_STALE_AFTER_MS. */
  stale: number;
  /** Rows that exhausted their retries and were parked. */
  failed: number;
};

export type OutboxStatus = {
  status: 'up' | 'degraded';
  data: Record<string, unknown>;
};

/*
 * A healthy outbox is almost always empty, but a backlog on its own is not a
 * problem -- the drain runs every thirty seconds and a burst of ingestion
 * will always be briefly ahead of it. What matters is work that is not
 * moving: rows older than the drain interval by minutes, or rows given up on.
 *
 * This is the only health signal here about correctness rather than
 * reachability. Every store can answer a ping while FraudDb and the graph
 * steadily drift apart.
 */
export function classifyOutboxCounts(counts: OutboxCounts): OutboxStatus {
  if (counts.failed > 0) {
    return {
      status: 'degraded',
      data: {
        pending: counts.pending,
        failed: counts.failed,
        message: 'graph writes have exhausted their retries and need attention',
      },
    };
  }

  if (counts.stale > 0) {
    return {
      status: 'degraded',
      data: {
        pending: counts.pending,
        stale: counts.stale,
        message: 'graph writes are not draining',
      },
    };
  }

  return { status: 'up', data: { pending: counts.pending } };
}
