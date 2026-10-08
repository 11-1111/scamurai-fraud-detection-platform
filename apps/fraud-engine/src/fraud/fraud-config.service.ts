import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRuleConfigEntity } from '../database/entities/fraud-rule-config.entity';
import { CreateFraudRuleDto } from './dto/create-fraud-rule.dto';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
import {
  FeatureCatalogEntry,
  FeatureCatalogService,
} from './features/feature-catalog.service';

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

@Injectable()
export class FraudConfigService {
  constructor(
    @InjectRepository(FraudRuleConfigEntity, 'fraud')
    private readonly ruleConfigRepo: Repository<FraudRuleConfigEntity>,
    private readonly featureCatalogService: FeatureCatalogService,
  ) {}

  getFeatures() {
    return this.featureCatalogService.getAvailableFeatures();
  }

  getRules() {
    return this.ruleConfigRepo.find({
      order: { isEnabled: 'DESC', ruleCode: 'ASC' },
    });
  }

  async getRuleById(id: number): Promise<FraudRuleConfigEntity> {
    const rule = await this.ruleConfigRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Fraud rule with id ${id} was not found.`);
    }
    return rule;
  }

  async createRule(dto: CreateFraudRuleDto): Promise<FraudRuleConfigEntity> {
    const ruleCode = dto.ruleCode?.trim();
    if (!ruleCode) {
      throw new BadRequestException('"ruleCode" is required.');
    }

    const ruleName = dto.ruleName?.trim();
    if (!ruleName) {
      throw new BadRequestException('"ruleName" is required.');
    }

    const feature = this.validateFeatureName(dto.featureName);
    const operator = this.validateOperator(dto.operator, feature);
    const severity = this.validateSeverity(dto.severity);
    const thresholdValue = this.validateThresholdValue(dto.thresholdValue);
    const scoreImpact = this.validateScoreImpact(dto.scoreImpact);

    const existing = await this.ruleConfigRepo.findOne({
      where: { ruleCode },
    });
    if (existing) {
      throw new BadRequestException(
        `A fraud rule with ruleCode "${ruleCode}" already exists.`,
      );
    }

    const rule = this.ruleConfigRepo.create({
      ruleCode,
      ruleName,
      description: dto.description?.trim() || undefined,
      featureName: feature.featureName,
      operator,
      thresholdValue,
      severity,
      scoreImpact,
      isEnabled: dto.isEnabled ?? true,
      createdAt: new Date(),
    });

    return this.ruleConfigRepo.save(rule);
  }

  async updateRule(
    id: number,
    dto: UpdateFraudRuleDto,
  ): Promise<FraudRuleConfigEntity> {
    const rule = await this.getRuleById(id);

    if (dto.ruleName !== undefined) {
      const ruleName = dto.ruleName?.trim();
      if (!ruleName) {
        throw new BadRequestException('"ruleName" cannot be empty.');
      }
      rule.ruleName = ruleName;
    }

    if (dto.description !== undefined) {
      rule.description = dto.description?.trim() || undefined;
    }

    // Feature and operator must stay a valid combination after the update.
    const targetFeatureName = dto.featureName ?? rule.featureName;
    const targetOperator = dto.operator ?? rule.operator;
    const feature = this.validateFeatureName(targetFeatureName);
    const operator = this.validateOperator(targetOperator, feature);
    rule.featureName = feature.featureName;
    rule.operator = operator;

    if (dto.thresholdValue !== undefined) {
      rule.thresholdValue = this.validateThresholdValue(dto.thresholdValue);
    }

    if (dto.severity !== undefined) {
      rule.severity = this.validateSeverity(dto.severity);
    }

    if (dto.scoreImpact !== undefined) {
      rule.scoreImpact = this.validateScoreImpact(dto.scoreImpact);
    }

    if (dto.isEnabled !== undefined) {
      rule.isEnabled = Boolean(dto.isEnabled);
    }

    rule.updatedAt = new Date();
    return this.ruleConfigRepo.save(rule);
  }

  async enableRule(id: number): Promise<FraudRuleConfigEntity> {
    return this.setEnabled(id, true);
  }

  async disableRule(id: number): Promise<FraudRuleConfigEntity> {
    return this.setEnabled(id, false);
  }

  private async setEnabled(
    id: number,
    isEnabled: boolean,
  ): Promise<FraudRuleConfigEntity> {
    const rule = await this.getRuleById(id);
    rule.isEnabled = isEnabled;
    rule.updatedAt = new Date();
    return this.ruleConfigRepo.save(rule);
  }

  private validateFeatureName(featureName?: string): FeatureCatalogEntry {
    const normalized = featureName?.trim();
    if (!normalized) {
      throw new BadRequestException('"featureName" is required.');
    }

    const feature = this.featureCatalogService.getFeature(normalized);
    if (!feature) {
      const available = this.featureCatalogService
        .getAvailableFeatures()
        .map((entry) => entry.featureName)
        .join(', ');
      throw new BadRequestException(
        `Unknown feature "${normalized}". Available features: ${available}`,
      );
    }

    return feature;
  }

  private validateOperator(
    operator: string | undefined,
    feature: FeatureCatalogEntry,
  ): string {
    const normalized = operator?.trim();
    if (!normalized) {
      throw new BadRequestException('"operator" is required.');
    }

    if (!feature.supportedOperators.includes(normalized)) {
      throw new BadRequestException(
        `Operator "${normalized}" is not supported by feature "${feature.featureName}". ` +
          `Supported operators: ${feature.supportedOperators.join(', ')}`,
      );
    }

    return normalized;
  }

  private validateSeverity(severity?: string): string {
    const normalized = severity?.trim().toUpperCase();
    if (!normalized || !ALLOWED_SEVERITIES.includes(normalized)) {
      throw new BadRequestException(
        `"severity" must be one of: ${ALLOWED_SEVERITIES.join(', ')}`,
      );
    }
    return normalized;
  }

  private validateThresholdValue(thresholdValue: unknown): number {
    const parsed = Number(thresholdValue);
    if (thresholdValue === undefined || thresholdValue === null || !Number.isFinite(parsed)) {
      throw new BadRequestException('"thresholdValue" must be a number.');
    }
    return parsed;
  }

  private validateScoreImpact(scoreImpact: unknown): number {
    const parsed = Number(scoreImpact);
    if (
      scoreImpact === undefined ||
      scoreImpact === null ||
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > 100
    ) {
      throw new BadRequestException(
        '"scoreImpact" must be a number between 0 and 100.',
      );
    }
    return Math.round(parsed);
  }
}
