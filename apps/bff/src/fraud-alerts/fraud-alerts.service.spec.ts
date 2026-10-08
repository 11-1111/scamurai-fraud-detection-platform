import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FraudAlertsService } from './fraud-alerts.service';
import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';

describe('FraudAlertsService', () => {
  let service: FraudAlertsService;
  let fraudClient: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
  };

  beforeEach(async () => {
    fraudClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudAlertsService,
        { provide: FraudServiceClient, useValue: fraudClient },
      ],
    }).compile();

    service = module.get(FraudAlertsService);
  });

  it('forwards alert list query params unchanged', async () => {
    fraudClient.get.mockResolvedValueOnce({
      page: 1,
      pageSize: 20,
      total: 1,
      alerts: [
        {
          id: 'alert-1',
          transactionId: 'tx-1',
          rootIdentifier: { type: 'email', value: 'a@example.com' },
          riskScore: 80,
          riskLevel: 'HIGH',
          finalDecision: 'MANUAL_REVIEW',
          highestSeverity: 'HIGH',
          alertStatus: 'OPEN',
          createdAt: '2026-08-03T10:00:00.000Z',
        },
      ],
    });

    const result = await service.getAlerts({
      page: 1,
      pageSize: 20,
      status: 'OPEN',
    });

    expect(fraudClient.get).toHaveBeenCalledWith('/fraud/alerts', {
      params: { page: 1, pageSize: 20, status: 'OPEN' },
    });
    expect(result.alerts[0].fraudTransactionId).toBe('tx-1');
  });

  it('wraps alert detail in a stable envelope', async () => {
    fraudClient.get.mockResolvedValueOnce({
      id: 'alert-1',
      transactionId: 'tx-1',
      rootIdentifier: { type: 'email', value: 'a@example.com' },
      riskScore: 80,
      riskLevel: 'HIGH',
      finalDecision: 'MANUAL_REVIEW',
      alertStatus: 'OPEN',
      createdAt: '2026-08-03T10:00:00.000Z',
      features: {},
      relatedIdentifiers: {},
      graph: { nodes: [], edges: [] },
      triggeredRules: [],
      policyActions: [],
      reasons: [],
      notes: [],
      history: [],
    });

    const result = await service.getAlert('alert-1');
    expect(result.alert.id).toBe('alert-1');
  });

  it('propagates NotFoundException from the client', async () => {
    fraudClient.get.mockRejectedValueOnce(new NotFoundException('Alert not found.'));

    await expect(service.getAlert('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('propagates ServiceUnavailableException from the client', async () => {
    fraudClient.get.mockRejectedValueOnce(
      new ServiceUnavailableException('Fraud service unavailable.'),
    );

    await expect(service.getAlerts({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('propagates BadGatewayException from the client', async () => {
    fraudClient.get.mockRejectedValueOnce(
      new BadGatewayException('Fraud service returned an unexpected error.'),
    );

    await expect(service.getAlerts({})).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
