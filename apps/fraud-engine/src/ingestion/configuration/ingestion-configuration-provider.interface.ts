import { IngestionConfiguration } from './ingestion-configuration';

export interface IngestionConfigurationProvider {
  getBySourceName(sourceName: string): Promise<IngestionConfiguration>;
  getEnabledConfigurations(): Promise<IngestionConfiguration[]>;
}
