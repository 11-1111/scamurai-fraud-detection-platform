import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

import { FraudServiceClient } from './fraud-service.client';

const axiosResponse = <T>(data: T, status = 200): AxiosResponse<T> =>
  ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse['config'],
  }) as AxiosResponse<T>;

const axiosError = (
  status?: number,
  message?: string,
  code?: string,
) => {
  const err = Object.assign(new Error(message ?? 'request failed'), {
    isAxiosError: true,
    code,
    response: status
      ? { status, data: { message: message ?? 'error' } }
      : undefined,
  });
  return err;
};

describe('FraudServiceClient', () => {
  let client: FraudServiceClient;
  let httpRequest: jest.Mock;

  beforeEach(async () => {
    httpRequest = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudServiceClient,
        {
          provide: HttpService,
          useValue: { request: httpRequest },
        },
      ],
    }).compile();

    client = module.get(FraudServiceClient);
    client.onModuleInit();
  });

  it('forwards GET requests to the fraud service', async () => {
    httpRequest.mockReturnValueOnce(of(axiosResponse({ ok: true })));

    await expect(
      client.get('/fraud/alerts', { params: { page: 1, pageSize: 20 } }),
    ).resolves.toEqual({ ok: true });

    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'http://localhost:4000/fraud/alerts',
        params: { page: 1, pageSize: 20 },
      }),
    );
  });

  it('maps upstream 404 to NotFoundException', async () => {
    httpRequest.mockReturnValueOnce(
      throwError(() => axiosError(404, 'Alert not found')),
    );

    await expect(client.get('/fraud/alerts/missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps upstream timeout to GatewayTimeoutException', async () => {
    httpRequest.mockReturnValueOnce(
      throwError(() => axiosError(undefined, 'timeout', 'ECONNABORTED')),
    );

    await expect(client.get('/fraud/alerts')).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it('maps connection refusal to ServiceUnavailableException', async () => {
    httpRequest.mockReturnValueOnce(
      throwError(() => axiosError(undefined, 'ECONNREFUSED')),
    );

    await expect(client.get('/fraud/alerts')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps unexpected upstream 500 to BadGatewayException', async () => {
    httpRequest.mockReturnValueOnce(
      throwError(() => axiosError(500, 'Internal Server Error')),
    );

    await expect(client.get('/fraud/alerts')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('preserves upstream validation messages as BadRequestException', async () => {
    httpRequest.mockReturnValueOnce(
      throwError(() => axiosError(400, 'scoreImpact must be between 0 and 100')),
    );

    await expect(
      client.post('/fraud/config/rules', { body: {} }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
