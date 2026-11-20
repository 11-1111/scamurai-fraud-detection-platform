import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { FraudServiceHealthIndicator } from './fraud-service.health';

/*
 * Liveness and readiness, kept separate for the same reason as in the fraud
 * engine: a liveness probe that fails during a dependency outage turns that
 * outage into a restart loop.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly fraudService: FraudServiceHealthIndicator,
  ) {}

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Reports that the process is serving. Checks nothing external, so a ' +
      'dependency outage cannot cause a restart.',
  })
  live(): { status: string; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Reports whether the fraud engine is reachable. The BFF proxies every ' +
      'request to it, so there is nothing to serve without it.',
  })
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.fraudService.check()]);
  }
}
