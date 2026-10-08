import * as fs from 'fs';
import * as path from 'path';
import type { JobQueue } from './job-queue.interface';
import type { JobQueueJob } from './job-queue-job';
import type { JobQueueProcessor } from './job-queue-worker.interface';
import {
  INGESTION_POLL_JOB,
  INGESTION_PROCESS_TRANSACTION_JOB,
  INGESTION_QUEUE_NAME,
  INGESTION_SCHEDULER_ID,
} from './ingestion-job.constants';
import { JOB_QUEUE } from './job-queue.token';
import { JobQueueStatus } from './job-queue.types';

interface IngestionPollPayload extends Record<string, unknown> {
  sourceName: string;
}

interface IngestionProcessTransactionPayload extends Record<string, unknown> {
  transactionId: string;
}

describe('Job queue contracts', () => {
  it('accepts typed payloads extending Record<string, unknown>', async () => {
    const pollPayload: IngestionPollPayload = {
      sourceName: 'TransactionsDb.Transactions',
    };
    const transactionPayload: IngestionProcessTransactionPayload = {
      transactionId: '11111111-1111-1111-1111-111111111111',
    };

    const queue: JobQueue = {
      enqueue: jest.fn(async (_queueName, _jobName, payload) => ({
        id: 'job-1',
        queueName: INGESTION_QUEUE_NAME,
        name: INGESTION_POLL_JOB,
        payload,
        status: JobQueueStatus.WAITING,
        attemptsMade: 0,
        createdAt: new Date(),
      })),
      schedule: jest.fn(async () => undefined),
      removeSchedule: jest.fn(async () => true),
      getJob: jest.fn(async () => null),
      cancelJob: jest.fn(async () => true),
    };

    await queue.enqueue(
      INGESTION_QUEUE_NAME,
      INGESTION_POLL_JOB,
      pollPayload,
    );
    await queue.enqueue(
      INGESTION_QUEUE_NAME,
      INGESTION_PROCESS_TRANSACTION_JOB,
      transactionPayload,
    );

    expect(queue.enqueue).toHaveBeenCalledTimes(2);
  });

  it('uses JobQueueStatus on returned jobs', async () => {
    const job: JobQueueJob<IngestionPollPayload> = {
      id: 'job-1',
      queueName: INGESTION_QUEUE_NAME,
      name: INGESTION_POLL_JOB,
      payload: { sourceName: 'TransactionsDb.Transactions' },
      status: JobQueueStatus.ACTIVE,
      attemptsMade: 1,
      createdAt: new Date(),
    };

    expect(Object.values(JobQueueStatus)).toContain(job.status);
  });

  it('defines processor contracts without infrastructure types', () => {
    const processor: JobQueueProcessor<IngestionProcessTransactionPayload, void> =
      {
        process: async (context) => {
          expect(context.payload.transactionId).toBeDefined();
        },
      };

    expect(typeof processor.process).toBe('function');
  });

  it('exports ingestion job constants', () => {
    expect(INGESTION_QUEUE_NAME).toBe('fraud-ingestion');
    expect(INGESTION_POLL_JOB).toBe('ingestion:poll');
    expect(INGESTION_PROCESS_TRANSACTION_JOB).toBe(
      'ingestion:process-transaction',
    );
    expect(INGESTION_SCHEDULER_ID).toBe('transactions-ingestion-scheduler');
  });

  it('exports a JOB_QUEUE injection token', () => {
    expect(typeof JOB_QUEUE).toBe('symbol');
    expect(JOB_QUEUE.toString()).toContain('JOB_QUEUE');
  });

  it('contains no infrastructure imports in queue abstraction files', () => {
    const queueDirectory = path.join(__dirname);
    const forbiddenPatterns = [
      /@nestjs\/bullmq/,
      /from 'bullmq'/,
      /from "bullmq"/,
      /from 'ioredis'/,
      /from "ioredis"/,
      /from 'redis'/,
      /from "redis"/,
      /@nestjs\/schedule/,
      /typeorm/,
      /database\/entities/,
    ];

    for (const fileName of fs.readdirSync(queueDirectory)) {
      if (!fileName.endsWith('.ts') || fileName.endsWith('.spec.ts')) {
        continue;
      }

      const contents = fs.readFileSync(path.join(queueDirectory, fileName), 'utf8');

      for (const pattern of forbiddenPatterns) {
        expect(contents).not.toMatch(pattern);
      }
    }
  });
});
