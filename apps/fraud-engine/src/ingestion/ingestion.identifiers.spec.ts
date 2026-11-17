import { QueryFailedError } from 'typeorm';

import { SourceTransactionEntity } from '../database/entities/source-transaction.entity';
import { FraudIngestionStateEntity } from '../database/entities/fraud-ingestion-state.entity';
import { IngestionService } from './ingestion.service';
import { TRANSACTIONS_INGESTION_SOURCE } from './ingestion.constants';

/*
 * Identifier insertion failures.
 *
 * Identifiers are inserted optimistically and a unique-index violation means
 * "already recorded", which is fine to ignore. Everything else means the row
 * was not written. The previous bare `catch` could not tell the difference,
 * so a deadlock or a dropped connection was logged as a skipped duplicate and
 * the transaction still counted as ingested -- with the cursor then advancing
 * past it, leaving its graph edges and velocity features permanently wrong.
 *
 * These tests pin the distinction: a duplicate is absorbed, anything else
 * halts the run with the cursor still behind the offending transaction.
 */

function sqlServerError(message: string, number: number): QueryFailedError {
  return new QueryFailedError(
    'INSERT INTO fraud_identifiers ...',
    [],
    Object.assign(new Error(message), { number }),
  );
}

function sourceTransaction(): SourceTransactionEntity {
  // Only customerEmail is set, so exactly one identifier is extracted and the
  // test turns on a single insert rather than on extraction order.
  return {
    id: 'cb0f6f6e-0000-4000-8000-000000000001',
    transactionDate: new Date(Date.UTC(2026, 10, 1, 9, 30, 0)),
    amountValue: 4200,
    currencyCode: 'KES',
    merchantName: 'Savanna Electronics',
    customerEmail: '  analyst@example.com  ',
    statusText: 'Completed',
    statusType: 'success',
    createdAt: new Date(Date.UTC(2026, 10, 1, 9, 30, 1)),
  };
}

function buildHarness(identifierSaveResult: () => Promise<unknown>) {
  const transaction = sourceTransaction();

  const state: FraudIngestionStateEntity = {
    id: 1,
    sourceName: TRANSACTIONS_INGESTION_SOURCE,
    lastSyncedAt: null,
    lastSyncedTransactionId: null,
    updatedAt: new Date(0),
  };

  const sourceRepo = {
    find: jest.fn(() => Promise.resolve([transaction])),
  };

  const ingestionStateRepo = {
    findOne: jest.fn(() => Promise.resolve(state)),
    create: jest.fn((row: unknown) => row),
    save: jest.fn((row: unknown) => Promise.resolve(row)),
  };

  const identifierCreate = jest.fn();

  /*
   * One EntityManager for the whole write, dispatching on the entity it is
   * given: that is what the service now relies on to commit the transaction
   * row, its identifiers and the outbox entry together.
   */
  const manager = {
    create: jest.fn(
      (entity: { name: string }, row: Record<string, unknown>) => {
        if (entity.name === 'FraudIdentifierEntity') {
          identifierCreate(row);
        }
        return row;
      },
    ),
    save: jest.fn((entity: { name: string }, row: unknown) =>
      entity.name === 'FraudIdentifierEntity'
        ? identifierSaveResult()
        : Promise.resolve(row),
    ),
    query: jest.fn(() => Promise.resolve([])),
  };

  const committed = jest.fn();
  const fraudDataSource = {
    transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) => {
      const result = await work(manager);
      // Only reached when the callback resolved, which is what "committed"
      // means here.
      committed();
      return result;
    }),
  };

  const graphOutbox = {
    enqueue: jest.fn(() => Promise.resolve()),
    markApplied: jest.fn(() => Promise.resolve()),
  };

  const graphProjection = {
    project: jest.fn(() => Promise.resolve()),
  };

  const fraudEvaluationService = {
    evaluateIdentifier: jest.fn(() => Promise.resolve({ alertCreated: true })),
  };

  const service = new IngestionService(
    sourceRepo as never,
    ingestionStateRepo as never,
    fraudDataSource as never,
    graphOutbox as never,
    graphProjection as never,
    fraudEvaluationService as never,
  );

  return {
    service,
    state,
    transaction,
    identifierCreate,
    committed,
    graphOutbox,
    graphProjection,
    fraudEvaluationService,
    ingestionStateRepo,
  };
}

describe('IngestionService identifier insertion', () => {
  it('absorbs a duplicate identifier and finishes the transaction', async () => {
    const harness = buildHarness(() =>
      Promise.reject(sqlServerError('Cannot insert duplicate key row', 2601)),
    );

    const result = await harness.service.runIngestion();

    expect(result).toEqual(
      expect.objectContaining({ ingested: 1, alertsCreated: 1 }),
    );

    // The rest of the pipeline still ran for this transaction.
    expect(harness.graphProjection.project).toHaveBeenCalledTimes(1);
    expect(
      harness.fraudEvaluationService.evaluateIdentifier,
    ).toHaveBeenCalledTimes(1);

    expect(harness.state.lastSyncedTransactionId).toBe(harness.transaction.id);
  });

  it('commits the transaction, its identifiers and the outbox entry together', async () => {
    const harness = buildHarness(() => Promise.resolve({}));

    await harness.service.runIngestion();

    // The outbox entry is written through the same manager as the rows, which
    // is what makes "transaction visible" and "graph write owed" one event.
    expect(harness.graphOutbox.enqueue).toHaveBeenCalledTimes(1);
    expect(harness.committed).toHaveBeenCalledTimes(1);
  });

  it('commits nothing when an identifier insert fails', async () => {
    const harness = buildHarness(() =>
      Promise.reject(sqlServerError('deadlock victim', 1205)),
    );

    await harness.service.runIngestion();

    // The callback rejected, so the transaction rolled back: no half-ingested
    // row is left visible to the feature engine.
    expect(harness.committed).not.toHaveBeenCalled();
    expect(harness.graphProjection.project).not.toHaveBeenCalled();
  });

  it('discharges the outbox entry once the graph write lands', async () => {
    const harness = buildHarness(() => Promise.resolve({}));

    await harness.service.runIngestion();

    expect(harness.graphProjection.project).toHaveBeenCalledTimes(1);
    expect(harness.graphOutbox.markApplied).toHaveBeenCalledWith(
      harness.transaction.id,
    );
  });

  it('leaves the outbox entry when the graph write fails', async () => {
    const harness = buildHarness(() => Promise.resolve({}));
    harness.graphProjection.project.mockRejectedValue(
      new Error('neo4j unavailable'),
    );

    const result = await harness.service.runIngestion();

    // The run stops and the cursor stays put, so either the retry or the
    // drain applies it. Crucially the entry is not discharged.
    expect(result).toEqual(expect.objectContaining({ ingested: 0 }));
    expect(harness.graphOutbox.markApplied).not.toHaveBeenCalled();
    expect(harness.state.lastSyncedTransactionId).toBeNull();
  });

  it('stores the identifier value trimmed', async () => {
    const harness = buildHarness(() => Promise.resolve({}));

    await harness.service.runIngestion();

    expect(harness.identifierCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        identifierType: 'email',
        identifierValue: 'analyst@example.com',
      }),
    );
  });

  /*
   * The regression. Each of these means the identifier was not written, so
   * the transaction is incomplete and must not be marked as ingested.
   */
  it.each([
    ['a deadlock', () => sqlServerError('deadlock victim', 1205)],
    ['a query timeout', () => sqlServerError('timeout expired', -2)],
    [
      'a dropped connection',
      () => new Error('Connection lost - read ECONNRESET'),
    ],
  ])(
    'halts the run on %s rather than calling it a duplicate',
    async (_label, makeError) => {
      const harness = buildHarness(() => Promise.reject(makeError()));

      const result = await harness.service.runIngestion();

      // Nothing was ingested, so the cursor stays behind this transaction and
      // the next run retries it.
      expect(result).toEqual(expect.objectContaining({ ingested: 0 }));
      expect(harness.state.lastSyncedAt).toBeNull();
      expect(harness.state.lastSyncedTransactionId).toBeNull();
      expect(harness.ingestionStateRepo.save).not.toHaveBeenCalled();

      // And the transaction was not scored on incomplete identifier data.
      expect(harness.graphProjection.project).not.toHaveBeenCalled();
      expect(
        harness.fraudEvaluationService.evaluateIdentifier,
      ).not.toHaveBeenCalled();
    },
  );
});
