import { Injectable } from '@nestjs/common';

import { FraudServiceClient } from '../fraud/infrastructure/fraud-service.client';
import {
  FraudFeatureCatalogItemDto,
  FraudPolicyDto,
  FraudRiskLevelDto,
  FraudRuleDto,
} from '../fraud/dto/fraud.dto';
import {
  UpstreamFraudFeatureCatalogItem,
  UpstreamFraudPolicy,
  UpstreamFraudRiskLevel,
  UpstreamFraudRule,
} from '../fraud/dto/upstream-fraud.types';
import {
  mapFeatureCatalogItem,
  mapPolicy,
  mapRiskLevel,
  mapRule,
} from '../fraud/mappers/fraud.mapper';
import {
  CreateFraudRuleDto,
  UpdateFraudRuleDto,
} from './dto/create-rule.dto';

@Injectable()
export class FraudConfigService {
  constructor(private readonly fraudClient: FraudServiceClient) {}

  async getFeatures(): Promise<FraudFeatureCatalogItemDto[]> {
    const upstream = await this.fraudClient.get<UpstreamFraudFeatureCatalogItem[]>(
      '/fraud/config/features',
    );
    return upstream.map(mapFeatureCatalogItem);
  }

  async getRules(): Promise<FraudRuleDto[]> {
    const upstream = await this.fraudClient.get<UpstreamFraudRule[]>(
      '/fraud/config/rules',
    );
    return upstream.map(mapRule);
  }

  async getRule(id: string): Promise<FraudRuleDto> {
    const upstream = await this.fraudClient.get<UpstreamFraudRule>(
      `/fraud/config/rules/${id}`,
    );
    return mapRule(upstream);
  }

  async createRule(body: CreateFraudRuleDto): Promise<FraudRuleDto> {
    const upstream = await this.fraudClient.post<UpstreamFraudRule>(
      '/fraud/config/rules',
      { body },
    );
    return mapRule(upstream);
  }

  async updateRule(id: string, body: UpdateFraudRuleDto): Promise<FraudRuleDto> {
    const upstream = await this.fraudClient.patch<UpstreamFraudRule>(
      `/fraud/config/rules/${id}`,
      { body },
    );
    return mapRule(upstream);
  }

  async enableRule(id: string): Promise<FraudRuleDto> {
    const upstream = await this.fraudClient.patch<UpstreamFraudRule>(
      `/fraud/config/rules/${id}/enable`,
    );
    return mapRule(upstream);
  }

  async disableRule(id: string): Promise<FraudRuleDto> {
    const upstream = await this.fraudClient.patch<UpstreamFraudRule>(
      `/fraud/config/rules/${id}/disable`,
    );
    return mapRule(upstream);
  }

  async getRiskLevels(): Promise<FraudRiskLevelDto[]> {
    const upstream = await this.fraudClient.get<UpstreamFraudRiskLevel[]>(
      '/fraud/config/risk-levels',
    );
    return upstream.map(mapRiskLevel);
  }

  async getPolicies(): Promise<FraudPolicyDto[]> {
    const upstream = await this.fraudClient.get<UpstreamFraudPolicy[]>(
      '/fraud/config/policies',
    );
    return upstream.map(mapPolicy);
  }
}
