import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GraphOutboxService } from './graph-outbox.service';

/*
 * Drains the graph outbox on a timer.
 *
 * In the normal case there is nothing to do: ingestion projects each
 * transaction into the graph itself and deletes its own outbox row. This
 * exists for the cases ingestion cannot cover -- the process dying between
 * the SQL commit and the graph write, or Neo4j being unavailable at the
 * moment the transaction arrived.
 *
 * Every thirty seconds rather than every minute because the window it closes
 * is one where FraudDb and the graph disagree, and the identifier network is
 * read by analysts while it lasts.
 */
@Injectable()
export class GraphOutboxWorker {
  private readonly logger = new Logger(GraphOutboxWorker.name);

  /*
   * A drain that overruns its interval must not have a second one started on
   * top of it. The claim query would stop the two from taking the same rows,
   * but a Neo4j outage makes every drain slow at once, which is exactly when
   * piling them up is worst.
   */
  private draining = false;

  constructor(private readonly outbox: GraphOutboxService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron(): Promise<void> {
    if (this.draining) {
      return;
    }

    this.draining = true;

    try {
      await this.outbox.drain();
    } catch (error) {
      // The outbox itself being unreachable is not a reason to stop trying;
      // the next tick is a fresh attempt.
      this.logger.error(
        `Graph outbox drain failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.draining = false;
    }
  }
}
