import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

const DEFAULT_TIMEOUT_MS = 3_000;

/*
 * Health of the fraud engine, which is the BFF's only dependency.
 *
 * It asks the engine's liveness endpoint, not its readiness endpoint, and the
 * distinction matters: readiness folds in the engine's own view of SQL
 * Server, Redis and Neo4j, so reading it here would make the BFF report
 * itself unready whenever anything behind the engine was impaired. That would
 * pull the dashboard out of rotation over a Neo4j outage it could otherwise
 * ride out.
 *
 * What the BFF needs to know is narrower: can it reach the engine at all.
 */
@Injectable()
export class FraudServiceHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async check(key = 'fraudService'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const baseUrl = (
      process.env.FRAUD_SERVICE_BASE_URL ?? 'http://localhost:4000'
    ).replace(/\/+$/, '');

    const startedAt = Date.now();

    /*
     * The fetch has to be bounded by something. Without an AbortSignal a
     * connection that opens and then stalls hangs the health check, and a
     * health check that can hang is worse than none -- the probe times out
     * with no information instead of reporting a slow dependency.
     */
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/health/live`, {
        signal: abort.signal,
      });

      if (!response.ok) {
        return indicator.down({
          message: `fraud engine returned ${response.status}`,
          url: baseUrl,
        });
      }

      return indicator.up({ responseTimeMs: Date.now() - startedAt });
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : String(error),
        url: baseUrl,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
