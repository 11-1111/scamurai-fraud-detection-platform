import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IngestionService } from './ingestion.service';
import { NestCronJobOrchestrator } from './orchestration/nest-cron-job-orchestrator.service';
import { JOB_ORCHESTRATOR } from './orchestration/job-orchestrator.token';
import { IngestionController } from './ingestion.controller';
import { INGESTION_CONFIGURATION_PROVIDER } from './configuration/ingestion-configuration-provider.token';
import { SqlIngestionConfigurationProvider } from './configuration/sql-ingestion-configuration-provider.service';
import { SourceTransactionEntity } from '../database/entities/source-transaction.entity';
import { FraudTransactionEntity } from '../database/entities/fraud-transaction.entity';
import { FraudIdentifierEntity } from '../database/entities/fraud-identifier.entity';
import { FraudIngestionStateEntity } from '../database/entities/fraud-ingestion-state.entity';
import { FraudIngestionConfigEntity } from '../database/entities/fraud-ingestion-config.entity';
import { FraudModule } from '../fraud/fraud.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { BullMqModule } from './queue/bullmq/bullmq.module';

@Module({
  imports: [
    forwardRef(() => BullMqModule),
    TypeOrmModule.forFeature([SourceTransactionEntity], 'source'),
    TypeOrmModule.forFeature(
      [
        FraudTransactionEntity,
        FraudIdentifierEntity,
        FraudIngestionStateEntity,
        FraudIngestionConfigEntity,
      ],
      'fraud',
    ),
    Neo4jModule,
    FraudModule,
  ],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    NestCronJobOrchestrator,
    {
      provide: JOB_ORCHESTRATOR,
      useExisting: NestCronJobOrchestrator,
    },
    SqlIngestionConfigurationProvider,
    {
      provide: INGESTION_CONFIGURATION_PROVIDER,
      useExisting: SqlIngestionConfigurationProvider,
    },
  ],
  exports: [IngestionService, INGESTION_CONFIGURATION_PROVIDER],
})
export class IngestionModule {}
