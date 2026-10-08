import { TRANSACTIONS_INGESTION_SOURCE } from '../ingestion.constants';
import {
  buildIngestionPollJobId,
  buildIngestionPollPayload,
  mapConfigurationToPollEnqueueOptions,
} from './ingestion-poll-job.helpers';

describe('ingestion poll job helpers', () => {
  const configuration = {
    sourceName: TRANSACTIONS_INGESTION_SOURCE,
    isEnabled: true,
    intervalMinutes: 10,
    batchSize: 500,
    maxConcurrency: 1,
    jobTimeoutSeconds: 600,
    retryAttempts: 3,
    retryBackoffSeconds: 30,
    updatedAt: new Date('2026-08-03T12:00:00.000Z'),
  };

  it('builds deterministic poll job ids', () => {
    expect(buildIngestionPollJobId(TRANSACTIONS_INGESTION_SOURCE)).toBe(
      'ingestion:poll:TransactionsDb.Transactions',
    );
  });

  it('builds strongly typed poll payloads', () => {
    const requestedAt = new Date('2026-08-03T12:00:00.000Z');

    expect(
      buildIngestionPollPayload(
        TRANSACTIONS_INGESTION_SOURCE,
        'scheduler',
        requestedAt,
      ),
    ).toEqual({
      sourceName: TRANSACTIONS_INGESTION_SOURCE,
      requestedAt: '2026-08-03T12:00:00.000Z',
      requestedBy: 'scheduler',
    });
  });

  it('maps configuration retry and timeout values into enqueue options', () => {
    expect(mapConfigurationToPollEnqueueOptions(configuration)).toEqual({
      jobId: 'ingestion:poll:TransactionsDb.Transactions',
      attempts: 3,
      backoff: {
        strategy: 'FIXED',
        delayMilliseconds: 30000,
      },
      timeoutMilliseconds: 600000,
    });
  });
});
