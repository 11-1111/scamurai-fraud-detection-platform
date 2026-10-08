import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IngestionConfiguration } from '../configuration/ingestion-configuration';
import type { IngestionConfigurationProvider } from '../configuration/ingestion-configuration-provider.interface';
import { INGESTION_CONFIGURATION_PROVIDER } from '../configuration/ingestion-configuration-provider.token';
import { TRANSACTIONS_INGESTION_SOURCE } from '../ingestion.constants';
import {
  INGESTION_POLL_JOB,
  INGESTION_QUEUE_NAME,
} from '../queue/ingestion-job.constants';
import type { JobQueue } from '../queue/job-queue.interface';
import { JOB_QUEUE } from '../queue/job-queue.token';
import { JobQueueStatus } from '../queue/job-queue.types';
import { JobOrchestrator } from './job-orchestrator.interface';
import {
  buildIngestionPollJobId,
  buildIngestionPollPayload,
  mapConfigurationToPollEnqueueOptions,
} from './ingestion-poll-job.helpers';

@Injectable()
export class NestCronJobOrchestrator implements JobOrchestrator {
  private readonly logger = new Logger(NestCronJobOrchestrator.name);
  private lastTriggeredAt: Date | null = null;

  constructor(
    @Inject(JOB_QUEUE)
    private readonly jobQueue: JobQueue,
    @Inject(INGESTION_CONFIGURATION_PROVIDER)
    private readonly configurationProvider: IngestionConfigurationProvider,
  ) {}

  async start(): Promise<void> {
    try {
      const configuration = await this.configurationProvider.getBySourceName(
        TRANSACTIONS_INGESTION_SOURCE,
      );

      this.logger.log(
        `Nest cron job orchestrator active for ${configuration.sourceName} (enabled=${configuration.isEnabled}, intervalMinutes=${configuration.intervalMinutes}).`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown configuration error';
      this.logger.error(
        `Failed to load ingestion configuration on start: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async stop(): Promise<void> {
    this.logger.log('Nest cron job orchestrator shutdown requested.');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    let configuration: IngestionConfiguration;

    try {
      configuration = await this.configurationProvider.getBySourceName(
        TRANSACTIONS_INGESTION_SOURCE,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown configuration error';
      this.logger.error(
        `Failed to load ingestion configuration: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    if (!configuration.isEnabled) {
      this.logger.log(
        `Ingestion is disabled for source "${configuration.sourceName}".`,
      );
      return;
    }

    if (!this.isIngestionDue(configuration, new Date())) {
      this.logger.debug(
        `Ingestion not due yet for source "${configuration.sourceName}".`,
      );
      return;
    }

    try {
      const enqueued = await this.enqueuePollJob(configuration);
      if (enqueued) {
        this.lastTriggeredAt = new Date();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';
      this.logger.error(
        `Failed to enqueue scheduled ingestion job: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async enqueuePollJob(
    configuration: IngestionConfiguration,
  ): Promise<boolean> {
    const jobId = buildIngestionPollJobId(configuration.sourceName);
    const existingJob = await this.jobQueue.getJob(INGESTION_QUEUE_NAME, jobId);

    if (
      existingJob &&
      this.isIngestionJobPending(existingJob.status)
    ) {
      this.logger.log(
        `Ingestion job already scheduled for source "${configuration.sourceName}" (jobId=${jobId}, status=${existingJob.status}).`,
      );
      return false;
    }

    const payload = buildIngestionPollPayload(
      configuration.sourceName,
      'scheduler',
    );

    await this.jobQueue.enqueue(
      INGESTION_QUEUE_NAME,
      INGESTION_POLL_JOB,
      payload,
      mapConfigurationToPollEnqueueOptions(configuration),
    );

    this.logger.log(
      `Enqueued ingestion poll job for source "${configuration.sourceName}" (jobId=${jobId}).`,
    );

    return true;
  }

  private isIngestionJobPending(status: JobQueueStatus): boolean {
    return (
      status === JobQueueStatus.WAITING || status === JobQueueStatus.ACTIVE
    );
  }

  private isIngestionDue(
    configuration: IngestionConfiguration,
    now: Date,
  ): boolean {
    if (this.lastTriggeredAt === null) {
      return true;
    }

    const elapsedMilliseconds =
      now.getTime() - this.lastTriggeredAt.getTime();
    const requiredMilliseconds = configuration.intervalMinutes * 60 * 1000;

    return elapsedMilliseconds >= requiredMilliseconds;
  }
}
