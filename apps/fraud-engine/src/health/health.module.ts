import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FraudGraphOutboxEntity } from '../database/entities/fraud-graph-outbox.entity';
import { BullMqModule } from '../ingestion/queue/bullmq/bullmq.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { GraphOutboxHealthIndicator } from './graph-outbox.health';
import { HealthController } from './health.controller';
import { Neo4jHealthIndicator } from './neo4j.health';
import { JobQueueHealthIndicator } from './job-queue.health';

@Module({
  imports: [
    TerminusModule,
    Neo4jModule,
    // The queue-broker indicator asks the JobQueue port, which BullMqModule
    // provides; it never touches the driver itself.
    forwardRef(() => BullMqModule),
    TypeOrmModule.forFeature([FraudGraphOutboxEntity], 'fraud'),
  ],
  controllers: [HealthController],
  providers: [
    JobQueueHealthIndicator,
    Neo4jHealthIndicator,
    GraphOutboxHealthIndicator,
  ],
})
export class HealthModule {}
