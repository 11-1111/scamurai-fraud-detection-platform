import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { LessThan, Repository } from 'typeorm';

import {
  FraudGraphOutboxEntity,
  FraudGraphOutboxStatus,
} from '../database/entities/fraud-graph-outbox.entity';
import { OUTBOX_STALE_AFTER_MS, classifyOutboxCounts } from './outbox-status';

/*
 * Depth of the graph outbox.
 *
 * This is the one indicator that reports on correctness rather than
 * reachability. A healthy outbox is almost always empty; a backlog means
 * FraudDb and the graph are drifting apart, and parked rows mean writes have
 * been given up on and are waiting for a person.
 *
 * Neither of those shows up in a connectivity check: every store can answer
 * a ping while the two of them steadily disagree.
 */
@Injectable()
export class GraphOutboxHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,

    @InjectRepository(FraudGraphOutboxEntity, 'fraud')
    private readonly outboxRepo: Repository<FraudGraphOutboxEntity>,
  ) {}

  async check(key = 'graphOutbox'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const [pending, stale, failed] = await Promise.all([
        this.outboxRepo.count({
          where: { status: FraudGraphOutboxStatus.PENDING },
        }),
        this.outboxRepo.count({
          where: {
            status: FraudGraphOutboxStatus.PENDING,
            createdAt: LessThan(new Date(Date.now() - OUTBOX_STALE_AFTER_MS)),
          },
        }),
        this.outboxRepo.count({
          where: { status: FraudGraphOutboxStatus.FAILED },
        }),
      ]);

      const outcome = classifyOutboxCounts({ pending, stale, failed });

      return outcome.status === 'up'
        ? indicator.up(outcome.data)
        : indicator.degraded(outcome.data);
    } catch (error) {
      // Counting failed, which means FraudDb is the problem rather than the
      // outbox. The database indicator will say so; this one only reports
      // that it could not tell.
      return indicator.degraded({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
