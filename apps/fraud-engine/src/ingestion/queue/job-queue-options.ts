import type { JobQueueId } from './job-queue.types';

export type JobBackoffStrategy = 'FIXED' | 'EXPONENTIAL';

export interface JobBackoffOptions {
  strategy: JobBackoffStrategy;
  delayMilliseconds: number;
}

export interface JobEnqueueOptions {
  jobId?: JobQueueId;
  delayMilliseconds?: number;
  attempts?: number;
  backoff?: JobBackoffOptions;
  timeoutMilliseconds?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}
