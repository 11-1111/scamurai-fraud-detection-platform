import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  Queue,
  QueueEvents,
} from 'bullmq';
import type { BullMqRedisConfig } from './bullmq.config';
import type { JobQueue } from '../job-queue.interface';
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
