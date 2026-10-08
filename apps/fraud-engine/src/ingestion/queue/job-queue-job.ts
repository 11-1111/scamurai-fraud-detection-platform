import type {
  JobName,
  JobPayload,
  JobQueueId,
  JobQueueName,
  JobQueueStatus,
} from './job-queue.types';

export interface JobQueueJob<
  TPayload extends JobPayload = JobPayload,
  TResult = unknown,
> {
  id: JobQueueId;
  queueName: JobQueueName;
  name: JobName;
  payload: TPayload;
  status: JobQueueStatus;
  attemptsMade: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  result?: TResult;
  failureReason?: string;
}
