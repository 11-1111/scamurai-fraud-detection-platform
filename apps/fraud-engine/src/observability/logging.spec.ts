import { JsonLogger } from './json-logger.service';
import {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  currentCorrelationId,
  resolveCorrelationId,
  runWithRequestContext,
} from './request-context';

/*
 * Structured logging and request correlation.
 *
 * The behaviour worth pinning is not that a logger logs, but the three
 * things that make a log searchable: every line is valid JSON, every line
 * inside a request carries that request's id, and nothing a caller controls
 * can distort either.
 */

function captureLogger(level?: Parameters<typeof JsonLogger>[0]) {
  const lines: Record<string, unknown>[] = [];
  const logger = new JsonLogger({
    ...level,
    write: (line) => lines.push(JSON.parse(line) as Record<string, unknown>),
  });

  return { logger, lines };
}

describe('resolveCorrelationId', () => {
  it('mints an id when the caller sends none', () => {
    const context = resolveCorrelationId({});

    expect(context.correlationId).toHaveLength(36);
    expect(context.inherited).toBe(false);
  });

  it('honours an id the caller already has', () => {
    const context = resolveCorrelationId({
      [CORRELATION_ID_HEADER]: 'abc-123',
    });

    expect(context).toEqual({ correlationId: 'abc-123', inherited: true });
  });

  it('accepts x-request-id, which proxies commonly set', () => {
    // Minting a second id for a request that already has one makes the two
    // halves of the same trace unjoinable.
    const context = resolveCorrelationId({
      [REQUEST_ID_HEADER]: 'proxy-generated-id',
    });

    expect(context.correlationId).toBe('proxy-generated-id');
  });

  it('prefers the correlation header over the request header', () => {
    const context = resolveCorrelationId({
      [CORRELATION_ID_HEADER]: 'ours',
      [REQUEST_ID_HEADER]: 'theirs',
    });

    expect(context.correlationId).toBe('ours');
  });

  it('takes the first value of a repeated header', () => {
    const context = resolveCorrelationId({
      [CORRELATION_ID_HEADER]: ['first', 'second'],
    });

    expect(context.correlationId).toBe('first');
  });

  it.each([
    ['a newline', 'abc\ndef'],
    ['a carriage return', 'abc\r\nlevel":"error'],
    ['a quote', 'abc"def'],
    ['a space', 'abc def'],
    ['an empty value', ''],
  ])('refuses an id containing %s', (_label, value) => {
    /*
     * Anything reaching a log line from a request header is
     * attacker-controlled. A newline would let a caller append their own
     * forged entries, so the shape is constrained rather than trusted.
     */
    const context = resolveCorrelationId({ [CORRELATION_ID_HEADER]: value });

    expect(context.inherited).toBe(false);
    expect(context.correlationId).not.toContain('\n');
  });

  it('refuses an id long enough to bloat every line', () => {
    const context = resolveCorrelationId({
      [CORRELATION_ID_HEADER]: 'x'.repeat(500),
    });

    expect(context.inherited).toBe(false);
  });
});

describe('request context', () => {
  it('is readable from inside asynchronous work', async () => {
    const seen = await runWithRequestContext(
      { correlationId: 'deep-id', inherited: false },
      async () => {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 1));
        // The point of AsyncLocalStorage: a log line written four calls deep
        // is attributable without any signature mentioning requests.
        return currentCorrelationId();
      },
    );

    expect(seen).toBe('deep-id');
  });

  it('keeps concurrent requests separate', async () => {
    const run = (id: string) =>
      runWithRequestContext(
        { correlationId: id, inherited: false },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return currentCorrelationId();
        },
      );

    expect(await Promise.all([run('a'), run('b'), run('c')])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('is absent outside a request', () => {
    // Background work -- the outbox drain, a cron tick -- has no request, and
    // must log without one rather than inventing a misleading id.
    expect(currentCorrelationId()).toBeUndefined();
  });
});

describe('JsonLogger', () => {
  it('writes one JSON object per line', () => {
    const { logger, lines } = captureLogger();

    logger.log('Ingestion finished', 'IngestionService');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'log',
      service: 'fraud-engine',
      message: 'Ingestion finished',
      context: 'IngestionService',
    });
    expect(typeof lines[0].timestamp).toBe('string');
  });

  it('stamps the correlation id of the surrounding request', () => {
    const { logger, lines } = captureLogger();

    runWithRequestContext(
      { correlationId: 'trace-me', inherited: true },
      () => {
        logger.warn('Rule skipped', 'RulesEngine');
      },
    );

    expect(lines[0].correlationId).toBe('trace-me');
  });

  it('omits the correlation id outside a request', () => {
    const { logger, lines } = captureLogger();

    logger.log('Draining outbox');

    expect(lines[0]).not.toHaveProperty('correlationId');
  });

  it('drops lines below the configured level', () => {
    const { logger, lines } = captureLogger({ level: 'warn' });

    logger.debug('noisy');
    logger.log('ordinary');
    logger.warn('worth knowing');
    logger.error('broken');

    expect(lines.map((line) => line.level)).toEqual(['warn', 'error']);
  });

  it('redacts sensitive keys wherever they appear', () => {
    const { logger, lines } = captureLogger();

    logger.error('Connection failed', {
      host: 'sqlserver',
      password: 'hunter2',
      nested: { apiKey: 'sk-live-123', retries: 2 },
    });

    const details = JSON.stringify(lines[0].details);

    // Nothing should pass a password to a logger, but a logger that would
    // print one is one careless call from writing credentials somewhere they
    // are very hard to remove from.
    expect(details).not.toContain('hunter2');
    expect(details).not.toContain('sk-live-123');
    expect(details).toContain('[redacted]');
    expect(details).toContain('sqlserver');
    expect(details).toContain('2');
  });

  it('survives a circular reference', () => {
    const { logger, lines } = captureLogger();
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;

    // Logging is what you reach for when something is already wrong, so it
    // must be the part that cannot itself throw.
    expect(() => logger.error('Bad state', circular)).not.toThrow();
    expect(lines).toHaveLength(1);
  });

  it('records an error with its stack', () => {
    const { logger, lines } = captureLogger();

    logger.error('Ingestion stopped', new Error('neo4j unavailable'));

    const details = JSON.stringify(lines[0].details);
    expect(details).toContain('neo4j unavailable');
    expect(details).toContain('stack');
  });
});
