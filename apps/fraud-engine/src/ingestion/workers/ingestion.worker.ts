import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { IngestionService } from '../ingestion.service';
import {
  INGESTION_POLL_JOB,
  INGESTION_QUEUE_NAME,
} from '../queue/ingestion-job.constants';
import type {
  JobExecutionContext,
  JobQueueProcessor,
} from '../queue/job-queue-worker.interface';
import type { IngestionPollPayload } from '../queue/ingestion-poll.payload';
import type { JobPayload } from '../queue/job-queue.types';
import { mapBullMqJobToJobExecutionContext } from './worker.mapper';

@Processor(INGESTION_QUEUE_NAME)
@Injectable()
export class IngestionWorker
  extends WorkerHost
  implements JobQueueProcessor<JobPayload>
{
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async process(job: Job, token?: string): Promise<unknown>;
  async process(context: JobExecutionContext<JobPayload>): Promise<unknown>;
  async process(
    jobOrContext: Job | JobExecutionContext<JobPayload>,
    _token?: string,
  ): Promise<unknown> {
    if (isJobExecutionContext(jobOrContext)) {
      return this.routeJob(jobOrContext);
    }

    const context = mapBullMqJobToJobExecutionContext(jobOrContext);
    const startedAt = Date.now();
    const attempt = context.attemptsMade + 1;

    try {
      const result = await this.routeJob(context);
      this.logJobOutcome(context, startedAt, attempt, true);
      return result;
    } catch (error) {
      this.logJobOutcome(context, startedAt, attempt, false, error);
      throw error;
    }
  }

  private async processPollJob(_payload: IngestionPollPayload): Promise<unknown> {
    return this.ingestionService.runScheduledSync();
  }

  private async routeJob(
    context: JobExecutionContext<JobPayload>,
  ): Promise<unknown> {
    switch (context.jobName) {
      case INGESTION_POLL_JOB:
        return this.processPollJob(context.payload as IngestionPollPayload);
      default:
        throw new BadRequestException(
          `Unknown ingestion job name: ${context.jobName}`,
        );
    }
  }

  private logJobOutcome(
    context: JobExecutionContext<JobPayload>,
    startedAt: number,
    attempt: number,
    success: boolean,
    error?: unknown,
  ): void {
    const executionTimeMs = Date.now() - startedAt;
    const payload = {
      jobId: context.jobId,
      queue: context.queueName,
      executionTimeMs,
      attempt,
      success,
    };

    if (success) {
      this.logger.log(payload);
      return;
    }

    this.logger.error({
      ...payload,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function isJobExecutionContext(
  value: Job | JobExecutionContext<JobPayload>,
): value is JobExecutionContext<JobPayload> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jobName' in value &&
    'payload' in value &&
    !('queue' in value)
  );
}
