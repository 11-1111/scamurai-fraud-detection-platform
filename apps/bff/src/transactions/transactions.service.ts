import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import https from 'https';

import { BACKEND_CONFIG } from '../config/backend.config';
import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';
import { buildFraudSummaryFromProfile } from '../fraud/mappers/fraud-summary.mapper';
import { mapBackendTransactions } from './mappers/transaction.mapper';
import { BackendResponse, BackendTransaction } from './types/backend.types';
import { TransactionsResponseDto } from './dto/transactions-response.dto';
import {
  CorrelatedIdentifier,
  PageCorrelations,
} from './dto/correlation.dto';
import {
  FraudProfile,
  FraudRelatedIdentifiers,
  FraudRootIdentifier,
} from './dto/fraud-profile.dto';

type FraudIdentifier = FraudRootIdentifier;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  private readonly identifierQueryMap: ReadonlyArray<
    readonly [string, string]
  > = [
    ['CustomerEmail', 'email'],
    ['Phone', 'phone'],
    ['IpAddress', 'ip'],
    ['IPAddress', 'ip'],
    ['PaymentAccount', 'payment_account'],
    ['DeviceFingerprint', 'fingerprint'],
    ['ConfirmationCode', 'confirmation_code'],
    ['TrackingId', 'order_tracking_id'],
    ['OrderNumber', 'order_tracking_id'],
    ['OrderTrackingId', 'order_tracking_id'],
    ['BankAuth', 'bank_auth_code'],
    ['BankAuthCode', 'bank_auth_code'],
    ['MerchantEmail', 'merchant_email'],
    ['Merchant', 'merchant_name'],
  ];

  constructor(
    private readonly http: HttpService,
    private readonly fraudClient: FraudServiceClient,
  ) {}

  // ---- helpers ------------------------------------------------------

  private increment(map: Map<string, number>, value?: string | null): void {
    if (!value) return;
    map.set(value, (map.get(value) ?? 0) + 1);
  }

  private mapToSortedArray(map: Map<string, number>): CorrelatedIdentifier[] {
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }

  private detectFraudIdentifier(
    query: Record<string, unknown>,
  ): FraudIdentifier | null {
    for (const [param, type] of this.identifierQueryMap) {
      const raw = query[param];
      if (raw == null) continue;
      const value = String(raw).trim();
      if (!value) continue;
      return { type, value };
    }
    return null;
  }

  private normalizeFraudProfile(input: unknown): FraudProfile | null {
    if (input == null) return null;

    const data = input as Record<string, unknown>;
    const related = data.relatedIdentifiers as
      | Partial<FraudRelatedIdentifiers>
      | undefined;
    const graph = data.graph as
      | { nodes?: unknown[]; edges?: unknown[] }
      | undefined;

    return {
      scope: (data.scope as string) ?? 'GLOBAL',
      rootIdentifier: (data.rootIdentifier as FraudRootIdentifier) ?? {
        type: '',
        value: '',
      },
      features: (data.features as FraudProfile['features']) ?? {},
      riskScore: Number(data.riskScore ?? 0),
      riskLevel: (data.riskLevel as string) ?? 'LOW',
      defaultDecision: data.defaultDecision as string | undefined,
      decision:
        (data.decision as string) ??
        (data.defaultDecision as string) ??
        'ALLOW',
      displayColor: data.displayColor as string | undefined,
      policyActions: (data.policyActions as FraudProfile['policyActions']) ?? [],
      relatedIdentifiers: {
        emails: related?.emails ?? [],
        phones: related?.phones ?? [],
        ips: related?.ips ?? [],
        paymentAccounts: related?.paymentAccounts ?? [],
        fingerprints: related?.fingerprints ?? [],
        merchants: related?.merchants ?? [],
        confirmationCodes: related?.confirmationCodes ?? [],
        orderTrackingIds: related?.orderTrackingIds ?? [],
        bankAuthCodes: related?.bankAuthCodes ?? [],
      },
      graph: {
        nodes: (graph?.nodes ?? []) as FraudProfile['graph']['nodes'],
        edges: (graph?.edges ?? []) as FraudProfile['graph']['edges'],
      },
      triggeredRules:
        (data.triggeredRules as FraudProfile['triggeredRules']) ?? [],
      reasons: (data.reasons as string[]) ?? [],
    };
  }

  private buildPageCorrelations(
    transactions: BackendTransaction[],
  ): Omit<PageCorrelations, 'scope'> {
    const emailMap = new Map<string, number>();
    const phoneMap = new Map<string, number>();
    const ipMap = new Map<string, number>();
    const paymentAccountMap = new Map<string, number>();
    const fingerprintMap = new Map<string, number>();

    for (const tx of transactions) {
      this.increment(emailMap, tx.customer?.email);
      this.increment(phoneMap, tx.customer?.phone);
      this.increment(ipMap, tx.customer?.ipAddress);
      this.increment(paymentAccountMap, tx.paymentAccount);
      this.increment(fingerprintMap, tx.deviceFingerprint);
    }

    return {
      emails: this.mapToSortedArray(emailMap),
      phones: this.mapToSortedArray(phoneMap),
      ips: this.mapToSortedArray(ipMap),
      paymentAccounts: this.mapToSortedArray(paymentAccountMap),
      fingerprints: this.mapToSortedArray(fingerprintMap),
    };
  }

  private async getBackendTransactions(
    query: Record<string, unknown>,
  ): Promise<BackendResponse> {
    const start = Date.now();
    const path = '/api/transactions/search';

    try {
      const backendResponse = await firstValueFrom(
        this.http.get<BackendResponse>(
          `${BACKEND_CONFIG.BASE_URL}${path}`,
          {
            params: query,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: 60_000,
          },
        ),
      );

      this.logger.log(
        `GET ${path} status=${backendResponse.status} latency=${Date.now() - start}ms`,
      );

      return backendResponse.data;
    } catch (error) {
      this.logger.error(
        `GET ${path} failed latency=${Date.now() - start}ms`,
        error instanceof Error ? error.message : String(error),
      );

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new GatewayTimeoutException('Transaction backend timed out.');
        }

        if (error.response) {
          throw new BadGatewayException('Transaction backend unavailable.');
        }
      }

      throw new BadGatewayException('Transaction backend unavailable.');
    }
  }

  private async fetchFraudProfile(
    identifier: FraudIdentifier,
  ): Promise<unknown> {
    try {
      const response = await this.fraudClient.get<Record<string, unknown>>(
        '/fraud/profile',
        {
          params: {
            type: identifier.type,
            value: identifier.value,
          },
        },
      );

      return {
        ...response,
        scope: response.scope ?? 'GLOBAL',
        rootIdentifier: response.rootIdentifier ?? identifier,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch fraud profile for ${identifier.type}`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  // ---- main ---------------------------------------------------------

  async getTransactions(
    query: Record<string, unknown>,
  ): Promise<TransactionsResponseDto> {
    const backendResponse = await this.getBackendTransactions(query);

    const page = Number(query.page ?? query.Page ?? 1);
    const pageSize = Number(query.pageSize ?? query.PageSize ?? 20);

    const transactions = mapBackendTransactions(backendResponse.transactions ?? []);

    const pageCorrelations: PageCorrelations = {
      scope: 'CURRENT_PAGE',
      ...this.buildPageCorrelations(transactions),
    };

    const fraudIdentifier = this.detectFraudIdentifier(query);

    let fraudProfile: FraudProfile | null = null;

    if (fraudIdentifier) {
      const rawFraudProfile = await this.fetchFraudProfile(fraudIdentifier);
      fraudProfile = this.normalizeFraudProfile(rawFraudProfile);
    }

    return {
      page,
      pageSize,
      total: backendResponse.total_transactions ?? 0,
      transactions,
      pageCorrelations,
      fraudProfile,
      fraudSummary: buildFraudSummaryFromProfile(fraudProfile),
    };
  }

  async getFraudProfileDebug(
    type: string,
    value: string,
  ): Promise<FraudProfile | null> {
    const raw = await this.fetchFraudProfile({ type, value: value.trim() });
    return this.normalizeFraudProfile(raw);
  }
}
