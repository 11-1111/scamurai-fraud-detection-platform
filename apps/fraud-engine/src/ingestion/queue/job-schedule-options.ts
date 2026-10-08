import type { JobEnqueueOptions } from './job-queue-options';

export interface JobIntervalSchedule {
  type: 'INTERVAL';
  everyMilliseconds: number;
}

export interface JobCronSchedule {
  type: 'CRON';
  pattern: string;
  timezone?: string;
}

export type JobSchedule = JobIntervalSchedule | JobCronSchedule;

export interface ScheduledJobOptions extends JobEnqueueOptions {
  schedule: JobSchedule;
  schedulerId: string;
}
