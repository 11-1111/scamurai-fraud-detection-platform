import { MetricsService } from './metrics.service';

/*
 * Metrics.
 *
 * The service owns its own registry rather than the client's global one,
 * which is what makes these tests possible: each builds a service, asserts on
 * its output and discards it. Sharing the global register would leak counts
 * between tests and make them order-dependent.
 *
 * What is asserted is the scrape output rather than the calls, because the
 * metric names and labels are the contract with whatever is scraping. A
 * renamed metric is a broken dashboard, and only the rendered output shows
 * that.
 */

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('exposes the Prometheus text format', async () => {
    const scrape = await metrics.metrics();

    expect(metrics.contentType).toContain('text/plain');
    // Default process metrics, prefixed so they cannot collide with another
    // service scraped by the same server.
    expect(scrape).toContain('scamurai_process_cpu_user_seconds_total');
  });

  it('records an ingestion run with its outcome and duration', async () => {
    metrics.recordIngestionRun('completed', 2.5, {
      transactions: 500,
      alerts: 12,
    });

    const scrape = await metrics.metrics();

    expect(scrape).toContain(
      'scamurai_ingestion_runs_total{outcome="completed"} 1',
    );
    expect(scrape).toContain('scamurai_transactions_ingested_total 500');
    expect(scrape).toContain('scamurai_alerts_created_total 12');
    expect(scrape).toContain('scamurai_ingestion_run_duration_seconds_count 1');
  });

  it('distinguishes a halted run from a completed one', async () => {
    // A run that stops partway is the signal that a transaction could not be
    // processed, and it must not be indistinguishable from success.
    metrics.recordIngestionRun('completed', 1, { transactions: 10, alerts: 0 });
    metrics.recordIngestionRun('halted', 0.5, { transactions: 3, alerts: 0 });

    const scrape = await metrics.metrics();

    expect(scrape).toContain(
      'scamurai_ingestion_runs_total{outcome="completed"} 1',
    );
    expect(scrape).toContain(
      'scamurai_ingestion_runs_total{outcome="halted"} 1',
    );
  });

  it('does not emit zero counts for a run that ingested nothing', async () => {
    metrics.recordIngestionRun('empty', 0.1, { transactions: 0, alerts: 0 });

    const scrape = await metrics.metrics();

    // The run is still counted; the totals are simply not incremented, so a
    // rate over them reflects real work rather than polling.
    expect(scrape).toContain(
      'scamurai_ingestion_runs_total{outcome="empty"} 1',
    );
    expect(scrape).not.toContain('scamurai_transactions_ingested_total 1');
  });

  it('counts unevaluable rules by rule and reason', async () => {
    // The operational half of a rule naming a feature that was never
    // calculated: the engine logs it once per process, which is useless for
    // noticing weeks later that a rule has been dead since a deploy.
    metrics.recordUnevaluableRule('DEVICE_MULTI_EMAIL', 'missing_feature');
    metrics.recordUnevaluableRule('DEVICE_MULTI_EMAIL', 'missing_feature');
    metrics.recordUnevaluableRule('PAYMENT_MULTI_EMAIL', 'bad_operator');

    const scrape = await metrics.metrics();

    expect(scrape).toContain(
      'scamurai_rules_unevaluable_total{rule_code="DEVICE_MULTI_EMAIL",reason="missing_feature"} 2',
    );
    expect(scrape).toContain(
      'scamurai_rules_unevaluable_total{rule_code="PAYMENT_MULTI_EMAIL",reason="bad_operator"} 1',
    );
  });

  it('labels HTTP requests by route pattern, never by URL', async () => {
    metrics.recordHttpRequest('GET', '/fraud/alerts/:id', 200, 0.042);

    const scrape = await metrics.metrics();

    expect(scrape).toContain('route="/fraud/alerts/:id"');
    expect(scrape).toContain('status="200"');
  });

  it('reads a scrape-time gauge when scraped, not when registered', async () => {
    let reads = 0;
    metrics.registerScrapeTimeGauge(
      'scamurai_test_depth',
      'Test gauge.',
      () => {
        reads += 1;
        return Promise.resolve(reads * 7);
      },
    );

    // Registering must not read: the value would be stale by the first
    // scrape, and a shared queue depth this process remembers is wrong as
    // soon as another replica changes it.
    expect(reads).toBe(0);

    expect(await metrics.metrics()).toContain('scamurai_test_depth 7');
    expect(await metrics.metrics()).toContain('scamurai_test_depth 14');
    expect(reads).toBe(2);
  });

  it('counts graph projection failures', async () => {
    metrics.recordGraphProjectionFailure();

    expect(await metrics.metrics()).toContain(
      'scamurai_graph_projection_failures_total 1',
    );
  });
});
