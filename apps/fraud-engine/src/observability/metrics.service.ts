import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from '@prometheus-io/client';

/*
 * Why a rule could not be evaluated, as a bounded set.
 *
 * A metric label with unbounded values creates a new time series per value,
 * which is the standard way to bring down a Prometheus server -- so the
 * reason is a category here and the detail stays in the log line.
 */
export type UnevaluableReason =
  'missing_feature' | 'unusable_feature' | 'bad_threshold' | 'bad_operator';

/*
 * The application's metrics, defined in one place.
 *
 * Everything else calls the methods below rather than touching the
 * Prometheus client, for the same reason the job queue hides bullmq: a metric
 * name is a contract with whatever is scraping it, and names scattered across
 * the services that happen to emit them get renamed by accident.
 *
 * Its own registry rather than the library's global one, so a test can build
 * a service, assert on it and throw it away. The global register is process
 * state, and tests that share it leak counts into each other.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  /*
   * Ingestion is the loop everything else depends on, so what matters is
   * whether a run finished and how long it took -- a run that halts partway
   * is the signal that a transaction could not be processed.
   */
  private readonly ingestionRuns: Counter<'outcome'>;
  private readonly ingestionDuration: Histogram<string>;
  private readonly transactionsIngested: Counter<string>;
  private readonly alertsCreated: Counter<string>;

  /*
   * Rules that could not be evaluated. This is the operational half of the
   * fix for a rule naming a feature that was never calculated: the engine
   * logs it once per process, which is right for a log and useless for
   * noticing a week later that a rule has been dead since a deploy.
   */
  private readonly rulesUnevaluable: Counter<'rule_code' | 'reason'>;

  /* Graph writes that FraudDb committed to and Neo4j refused. */
  private readonly graphProjectionFailures: Counter<string>;

  private readonly httpRequests: Histogram<'method' | 'route' | 'status'>;

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'scamurai_' });

    this.ingestionRuns = new Counter({
      name: 'scamurai_ingestion_runs_total',
      help: 'Ingestion runs by outcome.',
      labelNames: ['outcome'],
      registers: [this.registry],
    });

    this.ingestionDuration = new Histogram({
      name: 'scamurai_ingestion_run_duration_seconds',
      help: 'Wall time of an ingestion run.',
      // A run processes up to 500 transactions, each of which does several
      // round trips, so the interesting range is seconds to minutes.
      buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.transactionsIngested = new Counter({
      name: 'scamurai_transactions_ingested_total',
      help: 'Transactions copied from the upstream database and scored.',
      registers: [this.registry],
    });

    this.alertsCreated = new Counter({
      name: 'scamurai_alerts_created_total',
      help: 'Alerts raised by the policy engine.',
      registers: [this.registry],
    });

    this.rulesUnevaluable = new Counter({
      name: 'scamurai_rules_unevaluable_total',
      help: 'Rule evaluations skipped because the rule could not be applied.',
      labelNames: ['rule_code', 'reason'],
      registers: [this.registry],
    });

    this.graphProjectionFailures = new Counter({
      name: 'scamurai_graph_projection_failures_total',
      help: 'Failed attempts to project a transaction into the graph.',
      registers: [this.registry],
    });

    this.httpRequests = new Histogram({
      name: 'scamurai_http_request_duration_seconds',
      help: 'Duration of HTTP requests handled by this service.',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  recordIngestionRun(
    outcome: 'completed' | 'halted' | 'empty',
    durationSeconds: number,
    counts: { transactions: number; alerts: number },
  ): void {
    this.ingestionRuns.inc({ outcome });
    this.ingestionDuration.observe(durationSeconds);

    if (counts.transactions > 0) {
      this.transactionsIngested.inc(counts.transactions);
    }

    if (counts.alerts > 0) {
      this.alertsCreated.inc(counts.alerts);
    }
  }

  recordUnevaluableRule(ruleCode: string, reason: UnevaluableReason): void {
    this.rulesUnevaluable.inc({ rule_code: ruleCode, reason });
  }

  recordGraphProjectionFailure(): void {
    this.graphProjectionFailures.inc();
  }

  recordHttpRequest(
    method: string,
    route: string,
    status: number,
    durationSeconds: number,
  ): void {
    this.httpRequests.observe(
      { method, route, status: String(status) },
      durationSeconds,
    );
  }

  /*
   * Registering a gauge whose value is read at scrape time, rather than one
   * the application remembers to update. A queue depth kept in memory is
   * wrong the moment another replica changes it; asking the database when
   * asked is always right.
   */
  registerScrapeTimeGauge(
    name: string,
    help: string,
    read: () => Promise<number>,
  ): void {
    new Gauge({
      name,
      help,
      registers: [this.registry],
      async collect() {
        // `this` is the gauge: the client binds collect to the metric so it
        // can set its own value.
        this.set(await read());
      },
    });
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
