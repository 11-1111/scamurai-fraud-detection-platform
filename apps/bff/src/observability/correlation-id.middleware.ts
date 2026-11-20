import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
  runWithRequestContext,
} from './request-context';

/*
 * Opens a request context for every request and labels the response with it.
 *
 * Middleware rather than an interceptor, because middleware runs before
 * guards, pipes and interceptors -- so a validation failure is logged with
 * the same correlation id as the request that caused it. An interceptor
 * would miss exactly the requests most worth tracing.
 *
 * The id is echoed on the response so a caller can quote it. That is the
 * difference between "the dashboard was slow at about three" and a single
 * line to grep for.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const context = resolveCorrelationId(request.headers);

    response.setHeader(CORRELATION_ID_HEADER, context.correlationId);

    runWithRequestContext(context, () => next());
  }
}
