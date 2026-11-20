import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  FraudGraphOutboxEntity,
  FraudGraphOutboxStatus,
} from '../database/entities/fraud-graph-outbox.entity';
import { MetricsService } from './metrics.service';

/*
 * Exposes the graph outbox depth as gauges read at scrape time.
 *
 * This is the pair to the readiness indicator. Readiness answers "is
 * something wrong now"; these answer "when did it start", which is the
 * question you actually have when an analyst reports that a network view
 * looked incomplete yesterday afternoon.
 *
 * Read on scrape rather than tracked in memory: the outbox is shared between
 * replicas, so a count this process remembers is wrong as soon as another
 * one drains a row.
 */
@Injectable()
export class OutboxGaugeRegistrar implements OnModuleInit {
  constructor(
    private readonly metrics: MetricsService,

    @InjectRepository(FraudGraphOutboxEntity, 'fraud')
    private readonly outboxRepo: Repository<FraudGraphOutboxEntity>,
  ) {}

  onModuleInit(): void {
    this.metrics.registerScrapeTimeGauge(
      'scamurai_graph_outbox_pending',
      'Graph writes committed to FraudDb and not yet applied to the graph.',
      () => this.countByStatus(FraudGraphOutboxStatus.PENDING),
    );

    this.metrics.registerScrapeTimeGauge(
      'scamurai_graph_outbox_failed',
      'Graph writes that exhausted their retries and need attention.',
      () => this.countByStatus(FraudGraphOutboxStatus.FAILED),
    );
  }

  /*
   * A scrape must not fail because the database is briefly unreachable: a
   * monitoring endpoint that errors during an incident is useless exactly
   * when it is needed. An unknown count reports as zero, and the readiness
   * endpoint is what says the database cannot be reached.
   */
  private async countByStatus(status: FraudGraphOutboxStatus): Promise<number> {
    try {
      return await this.outboxRepo.count({ where: { status } });
    } catch {
      return 0;
    }
  }
}
