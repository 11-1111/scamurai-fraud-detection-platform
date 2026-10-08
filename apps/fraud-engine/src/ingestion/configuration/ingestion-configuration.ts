export interface IngestionConfiguration {
  sourceName: string;
  isEnabled: boolean;
  intervalMinutes: number;
  batchSize: number;
  maxConcurrency: number;
  jobTimeoutSeconds: number;
  retryAttempts: number;
  retryBackoffSeconds: number;
  updatedAt: Date;
}
