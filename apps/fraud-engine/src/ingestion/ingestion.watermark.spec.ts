import { Equal, FindOperator, MoreThan, MoreThanOrEqual } from 'typeorm';

import { SourceTransactionEntity } from '../database/entities/source-transaction.entity';
import { FraudIngestionStateEntity } from '../database/entities/fraud-ingestion-state.entity';
import { MetricsService } from '../observability/metrics.service';
import { IngestionService } from './ingestion.service';
import {
  INGESTION_BATCH_SIZE,
  TRANSACTIONS_INGESTION_SOURCE,
} from './ingestion.constants';

/*
 * The ingestion cursor.
 *
 * These tests exist because a timestamp is not a cursor. Resuming at
 * `createdAt > watermark` skips every row sharing the watermark's timestamp,
 * and upstream batch inserts make DATETIME2 ties ordinary at volume. The loss
 * is silent and permanent: nothing retries, and no log mentions it.
 *
 * The first test below is deliberately behavioural rather than a check on the
 * generated query. It pages a fake source table the way production does and
 * asserts that every row arrives exactly once. Against the previous
 * timestamp-only cursor it fails, reporting the rows that vanished.
 */

type FakeRow = Pick<SourceTransactionEntity, 'id' | 'createdAt'>;

function compareValues(left: unknown, right: unknown): number {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === 'string' && typeof right === 'string') {
    // A total order is all a keyset needs. SQL Server orders
    // uniqueidentifier by byte groups rather than lexically, which is fine:
    // the cursor only requires ORDER BY and the comparison to agree, and in
    // production both are evaluated by the same database.
    return left < right ? -1 : left > right ? 1 : 0;
  }

  throw new Error(`Unsupported comparison: ${typeof left} vs ${typeof right}`);
}

function matchesClause(row: FakeRow, clause: Record<string, unknown>): boolean {
  return Object.entries(clause).every(([field, condition]) => {
    const actual = (row as unknown as Record<string, unknown>)[field];

    if (condition instanceof FindOperator) {
      const expected = condition.value as unknown;

      switch (condition.type) {
        case 'moreThan':
          return compareValues(actual, expected) > 0;
        case 'moreThanOrEqual':
          return compareValues(actual, expected) >= 0;
        case 'equal':
          return compareValues(actual, expected) === 0;
        default:
          throw new Error(`Unsupported operator in cursor: ${condition.type}`);
      }
    }

    return compareValues(actual, condition) === 0;
  });
}

/*
 * A source repository that honours where, order and take the way the real one
 * does. Without this the test could only assert the shape of the query, which
 * would not have caught the bug: the old query was perfectly well-formed.
 */
function createFakeSourceRepo(rows: FakeRow[]) {
  return {
    find: jest.fn((options: Record<string, any>) => {
      const where = options.where as
        Record<string, unknown> | Record<string, unknown>[] | undefined;

      // An array of clauses is OR; a single clause (or none) matches directly.
      const clauses = Array.isArray(where) ? where : [where ?? {}];
      const matched = rows.filter((row) =>
        clauses.some((clause) => matchesClause(row, clause)),
      );

      const order = (options.order ?? {}) as Record<string, 'ASC' | 'DESC'>;
      const sorted = [...matched].sort((left, right) => {
        for (const [field, direction] of Object.entries(order)) {
          const result = compareValues(
            (left as unknown as Record<string, unknown>)[field],
            (right as unknown as Record<string, unknown>)[field],
          );
          if (result !== 0) {
            return direction === 'DESC' ? -result : result;
          }
        }
        return 0;
      });

      return Promise.resolve(sorted.slice(0, options.take as number));
    }),
  };
}

function createFakeStateRepo(initial?: Partial<FraudIngestionStateEntity>) {
  const state: FraudIngestionStateEntity = {
    id: 1,
    sourceName: TRANSACTIONS_INGESTION_SOURCE,
    lastSyncedAt: null,
    lastSyncedTransactionId: null,
    updatedAt: new Date(0),
    ...initial,
  };

  return {
    state,
    repo: {
      findOne: jest.fn(() => Promise.resolve(state)),
      create: jest.fn((row: Partial<FraudIngestionStateEntity>) => row),
      save: jest.fn((row: FraudIngestionStateEntity) => Promise.resolve(row)),
    },
  };
}

function createService(
  sourceRepo: unknown,
  stateRepo: unknown,
): { service: IngestionService; ingested: string[]; metrics: MetricsService } {
  const metrics = new MetricsService();
  const service = new IngestionService(
    sourceRepo as never,
    stateRepo as never,
    // ingestTransaction is stubbed below, so nothing downstream of the
    // cursor is exercised here.
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    metrics,
  );

  const ingested: string[] = [];

  // The cursor is what is under test; what happens to each row is not.
  jest
    .spyOn(
      service as unknown as {
        ingestTransaction: (tx: FakeRow) => Promise<{ alertCreated: boolean }>;
      },
      'ingestTransaction',
    )
    .mockImplementation((tx: FakeRow) => {
      ingested.push(tx.id);
      return Promise.resolve({ alertCreated: false });
    });

  return { service, ingested, metrics };
}

/*
 * Rows whose timestamps straddle a page boundary: the last row of the first
 * page shares its createdAt with the first two rows of the second.
 */
function buildRowsWithBoundaryTie(total: number): {
  rows: FakeRow[];
  tiedIds: string[];
} {
  const base = Date.UTC(2026, 10, 1, 0, 0, 0);
  const rows: FakeRow[] = [];

  for (let index = 0; index < total; index += 1) {
    rows.push({
      id: `tx-${String(index).padStart(4, '0')}`,
      createdAt: new Date(base + index * 1_000),
    });
  }

  const lastOfFirstPage = INGESTION_BATCH_SIZE - 1;
  const sharedTimestamp = rows[lastOfFirstPage].createdAt;

  rows[lastOfFirstPage + 1].createdAt = sharedTimestamp;
  rows[lastOfFirstPage + 2].createdAt = sharedTimestamp;

  return {
    rows,
    tiedIds: [rows[lastOfFirstPage + 1].id, rows[lastOfFirstPage + 2].id],
  };
}

describe('IngestionService cursor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ingests every row when timestamps tie across a page boundary', async () => {
    const total = INGESTION_BATCH_SIZE + 100;
    const { rows, tiedIds } = buildRowsWithBoundaryTie(total);

    const sourceRepo = createFakeSourceRepo(rows);
    const { repo: stateRepo } = createFakeStateRepo();
    const { service, ingested } = createService(sourceRepo, stateRepo);

    // Drain the table the way the scheduler does: run until it reports none
    // left. The cap only stops a broken cursor from looping forever.
    for (let run = 0; run < 10; run += 1) {
      const result = await service.runIngestion();
      if ('message' in result) {
        break;
      }
    }

    // Named explicitly: these are the rows the timestamp-only cursor dropped.
    expect(ingested).toEqual(expect.arrayContaining(tiedIds));

    expect(new Set(ingested).size).toBe(ingested.length);
    expect(ingested).toHaveLength(total);
    expect(ingested).toEqual(rows.map((row) => row.id));
  });

  it('distinguishes a halted run from a completed one', async () => {
    const base = Date.UTC(2026, 10, 1, 0, 0, 0);
    const rows: FakeRow[] = [
      { id: 'tx-a', createdAt: new Date(base) },
      { id: 'tx-b', createdAt: new Date(base + 1_000) },
    ];

    const sourceRepo = createFakeSourceRepo(rows);
    const { repo: stateRepo } = createFakeStateRepo();
    const { service, metrics } = createService(sourceRepo, stateRepo);

    jest
      .spyOn(
        service as unknown as {
          ingestTransaction: (
            tx: FakeRow,
          ) => Promise<{ alertCreated: boolean }>;
        },
        'ingestTransaction',
      )
      .mockImplementation((tx: FakeRow) =>
        tx.id === 'tx-b'
          ? Promise.reject(new Error('neo4j unavailable'))
          : Promise.resolve({ alertCreated: false }),
      );

    await service.runIngestion();

    /*
     * A run that stops partway is not throughput. Without the distinction a
     * steady stream of halted runs reads as a healthy pipeline while the
     * cursor sits parked behind one transaction.
     */
    const scrape = await metrics.metrics();
    expect(scrape).toContain(
      'scamurai_ingestion_runs_total{outcome="halted"} 1',
    );
    expect(scrape).not.toContain('outcome="completed"');
  });

  it('records a run that found nothing', async () => {
    const sourceRepo = createFakeSourceRepo([]);
    const { repo: stateRepo } = createFakeStateRepo();
    const { service, metrics } = createService(sourceRepo, stateRepo);

    await service.runIngestion();

    // Counting empty runs is how you notice polling stopped finding work
    // because the upstream feed stopped, not because fraud stopped.
    expect(await metrics.metrics()).toContain(
      'scamurai_ingestion_runs_total{outcome="empty"} 1',
    );
  });

  it('resumes after a known position, not after a point in time', async () => {
    const lastSyncedAt = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const sourceRepo = createFakeSourceRepo([]);
    const { repo: stateRepo } = createFakeStateRepo({
      lastSyncedAt,
      lastSyncedTransactionId: 'tx-0499',
    });
    const { service } = createService(sourceRepo, stateRepo);

    await service.runIngestion();

    expect(sourceRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { createdAt: MoreThan(lastSyncedAt) },
          {
            createdAt: Equal(lastSyncedAt),
            id: MoreThan('tx-0499'),
          },
        ],
        // The ordering has to agree with the cursor, including the tiebreaker.
        order: { createdAt: 'ASC', id: 'ASC' },
        take: INGESTION_BATCH_SIZE,
      }),
    );
  });

  it('re-reads the boundary timestamp when state predates the cursor', async () => {
    const lastSyncedAt = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const sourceRepo = createFakeSourceRepo([]);
    const { repo: stateRepo } = createFakeStateRepo({
      lastSyncedAt,
      lastSyncedTransactionId: null,
    });
    const { service } = createService(sourceRepo, stateRepo);

    await service.runIngestion();

    // Inclusive, so rows sharing the old watermark are re-read rather than
    // skipped. Ingestion upserts, so repeating them is absorbed.
    expect(sourceRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: MoreThanOrEqual(lastSyncedAt) },
      }),
    );
  });

  it('reads from the beginning when nothing has been synced', async () => {
    const sourceRepo = createFakeSourceRepo([]);
    const { repo: stateRepo } = createFakeStateRepo();
    const { service } = createService(sourceRepo, stateRepo);

    await service.runIngestion();

    expect(sourceRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('advances the cursor to the last row it actually ingested', async () => {
    const base = Date.UTC(2026, 10, 1, 0, 0, 0);
    const rows: FakeRow[] = [
      { id: 'tx-a', createdAt: new Date(base) },
      { id: 'tx-b', createdAt: new Date(base + 1_000) },
      { id: 'tx-c', createdAt: new Date(base + 2_000) },
    ];

    const sourceRepo = createFakeSourceRepo(rows);
    const { state, repo: stateRepo } = createFakeStateRepo();
    const { service, ingested } = createService(sourceRepo, stateRepo);

    // Fail on the third row: the cursor must stop at the second, so the
    // failed row is retried rather than stepped over.
    jest
      .spyOn(
        service as unknown as {
          ingestTransaction: (
            tx: FakeRow,
          ) => Promise<{ alertCreated: boolean }>;
        },
        'ingestTransaction',
      )
      .mockImplementation((tx: FakeRow) => {
        if (tx.id === 'tx-c') {
          return Promise.reject(new Error('neo4j unavailable'));
        }
        ingested.push(tx.id);
        return Promise.resolve({ alertCreated: false });
      });

    const result = await service.runIngestion();

    expect(ingested).toEqual(['tx-a', 'tx-b']);
    expect(state.lastSyncedTransactionId).toBe('tx-b');
    expect(state.lastSyncedAt).toEqual(new Date(base + 1_000));
    expect(result).toEqual(expect.objectContaining({ ingested: 2 }));
  });
});
