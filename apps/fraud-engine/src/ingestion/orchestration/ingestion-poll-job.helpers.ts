import type { IngestionConfiguration } from '../configuration/ingestion-configuration';
import type { JobEnqueueOptions } from '../queue/job-queue-options';
import type { IngestionPollPayload } from '../queue/ingestion-poll.payload';

export function buildIngestionPollJobId(sourceName: string): string {
  return `ingestion:poll:${sourceName}`;
}

export function buildIngestionPollPayload(
  sourceName: string,
  requestedBy: IngestionPollPayload['requestedBy'],
  requestedAt: Date = new Date(),
): IngestionPollPayload {
  return {
    sourceName,
    requestedAt: requestedAt.toISOString(),
    requestedBy,
  };
}

export function mapConfigurationToPollEnqueueOptions(
  configuration: IngestionConfiguration,
): JobEnqueueOptions {
  return {
    jobId: buildIngestionPollJobId(configuration.sourceName),
    attempts: configuration.retryAttempts,
    backoff: {
      strategy: 'FIXED',
      delayMilliseconds: configuration.retryBackoffSeconds * 1000,
    },
    timeoutMilliseconds: configuration.jobTimeoutSeconds * 1000,
  };
}
