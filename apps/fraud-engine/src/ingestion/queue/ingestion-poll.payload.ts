import type { JobPayload } from './job-queue.types';

export type IngestionPollRequestedBy = 'scheduler' | 'manual' | (string & {});

export interface IngestionPollPayload extends JobPayload {
  sourceName: string;
  requestedAt: string;
  requestedBy: IngestionPollRequestedBy;
}
