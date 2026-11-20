import type { JobQueueJob } from './job-queue-job';
import type { JobEnqueueOptions } from './job-queue-options';
import type { ScheduledJobOptions } from './job-schedule-options';
import type {
  JobName,
  JobPayload,
  JobQueueId,
  JobQueueName,
} from './job-queue.types';

/*
 * What the queue can say about its broker, in terms that name no driver.
 *
 * A health check needs to know whether the broker is reachable, and the only
 * component that can ask is the adapter that already holds a connection to
 * it. Expressing the answer here keeps the rest of the application -- the
 * health endpoint included -- from importing bullmq or ioredis to find out.
 */
export interface JobQueueBrokerStatus {
  reachable: boolean;
  responseTimeMs: number;
  /** Broker version, where the driver can report one. */
  version?: string;
  /** Broker role, such as master or replica, where reported. */
  role?: string;
  /** Why it is unreachable, when it is not. */
  message?: string;
}

export interface JobQueue {
  /*
   * Round-trip the broker. Implementations must resolve rather than reject
   * when it is unreachable: "the broker is down" is an answer, not a failure
   * of the call.
   */
  probe(queueName: JobQueueName): Promise<JobQueueBrokerStatus>;

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
