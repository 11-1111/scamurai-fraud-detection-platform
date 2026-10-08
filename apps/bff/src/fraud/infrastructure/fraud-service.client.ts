import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios, { AxiosRequestConfig } from 'axios';

import {
  createFraudServiceConfig,
  FraudServiceConfig,
} from '../../config/fraud-service.config';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  params?: Record<string, unknown>;
  body?: unknown;
  timeoutMs?: number;
}

@Injectable()
export class FraudServiceClient implements OnModuleInit {
  private readonly logger = new Logger(FraudServiceClient.name);
  private config!: FraudServiceConfig;

  constructor(private readonly http: HttpService) {}

  onModuleInit(): void {
    this.config = createFraudServiceConfig();
    this.logger.log(
      `Fraud service client configured baseUrl=${this.config.baseUrl}`,
    );
  }

  getBaseUrl(): string {
    if (!this.config) {
      this.config = createFraudServiceConfig();
    }
    return this.config.baseUrl;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const start = Date.now();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.getBaseUrl()}${normalizedPath}`;

    this.logger.log(`Outgoing ${method} ${normalizedPath}`);

    const axiosConfig: AxiosRequestConfig = {
      method,
      url,
      params: options.params,
      data: options.body,
      timeout: options.timeoutMs ?? this.config.requestTimeoutMs,
    };

    try {
      const response = await firstValueFrom(this.http.request<T>(axiosConfig));
      this.logger.log(
        `${method} ${normalizedPath} status=${response.status} latency=${Date.now() - start}ms`,
      );
      return response.data;
    } catch (error) {
      return this.handleError(method, normalizedPath, Date.now() - start, error);
    }
  }

  private handleError(
    method: HttpMethod,
    path: string,
    latencyMs: number,
    error: unknown,
  ): never {
    this.logger.error(
      `${method} ${path} failed latency=${latencyMs}ms`,
      error instanceof Error ? error.message : String(error),
    );

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException('Fraud service request timed out.');
      }

      if (!error.response) {
        throw new ServiceUnavailableException('Fraud service unavailable.');
      }

      const { status, data } = error.response;
      const upstreamMessage = this.extractMessage(data);

      if (status === 404) {
        throw new NotFoundException(upstreamMessage ?? 'Resource not found.');
      }

      if (status === 400 || status === 422) {
        throw new BadRequestException(upstreamMessage ?? 'Validation error.');
      }

      throw new BadGatewayException('Fraud service returned an unexpected error.');
    }

    throw new BadGatewayException('Fraud service unavailable.');
  }

  private extractMessage(data: unknown): string | string[] | undefined {
    if (data == null || typeof data !== 'object') {
      return undefined;
    }

    const message = (data as { message?: string | string[] }).message;
    return message;
  }
}
