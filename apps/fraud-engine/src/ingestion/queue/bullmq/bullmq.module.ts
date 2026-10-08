import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { getBullMqConnectionOptions, getBullMqRootOptions } from './bullmq.config';
import { BULLMQ_CONNECTION } from './bullmq.constants';
import { BullMqJobQueue } from './bullmq-job-queue.service';
import { JOB_QUEUE } from '../job-queue.token';
import { INGESTION_QUEUE_NAME } from '../ingestion-job.constants';
import { IngestionModule } from '../../ingestion.module';
import { IngestionWorker } from '../../workers/ingestion.worker';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => IngestionModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getBullMqRootOptions(config),
    }),
    BullModule.registerQueue({ name: INGESTION_QUEUE_NAME }),
  ],
  providers: [
    {
      provide: BULLMQ_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getBullMqConnectionOptions(config),
    },
    BullMqJobQueue,
    {
      provide: JOB_QUEUE,
      useExisting: BullMqJobQueue,
    },
    IngestionWorker,
  ],
  exports: [BullModule, JOB_QUEUE],
})
export class BullMqModule {}
