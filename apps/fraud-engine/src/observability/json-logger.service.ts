import { ConsoleLogger, LoggerService, LogLevel } from '@nestjs/common';

import { currentRequestContext } from './request-context';

/*
 * One JSON object per line, rather than Nest's default coloured text.
 *
 * Text logs are pleasant to read and useless to query. "Show me every error
 * for this correlation id" is a filter over fields if the fields exist, and a
 * regular expression over prose if they do not -- and the prose changes
 * whenever someone edits a message.
 *
 * Each line carries the correlation id of the request it belongs to, taken
 * from the request context rather than passed in, so a log line written deep
 * inside a feature calculator is attributable without that calculator
 * knowing anything about requests.
 */

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  verbose: 10,
  debug: 20,
  log: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/*
 * Keys whose values are never written, wherever they appear in structured
 * data. Nothing should be passing a password to a logger, but a logger that
 * would print one if handed it is one careless call away from writing
 * credentials to a log aggregator, from which they are very hard to remove.
 */
const REDACTED_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'apikey',
  'cookie',
  'connectionstring',
]);

const REDACTED = '[redacted]';

export type JsonLoggerOptions = {
  /** Minimum level written. Anything below it is dropped. */
  level?: LogLevel;
  service?: string;
  /** Where lines go. Injectable so tests can capture them. */
  write?: (line: string) => void;
};

export class JsonLogger implements LoggerService {
  private readonly minSeverity: number;
  private readonly service: string;
  private readonly write: (line: string) => void;

  constructor(options: JsonLoggerOptions = {}) {
    const level = options.level ?? resolveLevelFromEnv();
    this.minSeverity = LEVEL_SEVERITY[level];
    this.service = options.service ?? 'fraud-engine';
    this.write = options.write ?? ((line) => process.stdout.write(`${line}\n`));
  }

  log(message: unknown, ...rest: unknown[]): void {
    this.emit('log', message, rest);
  }

  error(message: unknown, ...rest: unknown[]): void {
    this.emit('error', message, rest);
  }

  warn(message: unknown, ...rest: unknown[]): void {
    this.emit('warn', message, rest);
  }

  debug(message: unknown, ...rest: unknown[]): void {
    this.emit('debug', message, rest);
  }

  verbose(message: unknown, ...rest: unknown[]): void {
    this.emit('verbose', message, rest);
  }

  fatal(message: unknown, ...rest: unknown[]): void {
    this.emit('fatal', message, rest);
  }

  private emit(level: LogLevel, message: unknown, rest: unknown[]): void {
    if (LEVEL_SEVERITY[level] < this.minSeverity) {
      return;
    }

    /*
     * Nest passes the context as the last string argument and a stack as an
     * extra one, which is why these are pulled out positionally rather than
     * being named parameters.
     */
    const { context, extras } = splitRest(rest);
    const requestContext = currentRequestContext();

    const line: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message: stringifyMessage(message),
    };

    if (context) {
      line.context = context;
    }

    if (requestContext) {
      line.correlationId = requestContext.correlationId;
    }

    if (extras.length > 0) {
      line.details = extras.map((extra) => redact(extra));
    }

    this.write(safeStringify(line));
  }
}

/*
 * LOG_LEVEL rather than a hardcoded level, defaulting to log: debug lines in
 * this service include per-identifier detail for every transaction, which is
 * useful when chasing something and ruinous as a default at volume.
 */
function resolveLevelFromEnv(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();

  if (configured && configured in LEVEL_SEVERITY) {
    return configured as LogLevel;
  }

  return 'log';
}

function splitRest(rest: unknown[]): { context?: string; extras: unknown[] } {
  if (rest.length === 0) {
    return { extras: [] };
  }

  const last = rest[rest.length - 1];

  if (typeof last === 'string' && !last.includes('\n')) {
    return { context: last, extras: rest.slice(0, -1) };
  }

  return { extras: rest };
}

function stringifyMessage(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }

  if (message instanceof Error) {
    return message.message;
  }

  return safeStringify(message);
}

function redact(value: unknown, depth = 0): unknown {
  // Bounded depth: a logger must not be the thing that stack-overflows on a
  // deeply nested object.
  if (depth > 6 || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? REDACTED
      : redact(entry, depth + 1);
  }

  return out;
}

/*
 * A circular reference must not take the process down. Logging is the thing
 * you reach for when something is already wrong, so it has to be the part
 * that cannot itself throw.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    return (
      JSON.stringify(value, (_key, entry: unknown) => {
        if (entry !== null && typeof entry === 'object') {
          if (seen.has(entry)) {
            return '[circular]';
          }
          seen.add(entry);
        }
        return entry;
      }) ?? 'null'
    );
  } catch {
    return JSON.stringify({ message: '[unserializable log entry]' });
  }
}

/*
 * Kept so a developer can opt back into readable output locally:
 * LOG_FORMAT=text uses Nest's own logger instead.
 */
export function createLogger(service: string): LoggerService {
  if (process.env.LOG_FORMAT?.trim().toLowerCase() === 'text') {
    return new ConsoleLogger(service);
  }

  return new JsonLogger({ service });
}
