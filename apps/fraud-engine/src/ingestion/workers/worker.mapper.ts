import type { Job } from 'bullmq';

import type { JobExecutionContext } from '../queue/job-queue-worker.interface';
import type { JobPayload } from '../queue/job-queue.types';

export function mapBullMqJobToJobExecutionContext<
  TPayload extends JobPayload = JobPayload,
>(job: Job<TPayload>): JobExecutionContext<TPayload> {
  return {
    jobId: String(job.id),
    queueName: job.queueName,
    jobName: job.name,
    payload: job.data,
    attemptsMade: job.attemptsMade,
  };
}
