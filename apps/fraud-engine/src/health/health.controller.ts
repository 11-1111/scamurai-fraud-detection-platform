import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';

import { GraphOutboxHealthIndicator } from './graph-outbox.health';
import { Neo4jHealthIndicator } from './neo4j.health';
import { JobQueueHealthIndicator } from './job-queue.health';

/*
 * Two endpoints, because liveness and readiness answer different questions
 * and conflating them is how a cluster restarts a service that was only
 * waiting for its database.
 *
 *   /health/live   is this process working?       Restart it if not.
 *   /health/ready  can it do its job right now?   Stop sending it work if not.
 *
 * Liveness checks nothing external on purpose. A database outage is not a
 * reason to kill a healthy process, and a liveness probe that fails during
 * one turns a dependency outage into a restart loop that makes recovery
 * slower.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,

    @InjectDataSource('fraud')
    private readonly fraudDataSource: DataSource,

    @InjectDataSource('source')
    private readonly sourceDataSource: DataSource,

    private readonly jobQueue: JobQueueHealthIndicator,
    private readonly neo4j: Neo4jHealthIndicator,
    private readonly graphOutbox: GraphOutboxHealthIndicator,
  ) {}

  @Get('live')
  live(): { status: string; uptimeSeconds: number } {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  /*
   * Which dependency is allowed to fail readiness is a judgement about what
   * this service is for, not a formality:
   *
   *   fraudDb   down     every endpoint reads it, so there is nothing to serve
   *   sourceDb  degraded only ingestion reads it; alerts still serve
   *   jobQueue  degraded only polls need it; reads still serve
   *   neo4j     degraded costs network views; the outbox keeps the writes
   *   outbox    degraded reports drift between FraudDb and the graph
   *
   * A degraded indicator keeps the overall response at 200, so the service
   * stays in rotation while saying plainly what it cannot currently do.
   */
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.typeOrm
          .pingCheck('fraudDb', { connection: this.fraudDataSource })
          .withTimeout(3_000),
      async () => {
        /*
         * The upstream database is read only by ingestion, so its being
         * unreachable must not take the service out of rotation.
         */
        try {
          return await this.typeOrm
            .pingCheck('sourceDb', { connection: this.sourceDataSource })
            .withTimeout(3_000);
        } catch {
          return {
            sourceDb: {
              status: 'degraded' as const,
              message: 'upstream transactions database is unreachable',
              impact: 'no new transactions can be ingested',
            },
          };
        }
      },
      () => this.jobQueue.check(),
      () => this.neo4j.check(),
      () => this.graphOutbox.check(),
    ]);
  }
}
