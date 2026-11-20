import { Logger } from '@nestjs/common';

import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';
import { GraphOutboxService } from './graph-outbox.service';

/*
 * The outbox drain.
 *
 * This is what makes the dual write recoverable rather than merely ordered.
 * Ingestion commits the FraudDb rows and the outbox entry together, then
 * projects into the graph itself; the drain exists for the cases ingestion
 * cannot cover -- the process dying between the commit and the graph write,
 * or Neo4j being down when the transaction arrived.
 *
 * The behaviour worth pinning is what happens when the graph write keeps
 * failing: it must back off, and it must eventually stop rather than retry a
 * genuinely broken row forever.
 */

type ClaimedRow = { id: string; transaction_id: string; attempts: number };

function transaction(id: string): FraudTransactionEntity {
  return { id, merchantName: 'Savanna Electronics' } as FraudTransactionEntity;
}

function buildService(options: {
  claimed: ClaimedRow[];
  project?: jest.Mock;
  findTransaction?: jest.Mock;
}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];

  const dataSource = {
    query: jest.fn((sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      // The claim is the only query that returns rows.
      if (sql.includes('OUTPUT inserted.id')) {
        return Promise.resolve(options.claimed);
      }
      return Promise.resolve([]);
    }),
  };

  const outboxRepo = {
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
  };

  const transactionRepo = {
    findOne:
      options.findTransaction ??
      jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(transaction(where.id)),
      ),
  };

  const graphProjection = {
    project: options.project ?? jest.fn(() => Promise.resolve()),
  };

  const service = new GraphOutboxService(
    dataSource as never,
    outboxRepo as never,
    transactionRepo as never,
    graphProjection as never,
  );

  return {
    service,
    dataSource,
    outboxRepo,
    transactionRepo,
    graphProjection,
    queries,
  };
}

describe('GraphOutboxService.drain', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when the outbox is empty', async () => {
    const harness = buildService({ claimed: [] });

    const result = await harness.service.drain();

    expect(result).toEqual({ applied: 0, deferred: 0, failed: 0 });
    expect(harness.graphProjection.project).not.toHaveBeenCalled();
  });

  it('projects a claimed row and then deletes it', async () => {
    const harness = buildService({
      claimed: [{ id: '1', transaction_id: 'tx-1', attempts: 1 }],
    });

    const result = await harness.service.drain();

    expect(result.applied).toBe(1);
    expect(harness.graphProjection.project).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tx-1' }),
    );
    // Applied rows are removed: the outbox is a queue, not an audit log.
    expect(harness.outboxRepo.delete).toHaveBeenCalledWith({
      transactionId: 'tx-1',
    });
  });

  it('claims with READPAST so replicas do not collide', async () => {
    const harness = buildService({ claimed: [] });

    await harness.service.drain();

    const claim = harness.queries.find((query) =>
      query.sql.includes('OUTPUT inserted.id'),
    );

    expect(claim?.sql).toContain('READPAST');
    expect(claim?.sql).toContain('ROWLOCK');
    // Claiming and reading back in one statement leaves no window between
    // selecting a row and owning it.
    expect(claim?.sql).toContain('UPDATE TOP');
  });

  it('returns rows abandoned mid-apply to the queue before claiming', async () => {
    const harness = buildService({ claimed: [] });

    await harness.service.drain();

    // A worker killed after claiming leaves PROCESSING behind, and the
    // filtered pending index means nothing would ever look at it again.
    const release = harness.queries.find((query) =>
      query.sql.includes("status = 'PROCESSING'"),
    );

    expect(release).toBeDefined();
    expect(release?.sql).toContain("SET status = 'PENDING'");
  });

  it('defers with growing backoff when the graph write fails', async () => {
    const harness = buildService({
      claimed: [{ id: '1', transaction_id: 'tx-1', attempts: 2 }],
      project: jest.fn(() => Promise.reject(new Error('neo4j unavailable'))),
    });

    const before = Date.now();
    const result = await harness.service.drain();

    expect(result).toEqual({ applied: 0, deferred: 1, failed: 0 });

    const [, update] = harness.outboxRepo.update.mock.calls[0] as [
      unknown,
      { status: string; availableAt: Date; lastError: string },
    ];

    expect(update.status).toBe('PENDING');
    expect(update.lastError).toContain('neo4j unavailable');
    // Second attempt: 30s * 2^1 = 60s.
    expect(update.availableAt.getTime() - before).toBeGreaterThanOrEqual(
      59_000,
    );
  });

  it('parks a row that has exhausted its attempts', async () => {
    const harness = buildService({
      claimed: [{ id: '1', transaction_id: 'tx-1', attempts: 5 }],
      project: jest.fn(() => Promise.reject(new Error('still failing'))),
    });

    const result = await harness.service.drain();

    expect(result).toEqual({ applied: 0, deferred: 0, failed: 1 });

    const [, update] = harness.outboxRepo.update.mock.calls[0] as [
      unknown,
      { status: string },
    ];

    // Kept rather than deleted, so somebody can find it.
    expect(update.status).toBe('FAILED');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('tx-1'));
  });

  it('drops a row whose transaction no longer exists', async () => {
    const harness = buildService({
      claimed: [{ id: '7', transaction_id: 'tx-gone', attempts: 1 }],
      findTransaction: jest.fn(() => Promise.resolve(null)),
    });

    const result = await harness.service.drain();

    // The write can never succeed, so retrying it forever is pointless.
    expect(result.applied).toBe(0);
    expect(harness.outboxRepo.delete).toHaveBeenCalledWith({ id: '7' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('tx-gone'));
  });

  it('keeps going after one row fails', async () => {
    const project = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined);

    const harness = buildService({
      claimed: [
        { id: '1', transaction_id: 'tx-1', attempts: 1 },
        { id: '2', transaction_id: 'tx-2', attempts: 1 },
      ],
      project,
    });

    const result = await harness.service.drain();

    expect(result).toEqual({ applied: 1, deferred: 1, failed: 0 });
  });
});

describe('GraphOutboxService.enqueue', () => {
  it("writes through the caller's manager, not its own connection", async () => {
    const harness = buildService({ claimed: [] });
    const manager = { query: jest.fn(() => Promise.resolve([])) };

    await harness.service.enqueue(manager as never, 'tx-1');

    // Using its own DataSource here would put the entry outside the
    // transaction, which is the entire thing this is meant to prevent.
    expect(manager.query).toHaveBeenCalled();
    expect(harness.dataSource.query).not.toHaveBeenCalled();

    const [sql, params] = manager.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('MERGE dbo.fraud_graph_outbox');
    expect(params).toEqual(['tx-1']);
  });

  it('resets a previously failed entry rather than inserting a second', async () => {
    const harness = buildService({ claimed: [] });
    const manager = { query: jest.fn(() => Promise.resolve([])) };

    await harness.service.enqueue(manager as never, 'tx-1');

    const [sql] = manager.query.mock.calls[0] as [string];
    // Ingestion upserts, so a re-read transaction must not queue twice.
    expect(sql).toContain('WHEN MATCHED THEN');
    expect(sql).toContain("status = 'PENDING'");
    expect(sql).toContain('attempts = 0');
  });
});
