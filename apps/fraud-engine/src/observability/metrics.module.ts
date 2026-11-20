import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FraudGraphOutboxEntity } from '../database/entities/fraud-graph-outbox.entity';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { OutboxGaugeRegistrar } from './outbox-gauges';

@Module({
  imports: [TypeOrmModule.forFeature([FraudGraphOutboxEntity], 'fraud')],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    OutboxGaugeRegistrar,
    {
      // Applied globally, so a new controller is measured without anyone
      // remembering to add anything.
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
