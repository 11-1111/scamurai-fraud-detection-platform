import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudIngestionConfigEntity } from '../../database/entities/fraud-ingestion-config.entity';
import { IngestionConfiguration } from './ingestion-configuration';
import { IngestionConfigurationProvider } from './ingestion-configuration-provider.interface';

@Injectable()
export class SqlIngestionConfigurationProvider
  implements IngestionConfigurationProvider
{
  private readonly logger = new Logger(SqlIngestionConfigurationProvider.name);

  constructor(
    @InjectRepository(FraudIngestionConfigEntity, 'fraud')
    private readonly configRepo: Repository<FraudIngestionConfigEntity>,
  ) {}

  async getBySourceName(sourceName: string): Promise<IngestionConfiguration> {
    const normalizedSourceName = sourceName.trim();

    if (!normalizedSourceName) {
      throw new BadRequestException('sourceName must not be empty.');
    }

    const entity = await this.configRepo.findOne({
      where: { sourceName: normalizedSourceName },
    });

    if (!entity) {
      throw new NotFoundException(
        `Ingestion configuration not found for source "${normalizedSourceName}".`,
      );
    }

    return this.toDomainConfiguration(entity);
  }

  async getEnabledConfigurations(): Promise<IngestionConfiguration[]> {
    const entities = await this.configRepo.find({
      where: { isEnabled: true },
      order: { sourceName: 'ASC' },
    });

    return entities.map((entity) => this.toDomainConfiguration(entity));
  }

  private toDomainConfiguration(
    entity: FraudIngestionConfigEntity,
  ): IngestionConfiguration {
    this.validatePersistedConfiguration(entity);

    return {
      sourceName: entity.sourceName.trim(),
      isEnabled: entity.isEnabled,
      intervalMinutes: entity.intervalMinutes,
      batchSize: entity.batchSize,
      maxConcurrency: entity.maxConcurrency,
      jobTimeoutSeconds: entity.jobTimeoutSeconds,
      retryAttempts: entity.retryAttempts,
      retryBackoffSeconds: entity.retryBackoffSeconds,
      updatedAt: entity.updatedAt,
    };
  }

  private validatePersistedConfiguration(
    entity: FraudIngestionConfigEntity,
  ): void {
    const invalidFields: string[] = [];

    if (!entity.sourceName?.trim()) {
      invalidFields.push('sourceName');
    }

    if (
      entity.intervalMinutes < 1 ||
      entity.intervalMinutes > 1440
    ) {
      invalidFields.push('intervalMinutes');
    }

    if (entity.batchSize < 1 || entity.batchSize > 10000) {
      invalidFields.push('batchSize');
    }

    if (entity.maxConcurrency < 1 || entity.maxConcurrency > 100) {
      invalidFields.push('maxConcurrency');
    }

    if (entity.jobTimeoutSeconds < 30) {
      invalidFields.push('jobTimeoutSeconds');
    }

    if (entity.retryAttempts < 0 || entity.retryAttempts > 20) {
      invalidFields.push('retryAttempts');
    }

    if (entity.retryBackoffSeconds < 0) {
      invalidFields.push('retryBackoffSeconds');
    }

    if (
      !(entity.updatedAt instanceof Date) ||
      Number.isNaN(entity.updatedAt.getTime())
    ) {
      invalidFields.push('updatedAt');
    }

    if (invalidFields.length === 0) {
      return;
    }

    this.logger.error(
      `Invalid persisted ingestion configuration for source "${entity.sourceName}": ${invalidFields.join(', ')}`,
    );

    throw new InternalServerErrorException(
      `Invalid persisted ingestion configuration for source "${entity.sourceName}".`,
    );
  }
}
