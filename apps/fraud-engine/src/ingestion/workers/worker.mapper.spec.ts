import type { Job } from 'bullmq';

import { INGESTION_POLL_JOB, INGESTION_QUEUE_NAME } from '../queue/ingestion-job.constants';
import { mapBullMqJobToJobExecutionContext } from './worker.mapper';

describe('mapBullMqJobToJobExecutionContext', () => {
  it('maps a BullMQ job to JobExecutionContext', () => {
    const job = {
      id: 'job-42',
      name: INGESTION_POLL_JOB,
      data: { source: 'TransactionsDb.Transactions' },
      attemptsMade: 2,
      queueName: INGESTION_QUEUE_NAME,
    } as Job;

    expect(mapBullMqJobToJobExecutionContext(job)).toEqual({
      jobId: 'job-42',
      queueName: INGESTION_QUEUE_NAME,
      jobName: INGESTION_POLL_JOB,
      payload: { source: 'TransactionsDb.Transactions' },
      attemptsMade: 2,
    });
  });
});
