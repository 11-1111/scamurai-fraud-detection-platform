import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import type { BullMqRedisConfig } from './bullmq.config';
import type { JobQueue, JobQueueBrokerStatus } from '../job-queue.interface';
import type { JobQueueJob } from '../job-queue-job';
import type { JobEnqueueOptions } from '../job-queue-options';
import type { ScheduledJobOptions } from '../job-schedule-options';
import type {
  JobName,
  JobPayload,
  JobQueueId,
  JobQueueName,
} from '../job-queue.types';
import { BULLMQ_CONNECTION } from './bullmq.constants';
import { readInfoField } from './redis-info';
import {
  mapBullMqJobToJobQueueJob,
  mapEnqueueOptionsToBullMq,
  mapScheduleToRepeatOptions,
} from './bullmq-job.mapper';

@Injectable()
export class BullMqJobQueue implements JobQueue, OnModuleDestroy {
  private readonly queues = new Map<JobQueueName, Queue>();
  private readonly queueEvents = new Map<JobQueueName, QueueEvents>();

  constructor(
    @Inject(BULLMQ_CONNECTION)
    private readonly connection: BullMqRedisConfig,
  ) {}

  async enqueue<TPayload extends JobPayload, TResult = unknown>(
    queueName: JobQueueName,
    jobName: JobName,
    payload: TPayload,
    options?: JobEnqueueOptions,
  ): Promise<JobQueueJob<TPayload, TResult>> {
    const queue = this.getQueue(queueName);
    const bullJob = await queue.add(
      jobName,
      payload,
      mapEnqueueOptionsToBullMq(options),
    );

    return mapBullMqJobToJobQueueJob<TPayload, TResult>(bullJob, queueName);
  }

  async schedule<TPayload extends JobPayload>(
    queueName: JobQueueName,
    jobName: JobName,
    payload: TPayload,
    options: ScheduledJobOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);

    await queue.upsertJobScheduler(
      options.schedulerId,
      mapScheduleToRepeatOptions(options.schedule),
      {
        name: jobName,
        data: payload,
        opts: mapEnqueueOptionsToBullMq(options),
      },
    );
  }

  async removeSchedule(
    queueName: JobQueueName,
    schedulerId: string,
  ): Promise<boolean> {
    const queue = this.getQueue(queueName);
    return queue.removeJobScheduler(schedulerId);
  }

  async getJob<TPayload extends JobPayload = JobPayload, TResult = unknown>(
    queueName: JobQueueName,
    jobId: JobQueueId,
  ): Promise<JobQueueJob<TPayload, TResult> | null> {
    const queue = this.getQueue(queueName);
    const bullJob = await queue.getJob(jobId);

    if (!bullJob) {
      return null;
    }

    return mapBullMqJobToJobQueueJob<TPayload, TResult>(bullJob, queueName);
  }

  async cancelJob(
    queueName: JobQueueName,
    jobId: JobQueueId,
  ): Promise<boolean> {
    const queue = this.getQueue(queueName);
    const bullJob = await queue.getJob(jobId);

    if (!bullJob) {
      return false;
    }

    await bullJob.remove();
    return true;
  }

  /*
   * Round-trip Redis through the queue's own connection.
   *
   * Reusing that connection is the point: a probe that dials its own socket
   * can report a broker the application cannot actually reach -- different
   * pool, different credentials, different answer.
   *
   * INFO rather than PING because both prove the round trip while INFO also
   * carries the version and role, which is what you want on hand when a
   * queue starts misbehaving.
   */
  async probe(queueName: JobQueueName): Promise<JobQueueBrokerStatus> {
    const startedAt = Date.now();

    try {
      const client = await this.getQueue(queueName).client;
      const info = await client.info();

      return {
        reachable: true,
        responseTimeMs: Date.now() - startedAt,
        version: readInfoField(info, 'redis_version'),
        role: readInfoField(info, 'role'),
      };
    } catch (error) {
      // Resolved, not rejected: an unreachable broker is an answer.
      return {
        reachable: false,
        responseTimeMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
      ...Array.from(this.queueEvents.values()).map((queueEvents) =>
        queueEvents.close(),
      ),
    ]);
  }

  private getQueue(queueName: JobQueueName): Queue {
    const existingQueue = this.queues.get(queueName);
    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue(queueName, {
      connection: this.connection,
    });

    this.queues.set(queueName, queue);
    this.getQueueEvents(queueName);

    return queue;
  }

  private getQueueEvents(queueName: JobQueueName): QueueEvents {
    const existingQueueEvents = this.queueEvents.get(queueName);
    if (existingQueueEvents) {
      return existingQueueEvents;
    }

    const queueEvents = new QueueEvents(queueName, {
      connection: this.connection,
    });

    this.queueEvents.set(queueName, queueEvents);
    return queueEvents;
  }
}
