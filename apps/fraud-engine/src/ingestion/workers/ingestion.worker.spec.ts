import { BadRequestException, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { IngestionService } from '../ingestion.service';
import {
  INGESTION_POLL_JOB,
  INGESTION_PROCESS_TRANSACTION_JOB,
  INGESTION_QUEUE_NAME,
} from '../queue/ingestion-job.constants';
import { TRANSACTIONS_INGESTION_SOURCE } from '../ingestion.constants';
import type { JobQueueProcessor } from '../queue/job-queue-worker.interface';
import { IngestionWorker } from './ingestion.worker';

describe('IngestionWorker', () => {
  let worker: IngestionWorker;
  let ingestionService: { runScheduledSync: jest.Mock };
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const pollResult = {
    ingested: 0,
    message: 'No new transactions found',
  };

  const pollPayload = {
    sourceName: TRANSACTIONS_INGESTION_SOURCE,
    requestedAt: '2026-08-03T12:00:00.000Z',
    requestedBy: 'scheduler' as const,
  };

  beforeEach(() => {
    ingestionService = {
      runScheduledSync: jest.fn().mockResolvedValue(pollResult),
    };

    worker = new IngestionWorker(
      ingestionService as unknown as IngestionService,
    );

    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('implements JobQueueProcessor', () => {
    const processor: JobQueueProcessor = worker;

    expect(typeof processor.process).toBe('function');
  });

  it('handles INGESTION_POLL_JOB by calling runScheduledSync()', async () => {
    const job = createJob(INGESTION_POLL_JOB);

    const result = await worker.process(job);

    expect(ingestionService.runScheduledSync).toHaveBeenCalledTimes(1);
    expect(result).toEqual(pollResult);
  });

  it('throws BadRequestException for unknown jobs', async () => {
    const job = createJob(INGESTION_PROCESS_TRANSACTION_JOB);

    await expect(worker.process(job)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(ingestionService.runScheduledSync).not.toHaveBeenCalled();
  });

  it('logs success with jobId, queue, execution time, attempt, and success flag', async () => {
    const job = createJob(INGESTION_POLL_JOB, { attemptsMade: 1 });

    await worker.process(job);

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        queue: INGESTION_QUEUE_NAME,
        executionTimeMs: expect.any(Number),
        attempt: 2,
        success: true,
      }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs failure and propagates errors for BullMQ retry', async () => {
    const failure = new Error('ingestion failure');
    ingestionService.runScheduledSync.mockRejectedValue(failure);
    const job = createJob(INGESTION_POLL_JOB);

    await expect(worker.process(job)).rejects.toThrow('ingestion failure');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        queue: INGESTION_QUEUE_NAME,
        executionTimeMs: expect.any(Number),
        attempt: 1,
        success: false,
        error: 'ingestion failure',
      }),
    );
  });

  it('routes jobs via JobExecutionContext without BullMQ mapping', async () => {
    await worker.process({
      jobId: 'ctx-1',
      queueName: INGESTION_QUEUE_NAME,
      jobName: INGESTION_POLL_JOB,
      payload: pollPayload,
      attemptsMade: 0,
    });

    expect(ingestionService.runScheduledSync).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

function createJob(name: string, overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    name,
    data: {
      sourceName: TRANSACTIONS_INGESTION_SOURCE,
      requestedAt: '2026-08-03T12:00:00.000Z',
      requestedBy: 'scheduler',
    },
    attemptsMade: 0,
    queueName: INGESTION_QUEUE_NAME,
    ...overrides,
  } as Job;
}
