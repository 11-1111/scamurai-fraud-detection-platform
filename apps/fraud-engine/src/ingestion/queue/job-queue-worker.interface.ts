import type {
  JobName,
  JobPayload,
  JobQueueId,
  JobQueueName,
} from './job-queue.types';

export interface JobExecutionContext<TPayload extends JobPayload> {
  jobId: JobQueueId;
  queueName: JobQueueName;
  jobName: JobName;
  payload: TPayload;
  attemptsMade: number;
}

export interface JobQueueProcessor<TPayload extends JobPayload, TResult = unknown> {
  process(context: JobExecutionContext<TPayload>): Promise<TResult>;
}
