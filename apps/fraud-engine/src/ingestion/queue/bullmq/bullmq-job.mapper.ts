import type { BackoffOptions, JobsOptions, RepeatOptions } from 'bullmq';
import type { Job } from 'bullmq';
import type { JobEnqueueOptions } from '../job-queue-options';
import type { JobQueueJob } from '../job-queue-job';
import type { JobSchedule } from '../job-schedule-options';
import {
  JobQueueStatus,
  type JobPayload,
  type JobQueueName,
} from '../job-queue.types';

export function mapEnqueueOptionsToBullMq(
  options?: JobEnqueueOptions,
): JobsOptions {
  if (!options) {
    return {};
  }

  const bullOptions: JobsOptions = {};

  if (options.jobId) {
    bullOptions.jobId = options.jobId;
  }

  if (options.delayMilliseconds !== undefined) {
    bullOptions.delay = options.delayMilliseconds;
  }

  if (options.attempts !== undefined) {
    bullOptions.attempts = options.attempts;
  }

  if (options.backoff) {
    bullOptions.backoff = mapBackoffOptionsToBullMq(options.backoff);
  }

  if (options.removeOnComplete !== undefined) {
    bullOptions.removeOnComplete = options.removeOnComplete;
  }

  if (options.removeOnFail !== undefined) {
    bullOptions.removeOnFail = options.removeOnFail;
  }

  return bullOptions;
}

export function mapScheduleToRepeatOptions(
  schedule: JobSchedule,
): Omit<RepeatOptions, 'key'> {
  if (schedule.type === 'INTERVAL') {
    return {
      every: schedule.everyMilliseconds,
    };
  }

  return {
    pattern: schedule.pattern,
    ...(schedule.timezone ? { tz: schedule.timezone } : {}),
  };
}

export function mapBullMqStateToJobQueueStatus(
  state: string,
): JobQueueStatus {
  switch (state) {
    case 'waiting':
    case 'wait':
    case 'waiting-children':
    case 'prioritized':
      return JobQueueStatus.WAITING;
    case 'delayed':
      return JobQueueStatus.DELAYED;
    case 'active':
      return JobQueueStatus.ACTIVE;
    case 'completed':
      return JobQueueStatus.COMPLETED;
    case 'failed':
      return JobQueueStatus.FAILED;
    default:
      return JobQueueStatus.UNKNOWN;
  }
}

export async function mapBullMqJobToJobQueueJob<
  TPayload extends JobPayload,
  TResult = unknown,
>(
  job: Job<TPayload, TResult>,
  queueName: JobQueueName,
  statusOverride?: JobQueueStatus,
): Promise<JobQueueJob<TPayload, TResult>> {
  const state = statusOverride ?? mapBullMqStateToJobQueueStatus(await job.getState());

  const mappedStatus =
    state === JobQueueStatus.UNKNOWN && job.finishedOn && job.failedReason
      ? JobQueueStatus.FAILED
      : state;

  return {
    id: String(job.id),
    queueName,
    name: job.name,
    payload: job.data,
    status: mappedStatus,
    attemptsMade: job.attemptsMade,
    createdAt: new Date(job.timestamp),
    startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    completedAt:
      mappedStatus === JobQueueStatus.COMPLETED && job.finishedOn
        ? new Date(job.finishedOn)
        : undefined,
    failedAt:
      mappedStatus === JobQueueStatus.FAILED && job.finishedOn
        ? new Date(job.finishedOn)
        : undefined,
    result: job.returnvalue,
    failureReason: job.failedReason || undefined,
  };
}

function mapBackoffOptionsToBullMq(
  backoff: NonNullable<JobEnqueueOptions['backoff']>,
): BackoffOptions {
  return {
    type: backoff.strategy === 'FIXED' ? 'fixed' : 'exponential',
    delay: backoff.delayMilliseconds,
  };
}
