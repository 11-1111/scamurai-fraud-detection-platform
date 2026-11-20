import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/*
 * Per-request context, carried without threading it through every signature.
 *
 * A correlation id is only useful if it reaches the log line, and the log
 * lines that matter are written four or five calls deep -- inside a feature
 * calculator, or the outbox drain. Passing it down by hand would mean adding
 * a parameter to every method between the controller and the thing that
 * logs, which is why it tends not to get done.
 *
 * AsyncLocalStorage is Node's own answer to this and needs no dependency: a
 * value stored before an async call is readable anywhere inside it, and each
 * concurrent request sees only its own.
 */

export type RequestContext = {
  correlationId: string;
  /*
   * Whether the id came from the caller. A request that arrives with one is
   * part of a larger trace -- usually a browser request that the BFF already
   * labelled -- and that is worth knowing when reading logs.
   */
  inherited: boolean;
};

const storage = new AsyncLocalStorage<RequestContext>();

/*
 * Accepted on the way in, echoed on the way out. x-request-id is included
 * because reverse proxies and load balancers commonly set it, and honouring
 * an id that already exists is better than minting a second one for the same
 * request.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

export function runWithRequestContext<T>(
  context: RequestContext,
  work: () => T,
): T {
  return storage.run(context, work);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function currentCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/*
 * A correlation id from the caller, or a new one.
 *
 * An inbound id is accepted as-is only if it looks like one. Anything that
 * reaches a log line from a request header is attacker-controlled, and a
 * newline in it would let a caller forge log entries -- so the shape is
 * constrained rather than trusted.
 */
export function resolveCorrelationId(
  headers: Record<string, unknown>,
): RequestContext {
  const candidate =
    firstHeaderValue(headers[CORRELATION_ID_HEADER]) ??
    firstHeaderValue(headers[REQUEST_ID_HEADER]);

  if (candidate && isAcceptableCorrelationId(candidate)) {
    return { correlationId: candidate, inherited: true };
  }

  return { correlationId: randomUUID(), inherited: false };
}

function firstHeaderValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  // A repeated header arrives as an array; the first wins.
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim() || undefined;
  }

  return undefined;
}

function isAcceptableCorrelationId(value: string): boolean {
  // Long enough to be meaningful, short enough not to bloat every log line,
  // and restricted to characters that cannot break a log format.
  return value.length <= 128 && /^[A-Za-z0-9_.:-]+$/.test(value);
}
