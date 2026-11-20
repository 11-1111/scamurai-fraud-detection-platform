import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { INGESTION_QUEUE_NAME } from '../ingestion/queue/ingestion-job.constants';
import type { JobQueue } from '../ingestion/queue/job-queue.interface';
import { JOB_QUEUE } from '../ingestion/queue/job-queue.token';

/*
 * Health of the job queue's broker.
 *
 * Asks the JobQueue port rather than reaching for bullmq or ioredis, which an
 * architecture test in this repository enforces and which it caught when this
 * indicator was first written against the driver. The port already owns a
 * connection to the broker and now reports on it in driver-neutral terms, so
 * swapping the queue implementation does not touch this file.
 *
 * Degraded, not down: without the broker no ingestion poll can be enqueued,
 * but every read endpoint still serves from FraudDb and an analyst working a
 * queue of alerts is unaffected.
 */
@Injectable()
export class JobQueueHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,

    @Inject(JOB_QUEUE)
    private readonly jobQueue: JobQueue,
  ) {}

  async check(key = 'jobQueue'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const status = await this.jobQueue.probe(INGESTION_QUEUE_NAME);

    if (!status.reachable) {
      return indicator.degraded({
        message: status.message ?? 'broker is unreachable',
        impact: 'ingestion polls cannot be enqueued',
      });
    }

    return indicator.up({
      responseTimeMs: status.responseTimeMs,
      version: status.version,
      role: status.role,
    });
  }
}
