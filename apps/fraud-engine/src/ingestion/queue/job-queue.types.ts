export type JobQueueId = string;

export type JobQueueName = string;

export type JobName = string;

export type JobPayload = Record<string, unknown>;

export enum JobQueueStatus {
  WAITING = 'WAITING',
  DELAYED = 'DELAYED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN',
}
