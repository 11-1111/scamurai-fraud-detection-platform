import type { JobQueueJob } from './job-queue-job';
import type { JobEnqueueOptions } from './job-queue-options';
import type { ScheduledJobOptions } from './job-schedule-options';
import type {
  JobName,
  JobPayload,
  JobQueueId,
  JobQueueName,
} from './job-queue.types';

export interface JobQueue {
  enqueue<TPayload extends JobPayload, TResult = unknown>(
    queueName: JobQueueName,
    jobName: JobName,
    payload: TPayload,
    options?: JobEnqueueOptions,
  ): Promise<JobQueueJob<TPayload, TResult>>;

  schedule<TPayload extends JobPayload>(
    queueName: JobQueueName,
    jobName: JobName,
    payload: TPayload,
    options: ScheduledJobOptions,
  ): Promise<void>;

  removeSchedule(
    queueName: JobQueueName,
    schedulerId: string,
  ): Promise<boolean>;

  getJob<TPayload extends JobPayload = JobPayload, TResult = unknown>(
    queueName: JobQueueName,
    jobId: JobQueueId,
  ): Promise<JobQueueJob<TPayload, TResult> | null>;

  cancelJob(queueName: JobQueueName, jobId: JobQueueId): Promise<boolean>;
}
