import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IngestionConfiguration } from '../configuration/ingestion-configuration';
import { IngestionController } from '../ingestion.controller';
import { TRANSACTIONS_INGESTION_SOURCE } from '../ingestion.constants';
import { IngestionService } from '../ingestion.service';
import {
  INGESTION_POLL_JOB,
  INGESTION_QUEUE_NAME,
} from '../queue/ingestion-job.constants';
import type { JobQueue } from '../queue/job-queue.interface';
import { JobQueueStatus } from '../queue/job-queue.types';
import {
  buildIngestionPollJobId,
  mapConfigurationToPollEnqueueOptions,
} from './ingestion-poll-job.helpers';
import { JobOrchestrator } from './job-orchestrator.interface';
import { NestCronJobOrchestrator } from './nest-cron-job-orchestrator.service';

describe('NestCronJobOrchestrator', () => {
  let orchestrator: NestCronJobOrchestrator;
  let jobQueue: {
    enqueue: jest.Mock;
    getJob: jest.Mock;
  };
  let configurationProvider: { getBySourceName: jest.Mock };

  const enabledConfiguration: IngestionConfiguration = {
    sourceName: TRANSACTIONS_INGESTION_SOURCE,
    isEnabled: true,
    intervalMinutes: 10,
    batchSize: 500,
    maxConcurrency: 1,
    jobTimeoutSeconds: 600,
    retryAttempts: 3,
    retryBackoffSeconds: 30,
    updatedAt: new Date('2026-08-03T12:00:00.000Z'),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-03T12:00:00.000Z'));

    jobQueue = {
      enqueue: jest.fn().mockResolvedValue({
        id: buildIngestionPollJobId(TRANSACTIONS_INGESTION_SOURCE),
        queueName: INGESTION_QUEUE_NAME,
        name: INGESTION_POLL_JOB,
        payload: {},
        status: JobQueueStatus.WAITING,
        attemptsMade: 0,
        createdAt: new Date('2026-08-03T12:00:00.000Z'),
      }),
      getJob: jest.fn().mockResolvedValue(null),
    };

    configurationProvider = {
      getBySourceName: jest.fn().mockResolvedValue(enabledConfiguration),
    };

    orchestrator = new NestCronJobOrchestrator(
      jobQueue as unknown as JobQueue,
      configurationProvider,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('implements JobOrchestrator', () => {
    const jobOrchestrator: JobOrchestrator = orchestrator;

    expect(typeof jobOrchestrator.start).toBe('function');
    expect(typeof jobOrchestrator.stop).toBe('function');
  });

  it('handleCron() enqueues INGESTION_POLL_JOB instead of executing ingestion', async () => {
    await orchestrator.handleCron();

    expect(jobQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(jobQueue.enqueue).toHaveBeenCalledWith(
      INGESTION_QUEUE_NAME,
      INGESTION_POLL_JOB,
      {
        sourceName: TRANSACTIONS_INGESTION_SOURCE,
        requestedAt: '2026-08-03T12:00:00.000Z',
        requestedBy: 'scheduler',
      },
      mapConfigurationToPollEnqueueOptions(enabledConfiguration),
    );
  });

  it('maps configuration retry and timeout values into JobEnqueueOptions', async () => {
    await orchestrator.handleCron();

    expect(jobQueue.enqueue).toHaveBeenCalledWith(
      INGESTION_QUEUE_NAME,
      INGESTION_POLL_JOB,
      expect.any(Object),
      {
        jobId: 'ingestion:poll:TransactionsDb.Transactions',
        attempts: 3,
        backoff: {
          strategy: 'FIXED',
          delayMilliseconds: 30000,
        },
        timeoutMilliseconds: 600000,
      },
    );
  });

  it('does not enqueue when configuration is disabled', async () => {
    configurationProvider.getBySourceName.mockResolvedValue({
      ...enabledConfiguration,
      isEnabled: false,
    });

    await orchestrator.handleCron();

    expect(jobQueue.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues immediately on the first enabled check', async () => {
    await orchestrator.handleCron();

    expect(configurationProvider.getBySourceName).toHaveBeenCalledWith(
      TRANSACTIONS_INGESTION_SOURCE,
    );
    expect(jobQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('does not enqueue before the configured interval elapses', async () => {
    await orchestrator.handleCron();

    jest.setSystemTime(new Date('2026-08-03T12:05:00.000Z'));
    await orchestrator.handleCron();

    expect(jobQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('enqueues again after the configured interval elapses', async () => {
    await orchestrator.handleCron();

    jest.setSystemTime(new Date('2026-08-03T12:10:00.000Z'));
    await orchestrator.handleCron();

    expect(jobQueue.enqueue).toHaveBeenCalledTimes(2);
  });

  it('does not update lastTriggeredAt when enqueue fails', async () => {
    jobQueue.enqueue.mockRejectedValueOnce(new Error('queue unavailable'));

    await orchestrator.handleCron();
    await orchestrator.handleCron();

    expect(jobQueue.enqueue).toHaveBeenCalledTimes(2);
  });

  it('updates lastTriggeredAt only after a successful enqueue', async () => {
    jobQueue.enqueue
      .mockRejectedValueOnce(new Error('queue unavailable'))
      .mockResolvedValueOnce({
        id: buildIngestionPollJobId(TRANSACTIONS_INGESTION_SOURCE),
        queueName: INGESTION_QUEUE_NAME,
        name: INGESTION_POLL_JOB,
        payload: {},
        status: JobQueueStatus.WAITING,
        attemptsMade: 0,
        createdAt: new Date('2026-08-03T12:00:00.000Z'),
      });

    await orchestrator.handleCron();
    jest.setSystemTime(new Date('2026-08-03T12:01:00.000Z'));
    await orchestrator.handleCron();
    expect(jobQueue.enqueue).toHaveBeenCalledTimes(2);

    jest.setSystemTime(new Date('2026-08-03T12:02:00.000Z'));
    await orchestrator.handleCron();
    expect(jobQueue.enqueue).toHaveBeenCalledTimes(2);

    jest.setSystemTime(new Date('2026-08-03T12:11:00.000Z'));
    await orchestrator.handleCron();
    expect(jobQueue.enqueue).toHaveBeenCalledTimes(3);
  });

  it('prevents duplicate pending jobs with the deterministic job id', async () => {
    jobQueue.getJob.mockResolvedValue({
      id: buildIngestionPollJobId(TRANSACTIONS_INGESTION_SOURCE),
      queueName: INGESTION_QUEUE_NAME,
      name: INGESTION_POLL_JOB,
      payload: {},
      status: JobQueueStatus.ACTIVE,
      attemptsMade: 0,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
    });

    const loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await orchestrator.handleCron();

    expect(jobQueue.getJob).toHaveBeenCalledWith(
      INGESTION_QUEUE_NAME,
      'ingestion:poll:TransactionsDb.Transactions',
    );
    expect(jobQueue.enqueue).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Ingestion job already scheduled for source "TransactionsDb.Transactions" (jobId=ingestion:poll:TransactionsDb.Transactions, status=ACTIVE).',
    );
  });

  it('does not execute when configuration lookup fails', async () => {
    configurationProvider.getBySourceName.mockRejectedValue(
      new Error('database unavailable'),
    );

    await orchestrator.handleCron();

    expect(jobQueue.enqueue).not.toHaveBeenCalled();
  });

  it('logs enqueue failures without rethrowing', async () => {
    const error = new Error('queue unavailable');
    jobQueue.enqueue.mockRejectedValue(error);

    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(orchestrator.handleCron()).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to enqueue scheduled ingestion job: queue unavailable',
      error.stack,
    );
  });
});

describe('Ingestion orchestration boundaries', () => {
  it('registers exactly one @Cron decorator in src/ingestion', () => {
    const ingestionRoot = path.join(__dirname, '..');
    const cronMatches = countPatternInDirectory(ingestionRoot, /@Cron\(/g);

    expect(cronMatches).toBe(1);
  });

  it('IngestionService contains no scheduler or queue imports', () => {
    const sourcePath = path.join(__dirname, '..', 'ingestion.service.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).not.toMatch(/@nestjs\/schedule/);
    expect(source).not.toMatch(/@nestjs\/bullmq/);
    expect(source).not.toMatch(/from 'bullmq'/);
    expect(source).not.toMatch(/from "bullmq"/);
    expect(source).not.toMatch(/from 'ioredis'/);
    expect(source).not.toMatch(/from "ioredis"/);
  });

  it('IngestionService does not depend on ingestion configuration provider', () => {
    const sourcePath = path.join(__dirname, '..', 'ingestion.service.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).not.toMatch(/INGESTION_CONFIGURATION_PROVIDER/);
    expect(source).not.toMatch(/IngestionConfigurationProvider/);
  });

  it('does not call runScheduledSync() outside workers except service definitions and tests', () => {
    const srcRoot = path.join(__dirname, '..', '..');
    const allowedPathFragments = [
      `${path.sep}workers${path.sep}`,
      `${path.sep}ingestion.service.ts`,
      '.spec.ts',
    ];

    const offenders = findPatternInDirectory(
      srcRoot,
      /runScheduledSync\s*\(/g,
    ).filter(
      (filePath) =>
        !allowedPathFragments.some((fragment) => filePath.includes(fragment)),
    );

    expect(offenders).toEqual([]);
  });

  it('manual controller flow still calls runManualSync()', async () => {
    const ingestionService = {
      runManualSync: jest.fn().mockResolvedValue({
        ingested: 2,
        alertsCreated: 1,
        alertsSkipped: 1,
        lastSyncedAt: new Date('2026-08-03T00:00:00.000Z'),
        lastSyncedTransactionId: 'tx-2',
      }),
    };

    const controller = new IngestionController(
      ingestionService as unknown as IngestionService,
    );

    const response = await controller.sync();

    expect(ingestionService.runManualSync).toHaveBeenCalledTimes(1);
    expect(response.message).toBe('Fraud ingestion sync completed');
  });
});

function countPatternInDirectory(directory: string, pattern: RegExp): number {
  let count = 0;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      count += countPatternInDirectory(entryPath, pattern);
      continue;
    }

    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) {
      continue;
    }

    const contents = fs.readFileSync(entryPath, 'utf8');
    const matches = contents.match(pattern);
    count += matches?.length ?? 0;
  }

  return count;
}

function findPatternInDirectory(directory: string, pattern: RegExp): string[] {
  const offenders: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      offenders.push(...findPatternInDirectory(entryPath, pattern));
      continue;
    }

    if (!entry.name.endsWith('.ts')) {
      continue;
    }

    const contents = fs.readFileSync(entryPath, 'utf8');

    if (pattern.test(contents)) {
      offenders.push(entryPath);
      pattern.lastIndex = 0;
    }
  }

  return offenders;
}
