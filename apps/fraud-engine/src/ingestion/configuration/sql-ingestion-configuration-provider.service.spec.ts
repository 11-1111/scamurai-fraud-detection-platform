import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { FraudIngestionConfigEntity } from '../../database/entities/fraud-ingestion-config.entity';
import { SqlIngestionConfigurationProvider } from './sql-ingestion-configuration-provider.service';

describe('SqlIngestionConfigurationProvider', () => {
  let provider: SqlIngestionConfigurationProvider;
  let configRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  const validEntity: FraudIngestionConfigEntity = {
    id: '11111111-1111-1111-1111-111111111111',
    sourceName: 'TransactionsDb.Transactions',
    isEnabled: true,
    intervalMinutes: 10,
    batchSize: 500,
    maxConcurrency: 1,
    jobTimeoutSeconds: 600,
    retryAttempts: 3,
    retryBackoffSeconds: 30,
    updatedAt: new Date('2026-08-03T12:00:00.000Z'),
    createdAt: new Date('2026-08-03T10:00:00.000Z'),
  };

  beforeEach(() => {
    configRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    provider = new SqlIngestionConfigurationProvider(
      configRepo as unknown as Repository<FraudIngestionConfigEntity>,
    );
  });

  it('getBySourceName returns a mapped domain configuration', async () => {
    configRepo.findOne.mockResolvedValue(validEntity);

    const result = await provider.getBySourceName('TransactionsDb.Transactions');

    expect(result).toEqual({
      sourceName: 'TransactionsDb.Transactions',
      isEnabled: true,
      intervalMinutes: 10,
      batchSize: 500,
      maxConcurrency: 1,
      jobTimeoutSeconds: 600,
      retryAttempts: 3,
      retryBackoffSeconds: 30,
      updatedAt: validEntity.updatedAt,
    });
    expect(result).not.toBeInstanceOf(FraudIngestionConfigEntity);
  });

  it('getBySourceName trims sourceName before querying', async () => {
    configRepo.findOne.mockResolvedValue(validEntity);

    await provider.getBySourceName('  TransactionsDb.Transactions  ');

    expect(configRepo.findOne).toHaveBeenCalledWith({
      where: { sourceName: 'TransactionsDb.Transactions' },
    });
  });

  it('getBySourceName throws BadRequestException for empty sourceName', async () => {
    await expect(provider.getBySourceName('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getBySourceName throws NotFoundException when configuration is missing', async () => {
    configRepo.findOne.mockResolvedValue(null);

    await expect(
      provider.getBySourceName('Missing.Source'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getEnabledConfigurations returns only enabled rows ordered by sourceName', async () => {
    const secondSource: FraudIngestionConfigEntity = {
      ...validEntity,
      id: '22222222-2222-2222-2222-222222222222',
      sourceName: 'Another.Source',
    };

    configRepo.find.mockResolvedValue([secondSource, validEntity]);

    const results = await provider.getEnabledConfigurations();

    expect(configRepo.find).toHaveBeenCalledWith({
      where: { isEnabled: true },
      order: { sourceName: 'ASC' },
    });
    expect(results).toHaveLength(2);
    expect(results[0].sourceName).toBe('Another.Source');
    expect(results[1].sourceName).toBe('TransactionsDb.Transactions');
    expect(results.every((item) => !(item instanceof FraudIngestionConfigEntity))).toBe(
      true,
    );
  });

  it.each([
    ['intervalMinutes', { intervalMinutes: 0 }],
    ['intervalMinutes', { intervalMinutes: 1441 }],
    ['batchSize', { batchSize: 0 }],
    ['batchSize', { batchSize: 10001 }],
    ['maxConcurrency', { maxConcurrency: 0 }],
    ['maxConcurrency', { maxConcurrency: 101 }],
    ['jobTimeoutSeconds', { jobTimeoutSeconds: 29 }],
    ['retryAttempts', { retryAttempts: -1 }],
    ['retryAttempts', { retryAttempts: 21 }],
    ['retryBackoffSeconds', { retryBackoffSeconds: -1 }],
    ['updatedAt', { updatedAt: new Date('invalid') }],
  ])(
    'throws InternalServerErrorException for invalid %s',
    async (_field, overrides) => {
      configRepo.findOne.mockResolvedValue({
        ...validEntity,
        ...overrides,
      });

      await expect(
        provider.getBySourceName('TransactionsDb.Transactions'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    },
  );
});
