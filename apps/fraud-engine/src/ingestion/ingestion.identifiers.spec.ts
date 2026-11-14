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

  const fraudTransactionRepo = {
    create: jest.fn((row: unknown) => row),
    save: jest.fn((row: unknown) => Promise.resolve(row)),
  };

  const identifierCreate = jest.fn((row: unknown) => row);
  const fraudIdentifierRepo = {
    create: identifierCreate,
    save: jest.fn(() => identifierSaveResult()),
  };

  const ingestionStateRepo = {
    findOne: jest.fn(() => Promise.resolve(state)),
    create: jest.fn((row: unknown) => row),
    save: jest.fn((row: unknown) => Promise.resolve(row)),
  };

  const neo4jService = { run: jest.fn(() => Promise.resolve([])) };

  const fraudEvaluationService = {
    evaluateIdentifier: jest.fn(() => Promise.resolve({ alertCreated: true })),
  };

  const service = new IngestionService(
    sourceRepo as never,
    fraudTransactionRepo as never,
    fraudIdentifierRepo as never,
    ingestionStateRepo as never,
    neo4jService as never,
    fraudEvaluationService as never,
  );

  return {
    service,
    state,
    transaction,
    identifierCreate,
    neo4jService,
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
    expect(harness.neo4jService.run).toHaveBeenCalledTimes(1);
    expect(
      harness.fraudEvaluationService.evaluateIdentifier,
    ).toHaveBeenCalledTimes(1);

    expect(harness.state.lastSyncedTransactionId).toBe(harness.transaction.id);
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
      expect(harness.neo4jService.run).not.toHaveBeenCalled();
      expect(
        harness.fraudEvaluationService.evaluateIdentifier,
      ).not.toHaveBeenCalled();
    },
  );
});
