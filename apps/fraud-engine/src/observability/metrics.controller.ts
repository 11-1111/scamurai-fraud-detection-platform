import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { MetricsService } from './metrics.service';

/*
 * The Prometheus scrape endpoint.
 *
 * Excluded from the API documentation on purpose: it is not part of the
 * product's API, and its format is defined by Prometheus rather than by this
 * service.
 *
 * It is also deliberately unauthenticated and deliberately not proxied. The
 * Apache vhost in infra/apache routes the dashboard and the BFF and nothing
 * else, so this is reachable only from inside the deployment -- which is
 * where a scraper lives. Metrics name internal structure and volumes, so
 * exposing them publicly would be a quiet information leak.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async scrape(): Promise<string> {
    return this.metrics.metrics();
  }
}
