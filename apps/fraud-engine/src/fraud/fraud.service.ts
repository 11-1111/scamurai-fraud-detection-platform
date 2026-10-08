import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudPolicyRuleEntity } from '../database/entities/fraud-policy-rule.entity';
import { FraudRiskLevelEntity } from '../database/entities/fraud-risk-level.entity';
import { FraudRuleConfigEntity } from '../database/entities/fraud-rule-config.entity';
import { FraudProfileQueryDto } from './dto/fraud-profile-query.dto';
import { GraphEngine } from './engines/graph.engine';
import { RelationshipEngine } from './engines/relationship.engine';
import { FraudEvaluationService } from './fraud-evaluation.service';
import {
  SUPPORTED_IDENTIFIER_TYPES,
  IdentifierType,
} from './types/fraud.types';

@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(FraudRuleConfigEntity, 'fraud')
    private readonly ruleConfigRepo: Repository<FraudRuleConfigEntity>,
    @InjectRepository(FraudRiskLevelEntity, 'fraud')
    private readonly riskLevelRepo: Repository<FraudRiskLevelEntity>,
    @InjectRepository(FraudPolicyRuleEntity, 'fraud')
    private readonly policyRuleRepo: Repository<FraudPolicyRuleEntity>,
    private readonly relationshipEngine: RelationshipEngine,
    private readonly graphEngine: GraphEngine,
    private readonly fraudEvaluationService: FraudEvaluationService,
  ) {}

  health() {
    return {
      status: 'ok',
      service: 'fraud-detection-service',
    };
  }

  async getRelationships(query: FraudProfileQueryDto) {
    const normalized = this.validateAndNormalizeQuery(query);
    return this.relationshipEngine.getRelatedIdentifiers(
      normalized.type,
      normalized.value,
    );
  }

  async getNetwork(query: FraudProfileQueryDto) {
    const normalized = this.validateAndNormalizeQuery(query);
    return this.graphEngine.getNetwork(
      normalized.type,
      normalized.value,
      normalized.depth,
    );
  }

  async getRiskScore(query: FraudProfileQueryDto) {
    const normalized = this.validateAndNormalizeQuery(query);
    const evaluation = await this.fraudEvaluationService.evaluateIdentifier(
      normalized.type,
      normalized.value,
      { depth: normalized.depth },
    );

    return {
      features: evaluation.features,
      riskScore: evaluation.risk.riskScore,
      riskLevel: evaluation.risk.riskLevel,
      decision: evaluation.policy.finalDecision,
      defaultDecision: evaluation.risk.decision,
      displayColor: evaluation.risk.displayColor,
      policyActions: evaluation.policy.policyActions,
      triggeredRules: evaluation.triggeredRules,
      reasons: evaluation.reasons,
    };
  }

  async getProfile(query: FraudProfileQueryDto) {
    const normalized = this.validateAndNormalizeQuery(query);
    const evaluation = await this.fraudEvaluationService.evaluateIdentifier(
      normalized.type,
      normalized.value,
      { depth: normalized.depth },
    );

    return {
      scope: 'GLOBAL',
      rootIdentifier: {
        type: normalized.type,
        value: normalized.value,
      },
      features: evaluation.features,
      riskScore: evaluation.risk.riskScore,
      riskLevel: evaluation.risk.riskLevel,
      decision: evaluation.policy.finalDecision,
      defaultDecision: evaluation.risk.decision,
      displayColor: evaluation.risk.displayColor,
      policyActions: evaluation.policy.policyActions,
      relatedIdentifiers: evaluation.relatedIdentifiers,
      graph: evaluation.graph,
      triggeredRules: evaluation.triggeredRules,
      reasons: evaluation.reasons,
    };
  }

  getRulesConfig() {
    return this.ruleConfigRepo.find({
      order: { isEnabled: 'DESC', ruleCode: 'ASC' },
    });
  }

  getRiskLevelsConfig() {
    return this.riskLevelRepo.find({
      order: { isEnabled: 'DESC', priority: 'ASC' },
    });
  }

  getPoliciesConfig() {
    return this.policyRuleRepo.find({
      order: { isEnabled: 'DESC', priority: 'DESC', policyCode: 'ASC' },
    });
  }

  private validateAndNormalizeQuery(query: FraudProfileQueryDto): {
    type: IdentifierType;
    value: string;
    depth: number;
  } {
    const type = query.type?.trim().toLowerCase();
    const value = query.value?.trim();

    if (!type) {
      throw new BadRequestException('Query parameter "type" is required.');
    }

    if (!value) {
      throw new BadRequestException('Query parameter "value" is required.');
    }

    if (!SUPPORTED_IDENTIFIER_TYPES.includes(type as IdentifierType)) {
      throw new BadRequestException(
        `Unsupported identifier type "${type}". Supported types: ${SUPPORTED_IDENTIFIER_TYPES.join(', ')}`,
      );
    }

    const depth = this.normalizeDepth(query.depth);

    return {
      type: type as IdentifierType,
      value,
      depth,
    };
  }

  private normalizeDepth(depth?: number): number {
    if (depth === undefined || depth === null) {
      return 2;
    }

    const parsed = Number(depth);
    if (!Number.isFinite(parsed)) {
      return 2;
    }

    return Math.max(1, Math.min(Math.floor(parsed), 5));
  }
}
