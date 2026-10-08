import {
  mapBullMqJobToJobQueueJob,
  mapBullMqStateToJobQueueStatus,
  mapEnqueueOptionsToBullMq,
  mapScheduleToRepeatOptions,
} from './bullmq-job.mapper';
import { JobQueueStatus } from '../job-queue.types';

describe('bullmq-job.mapper', () => {
  it('maps enqueue options to BullMQ jobs options', () => {
    expect(
      mapEnqueueOptionsToBullMq({
        jobId: 'job-1',
        delayMilliseconds: 5000,
        attempts: 3,
        backoff: {
          strategy: 'EXPONENTIAL',
          delayMilliseconds: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 5,
      }),
    ).toEqual({
      jobId: 'job-1',
      delay: 5000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: 5,
    });
  });

  it('maps interval schedules to BullMQ repeat options', () => {
    expect(
      mapScheduleToRepeatOptions({
        type: 'INTERVAL',
        everyMilliseconds: 600000,
      }),
    ).toEqual({
      every: 600000,
    });
  });

  it('maps cron schedules to BullMQ repeat options', () => {
    expect(
      mapScheduleToRepeatOptions({
        type: 'CRON',
        pattern: '*/10 * * * *',
        timezone: 'UTC',
      }),
    ).toEqual({
      pattern: '*/10 * * * *',
      tz: 'UTC',
    });
  });

  it('maps BullMQ states to domain statuses', () => {
    expect(mapBullMqStateToJobQueueStatus('waiting')).toBe(
      JobQueueStatus.WAITING,
    );
    expect(mapBullMqStateToJobQueueStatus('delayed')).toBe(
      JobQueueStatus.DELAYED,
    );
    expect(mapBullMqStateToJobQueueStatus('active')).toBe(JobQueueStatus.ACTIVE);
    expect(mapBullMqStateToJobQueueStatus('completed')).toBe(
      JobQueueStatus.COMPLETED,
    );
    expect(mapBullMqStateToJobQueueStatus('failed')).toBe(JobQueueStatus.FAILED);
    expect(mapBullMqStateToJobQueueStatus('unknown-state')).toBe(
      JobQueueStatus.UNKNOWN,
    );
  });

  it('maps BullMQ jobs to JobQueueJob without exposing native objects', async () => {
    const bullJob = {
      id: 'job-1',
      name: 'ingestion:poll',
      data: { sourceName: 'TransactionsDb.Transactions' },
      attemptsMade: 1,
      timestamp: Date.parse('2026-08-03T12:00:00.000Z'),
      processedOn: Date.parse('2026-08-03T12:00:01.000Z'),
      finishedOn: undefined,
      returnvalue: undefined,
      failedReason: '',
      getState: jest.fn().mockResolvedValue('active'),
    };

    const mapped = await mapBullMqJobToJobQueueJob(
      bullJob as never,
      'fraud-ingestion',
    );

    expect(mapped).toEqual({
      id: 'job-1',
      queueName: 'fraud-ingestion',
      name: 'ingestion:poll',
      payload: { sourceName: 'TransactionsDb.Transactions' },
      status: JobQueueStatus.ACTIVE,
      attemptsMade: 1,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
      startedAt: new Date('2026-08-03T12:00:01.000Z'),
      completedAt: undefined,
      failedAt: undefined,
      result: undefined,
      failureReason: undefined,
    });
  });
});
