import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { Neo4jService } from '../neo4j/neo4j.service';

/*
 * Health of the identifier graph.
 *
 * Reported as degraded rather than down when it is unreachable, which is a
 * deliberate statement about what the engine needs in order to be useful.
 * Losing the graph costs the network view and the relationship features;
 * ingestion continues, because the graph write is recorded in the outbox and
 * applied when Neo4j returns, and every relational feature still works.
 *
 * Marking it down would take the service out of rotation over a dependency
 * most of its endpoints never touch.
 */
@Injectable()
export class Neo4jHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly neo4jService: Neo4jService,
  ) {}

  async check(key = 'neo4j'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const startedAt = Date.now();

    try {
      // A server-side timeout as well as the client-side one: an unreachable
      // Neo4j and a hung Neo4j should both fail fast here.
      await this.neo4jService.run('RETURN 1', {}, { timeout: 2_000 });

      return indicator.up({ responseTimeMs: Date.now() - startedAt });
    } catch (error) {
      return indicator.degraded({
        message: error instanceof Error ? error.message : String(error),
        impact: 'network views and relationship features are unavailable',
      });
    }
  }
}
