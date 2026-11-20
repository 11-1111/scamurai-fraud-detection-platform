import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { MetricsService } from './metrics.service';

/*
 * Times every HTTP request.
 *
 * An interceptor rather than instrumentation in each controller: there is
 * nothing per-endpoint about measuring a request, and a counter that has to
 * be added by hand is a counter that is missing from whichever endpoint was
 * written last.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      route?: { path?: string };
      url?: string;
    }>();
    const startedAt = process.hrtime.bigint();

    /*
     * The route pattern, not the URL. Labelling by URL would create a new
     * time series for every alert id anyone ever looked at, which is the
     * standard way to bring down a Prometheus server.
     */
    const method = request.method ?? 'UNKNOWN';

    const record = (status: number) => {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

      this.metrics.recordHttpRequest(
        method,
        request.route?.path ?? 'unmatched',
        status,
        durationSeconds,
      );
    };

    return next.handle().pipe(
      tap({
        next: () =>
          record(http.getResponse<{ statusCode?: number }>().statusCode ?? 200),
        // An exception filter will set the real status after this runs, so
        // the thrown status is read from the error where it has one.
        error: (error: { status?: number }) => record(error?.status ?? 500),
      }),
    );
  }
}
