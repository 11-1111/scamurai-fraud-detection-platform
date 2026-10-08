import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

import { TransactionsService } from './transactions.service';
import { BackendResponse } from './types/backend.types';
import { FraudProfile } from './dto/fraud-profile.dto';
import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let httpGet: jest.Mock;
  let fraudClientGet: jest.Mock;

  const mockBackendResponse: BackendResponse = {
    total_transactions: 1,
    transactions: [
      {
        date: '2024-01-01',
        paymentAccount: 'acc-123',
        confirmation_code: 'CONF1',
        merchant: { name: 'Test Merchant' },
        amount: { value: '100.00', currency: 'USD' },
        status: { text: 'Approved', type: 'success' },
        customer: {
          email: 'mark.feldman@gmail.com',
          phone: '+15551234567',
          ipAddress: '192.168.1.1',
        },
        deviceFingerprint: 'fp-abc',
      },
    ],
  };

  const mockFraudProfile = {
    features: {
      emailCount: 1,
      uniqueIpsLinked: 6,
      transactionCount: 10,
    },
    riskScore: 87,
    riskLevel: 'HIGH',
    defaultDecision: 'MANUAL_REVIEW',
    decision: 'MANUAL_REVIEW',
    displayColor: 'orange',
    policyActions: [
      {
        policyCode: 'EMAIL_MANY_IPS_REVIEW',
        policyName: 'Review emails linked to many IPs',
        decision: 'MANUAL_REVIEW',
        actionLabel:
          'Send to fraud analyst because email is linked to more than 5 IP addresses.',
        priority: 85,
      },
    ],
    relatedIdentifiers: {
      emails: [{ value: 'other@example.com', count: 2 }],
    },
    graph: {
      nodes: [{ id: 'n1', label: 'mark.feldman@gmail.com', type: 'email' }],
      edges: [],
    },
    triggeredRules: [
      {
        ruleCode: 'EMAIL_MANY_IPS',
        ruleName: 'Email linked to many IP addresses',
        severity: 'HIGH',
        scoreImpact: 25,
        message:
          'Rule EMAIL_MANY_IPS triggered because uniqueIpsLinked value 6 > threshold 5.',
        featureName: 'uniqueIpsLinked',
        featureValue: 6,
        operator: '>',
        thresholdValue: 5,
      },
    ],
    reasons: ['High IP diversity'],
  };

  beforeEach(async () => {
    httpGet = jest.fn();
    fraudClientGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: HttpService,
          useValue: { get: httpGet },
        },
        {
          provide: FraudServiceClient,
          useValue: { get: fraudClientGet },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectFraudIdentifier', () => {
    const detect = (query: Record<string, unknown>) =>
      (
        service as unknown as {
          detectFraudIdentifier: (
            q: Record<string, unknown>,
          ) => { type: string; value: string } | null;
        }
      ).detectFraudIdentifier(query);

    it('returns email for CustomerEmail', () => {
      expect(detect({ CustomerEmail: 'mark.feldman@gmail.com' })).toEqual({
        type: 'email',
        value: 'mark.feldman@gmail.com',
      });
    });

    it('returns ip for IpAddress', () => {
      expect(detect({ IpAddress: '192.168.1.1' })).toEqual({
        type: 'ip',
        value: '192.168.1.1',
      });
    });

    it('returns ip for IPAddress', () => {
      expect(detect({ IPAddress: '10.0.0.1' })).toEqual({
        type: 'ip',
        value: '10.0.0.1',
      });
    });

    it('returns payment_account for PaymentAccount', () => {
      expect(detect({ PaymentAccount: 'acc-123' })).toEqual({
        type: 'payment_account',
        value: 'acc-123',
      });
    });

    it('returns fingerprint for DeviceFingerprint', () => {
      expect(detect({ DeviceFingerprint: 'fp-abc-123' })).toEqual({
        type: 'fingerprint',
        value: 'fp-abc-123',
      });
    });

    it('returns order_tracking_id for OrderTrackingId', () => {
      expect(detect({ OrderTrackingId: 'ORD-999' })).toEqual({
        type: 'order_tracking_id',
        value: 'ORD-999',
      });
    });

    it('returns bank_auth_code for BankAuthCode', () => {
      expect(detect({ BankAuthCode: 'AUTH123' })).toEqual({
        type: 'bank_auth_code',
        value: 'AUTH123',
      });
    });

    it('returns merchant_email for MerchantEmail', () => {
      expect(detect({ MerchantEmail: 'merchant@shop.com' })).toEqual({
        type: 'merchant_email',
        value: 'merchant@shop.com',
      });
    });

    it('returns merchant_name for Merchant', () => {
      expect(detect({ Merchant: 'Acme Store' })).toEqual({
        type: 'merchant_name',
        value: 'Acme Store',
      });
    });

    it('returns null when no supported identifier exists', () => {
      expect(detect({ page: '1', pageSize: '20' })).toBeNull();
    });

    it('returns first matching identifier in priority order', () => {
      expect(
        detect({
          CustomerEmail: 'a@example.com',
          Phone: '+15551234567',
        }),
      ).toEqual({
        type: 'email',
        value: 'a@example.com',
      });
    });

    it('ignores empty and whitespace-only values', () => {
      expect(detect({ CustomerEmail: '   ' })).toBeNull();
      expect(detect({ CustomerEmail: '' })).toBeNull();
    });
  });

  describe('normalizeFraudProfile', () => {
    const normalize = (input: unknown) =>
      (
        service as unknown as {
          normalizeFraudProfile: (i: unknown) => FraudProfile | null;
        }
      ).normalizeFraudProfile(input);

    it('returns null for null/undefined input', () => {
      expect(normalize(null)).toBeNull();
      expect(normalize(undefined)).toBeNull();
    });

    it('fills missing features with {}', () => {
      const result = normalize({ decision: 'ALLOW' });
      expect(result?.features).toEqual({});
    });

    it('fills missing policyActions with []', () => {
      const result = normalize({ decision: 'ALLOW' });
      expect(result?.policyActions).toEqual([]);
    });

    it('fills missing related identifier groups with []', () => {
      const result = normalize({ decision: 'ALLOW' });
      expect(result?.relatedIdentifiers).toEqual({
        emails: [],
        phones: [],
        ips: [],
        paymentAccounts: [],
        fingerprints: [],
        merchants: [],
        confirmationCodes: [],
        orderTrackingIds: [],
        bankAuthCodes: [],
      });
    });

    it('fills missing graph with { nodes: [], edges: [] }', () => {
      const result = normalize({ decision: 'ALLOW' });
      expect(result?.graph).toEqual({ nodes: [], edges: [] });
    });

    it('fills missing triggeredRules and reasons with []', () => {
      const result = normalize({ decision: 'ALLOW' });
      expect(result?.triggeredRules).toEqual([]);
      expect(result?.reasons).toEqual([]);
    });

    it('preserves provided fraud profile fields', () => {
      const result = normalize({
        scope: 'GLOBAL',
        rootIdentifier: { type: 'email', value: 'a@b.com' },
        ...mockFraudProfile,
      });

      expect(result?.riskScore).toBe(87);
      expect(result?.riskLevel).toBe('HIGH');
      expect(result?.decision).toBe('MANUAL_REVIEW');
      expect(result?.policyActions).toHaveLength(1);
      expect(result?.triggeredRules).toHaveLength(1);
      expect(result?.relatedIdentifiers.emails).toHaveLength(1);
    });
  });

  describe('getTransactions', () => {
    const axiosResponse = <T>(data: T): AxiosResponse<T> =>
      ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as AxiosResponse['config'],
      }) as AxiosResponse<T>;

    it('returns normalized fraudProfile when fraud service succeeds', async () => {
      httpGet.mockReturnValueOnce(of(axiosResponse(mockBackendResponse)));
      fraudClientGet.mockResolvedValueOnce(mockFraudProfile);

      const result = await service.getTransactions({
        page: 1,
        pageSize: 20,
        CustomerEmail: 'mark.feldman@gmail.com',
      });

      expect(httpGet).toHaveBeenCalledTimes(1);
      expect(fraudClientGet).toHaveBeenCalledTimes(1);
      expect(fraudClientGet).toHaveBeenCalledWith('/fraud/profile', {
        params: {
          type: 'email',
          value: 'mark.feldman@gmail.com',
        },
      });

      expect(result.fraudProfile).toMatchObject({
        scope: 'GLOBAL',
        rootIdentifier: {
          type: 'email',
          value: 'mark.feldman@gmail.com',
        },
        riskScore: 87,
        riskLevel: 'HIGH',
        decision: 'MANUAL_REVIEW',
        features: mockFraudProfile.features,
        policyActions: mockFraudProfile.policyActions,
        triggeredRules: mockFraudProfile.triggeredRules,
      });
      expect(result.fraudSummary).toMatchObject({
        isFlagged: true,
        riskScore: 87,
        riskLevel: 'HIGH',
        decision: 'MANUAL_REVIEW',
      });
    });

    it('returns fraudProfile null when fraud service fails', async () => {
      httpGet.mockReturnValueOnce(of(axiosResponse(mockBackendResponse)));
      fraudClientGet.mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await service.getTransactions({
        page: 1,
        pageSize: 20,
        CustomerEmail: 'mark.feldman@gmail.com',
      });

      expect(result.transactions[0].date).toBe('2024-01-01T00:00:00.000Z');
      expect(result.fraudProfile).toBeNull();
      expect(result.fraudSummary).toBeNull();
    });

    it('always returns pageCorrelations with scope CURRENT_PAGE', async () => {
      httpGet.mockReturnValueOnce(of(axiosResponse(mockBackendResponse)));

      const result = await service.getTransactions({
        page: 1,
        pageSize: 20,
      });

      expect(result.pageCorrelations).toEqual({
        scope: 'CURRENT_PAGE',
        emails: [{ value: 'mark.feldman@gmail.com', count: 1 }],
        phones: [{ value: '+15551234567', count: 1 }],
        ips: [{ value: '192.168.1.1', count: 1 }],
        paymentAccounts: [{ value: 'acc-123', count: 1 }],
        fingerprints: [{ value: 'fp-abc', count: 1 }],
      });
      expect(result.fraudProfile).toBeNull();
      expect(result.fraudSummary).toBeNull();
    });

    it('does not fail transactions response when fraud service is down', async () => {
      httpGet.mockReturnValueOnce(of(axiosResponse(mockBackendResponse)));
      fraudClientGet.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.getTransactions({
        page: 1,
        pageSize: 20,
        CustomerEmail: 'mark.feldman@gmail.com',
      });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.total).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.fraudProfile).toBeNull();
      expect(result.fraudSummary).toBeNull();
    });

    it('does not call fraud service when no identifier is present', async () => {
      httpGet.mockReturnValueOnce(of(axiosResponse(mockBackendResponse)));

      await service.getTransactions({ page: 1, pageSize: 20 });

      expect(httpGet).toHaveBeenCalledTimes(1);
      expect(fraudClientGet).not.toHaveBeenCalled();
    });

    it('does not make per-transaction fraud requests', async () => {
      httpGet.mockReturnValueOnce(of(axiosResponse(mockBackendResponse)));
      fraudClientGet.mockResolvedValueOnce(mockFraudProfile);

      await service.getTransactions({
        page: 1,
        pageSize: 20,
        CustomerEmail: 'mark.feldman@gmail.com',
      });

      expect(fraudClientGet).toHaveBeenCalledTimes(1);
    });

    it('normalizes ASP.NET timezone-less transaction dates to ISO UTC', async () => {
      httpGet.mockReturnValueOnce(
        of(
          axiosResponse({
            total_transactions: 1,
            transactions: [
              {
                ...mockBackendResponse.transactions[0],
                date: '2026/08/09 14:41:17',
              },
            ],
          }),
        ),
      );

      const result = await service.getTransactions({ page: 1, pageSize: 20 });

      expect(result.transactions[0].date).toBe('2026-08-09T14:41:17.000Z');
    });

    it('throws BadGatewayException when ASP.NET backend returns 500', async () => {
      const axiosError = Object.assign(
        new Error('Request failed with status code 500'),
        {
          isAxiosError: true,
          response: { status: 500, data: 'SQL timeout' },
        },
      );
      httpGet.mockReturnValueOnce(throwError(() => axiosError));

      await expect(
        service.getTransactions({ page: 1, pageSize: 20 }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('throws GatewayTimeoutException when ASP.NET backend request times out', async () => {
      const axiosError = Object.assign(new Error('timeout of 60000ms exceeded'), {
        isAxiosError: true,
        code: 'ECONNABORTED',
      });
      httpGet.mockReturnValueOnce(throwError(() => axiosError));

      await expect(
        service.getTransactions({ page: 1, pageSize: 20 }),
      ).rejects.toBeInstanceOf(GatewayTimeoutException);
    });

    it('throws BadGatewayException when ASP.NET backend is unreachable', async () => {
      httpGet.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));

      await expect(
        service.getTransactions({ page: 1, pageSize: 20 }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});
