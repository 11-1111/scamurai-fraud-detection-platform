import { JobQueueStatus } from '../job-queue.types';
import { BullMqJobQueue } from './bullmq-job-queue.service';

const mockQueueInstance = {
  add: jest.fn(),
  upsertJobScheduler: jest.fn(),
  removeJobScheduler: jest.fn(),
  getJob: jest.fn(),
  close: jest.fn(),
};

const mockQueueEventsInstance = {
  close: jest.fn(),
};

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueueInstance),
  QueueEvents: jest.fn(() => mockQueueEventsInstance),
}));

describe('BullMqJobQueue', () => {
  let jobQueue: BullMqJobQueue;
  const connection = {
    host: 'localhost',
    port: 6379,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jobQueue = new BullMqJobQueue(connection);
  });

  it('enqueue() adds a job and returns a mapped domain job', async () => {
    mockQueueInstance.add.mockResolvedValue({
      id: 'job-1',
      name: 'ingestion:poll',
      data: { sourceName: 'TransactionsDb.Transactions' },
      attemptsMade: 0,
      timestamp: Date.parse('2026-08-03T12:00:00.000Z'),
      processedOn: undefined,
      finishedOn: undefined,
      returnvalue: undefined,
      failedReason: '',
      getState: jest.fn().mockResolvedValue('waiting'),
    });

    const result = await jobQueue.enqueue(
      'fraud-ingestion',
      'ingestion:poll',
      { sourceName: 'TransactionsDb.Transactions' },
      {
        jobId: 'job-1',
        attempts: 3,
      },
    );

    expect(mockQueueInstance.add).toHaveBeenCalledWith(
      'ingestion:poll',
      { sourceName: 'TransactionsDb.Transactions' },
      {
        jobId: 'job-1',
        attempts: 3,
      },
    );
    expect(result.status).toBe(JobQueueStatus.WAITING);
    expect(result.payload).toEqual({
      sourceName: 'TransactionsDb.Transactions',
    });
  });

  it('schedule() upserts a BullMQ job scheduler', async () => {
    mockQueueInstance.upsertJobScheduler.mockResolvedValue(undefined);

    await jobQueue.schedule(
      'fraud-ingestion',
      'ingestion:poll',
      { sourceName: 'TransactionsDb.Transactions' },
      {
        schedulerId: 'transactions-ingestion-scheduler',
        schedule: {
          type: 'INTERVAL',
          everyMilliseconds: 600000,
        },
        attempts: 3,
      },
    );

    expect(mockQueueInstance.upsertJobScheduler).toHaveBeenCalledWith(
      'transactions-ingestion-scheduler',
      { every: 600000 },
      {
        name: 'ingestion:poll',
        data: { sourceName: 'TransactionsDb.Transactions' },
        opts: { attempts: 3 },
      },
    );
  });

  it('removeSchedule() delegates to BullMQ removeJobScheduler()', async () => {
    mockQueueInstance.removeJobScheduler.mockResolvedValue(true);

    const removed = await jobQueue.removeSchedule(
      'fraud-ingestion',
      'transactions-ingestion-scheduler',
    );

    expect(removed).toBe(true);
    expect(mockQueueInstance.removeJobScheduler).toHaveBeenCalledWith(
      'transactions-ingestion-scheduler',
    );
  });

  it('getJob() returns a mapped domain job', async () => {
    mockQueueInstance.getJob.mockResolvedValue({
      id: 'job-1',
      name: 'ingestion:poll',
      data: { sourceName: 'TransactionsDb.Transactions' },
      attemptsMade: 2,
      timestamp: Date.parse('2026-08-03T12:00:00.000Z'),
      processedOn: Date.parse('2026-08-03T12:00:01.000Z'),
      finishedOn: Date.parse('2026-08-03T12:00:02.000Z'),
      returnvalue: { ingested: 1 },
      failedReason: '',
      getState: jest.fn().mockResolvedValue('completed'),
    });

    const result = await jobQueue.getJob('fraud-ingestion', 'job-1');

    expect(result).toEqual({
      id: 'job-1',
      queueName: 'fraud-ingestion',
      name: 'ingestion:poll',
      payload: { sourceName: 'TransactionsDb.Transactions' },
      status: JobQueueStatus.COMPLETED,
      attemptsMade: 2,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
      startedAt: new Date('2026-08-03T12:00:01.000Z'),
      completedAt: new Date('2026-08-03T12:00:02.000Z'),
      failedAt: undefined,
      result: { ingested: 1 },
      failureReason: undefined,
    });
  });

  it('getJob() returns null when the BullMQ job does not exist', async () => {
    mockQueueInstance.getJob.mockResolvedValue(null);

    await expect(
      jobQueue.getJob('fraud-ingestion', 'missing-job'),
    ).resolves.toBeNull();
  });

  it('cancelJob() removes an existing BullMQ job', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    mockQueueInstance.getJob.mockResolvedValue({
      remove,
    });

    await expect(
      jobQueue.cancelJob('fraud-ingestion', 'job-1'),
    ).resolves.toBe(true);

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('cancelJob() returns false when the BullMQ job does not exist', async () => {
    mockQueueInstance.getJob.mockResolvedValue(null);

    await expect(
      jobQueue.cancelJob('fraud-ingestion', 'missing-job'),
    ).resolves.toBe(false);
  });
});
