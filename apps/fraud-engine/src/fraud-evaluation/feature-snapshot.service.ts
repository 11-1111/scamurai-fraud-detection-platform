import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  FraudEvaluationReason,
  FraudEvaluationStatus,
  FraudTransactionEvaluationEntity,
} from '../database/entities/fraud-transaction-evaluation.entity';
import {
  FraudTransactionFeatureEntity,
} from '../database/entities/fraud-transaction-feature.entity';
import { CalculatedFeature, FraudFeatureValue } from '../fraud/types/fraud.types';
import {
  assertUniqueFeatureNames,
  convertFraudFeatureValue,
  ConvertedFeatureValue,
} from './feature-snapshot.mapper';

export interface StartEvaluationInput {
  fraudTransactionId: string;
  evaluationReason: FraudEvaluationReason;
  featureEngineVersion?: string;
  rulesEngineVersion?: string;
}

export interface SaveFeatureSnapshotInput {
  evaluationId: string;
  fraudTransactionId: string;
  calculatedFeatures: CalculatedFeature[];
}

export interface CompleteEvaluationInput {
  evaluationId: string;
  riskScore: number;
  riskLevel: string;
  policyDecision?: string | null;
}

export interface FailEvaluationInput {
  evaluationId: string;
}

@Injectable()
export class FeatureSnapshotService {
  private readonly logger = new Logger(FeatureSnapshotService.name);

  constructor(
    @InjectRepository(FraudTransactionEvaluationEntity, 'fraud')
    private readonly evaluationRepo: Repository<FraudTransactionEvaluationEntity>,
    @InjectRepository(FraudTransactionFeatureEntity, 'fraud')
    private readonly featureRepo: Repository<FraudTransactionFeatureEntity>,
    @InjectDataSource('fraud')
    private readonly fraudDataSource: DataSource,
  ) {}

  async startEvaluation(
    input: StartEvaluationInput,
  ): Promise<FraudTransactionEvaluationEntity> {
    try {
      return await this.createEvaluationWithNextVersion(input);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      this.logger.warn(
        `Duplicate evaluation version for transaction ${input.fraudTransactionId}; retrying once.`,
      );
      return this.createEvaluationWithNextVersion(input);
    }
  }

  async saveFeatureSnapshot(
    input: SaveFeatureSnapshotInput,
  ): Promise<FraudTransactionFeatureEntity[]> {
    assertUniqueFeatureNames(input.calculatedFeatures);

    const evaluation = await this.evaluationRepo.findOne({
      where: { id: input.evaluationId },
    });
    if (!evaluation) {
      throw new NotFoundException(
        `Evaluation ${input.evaluationId} was not found.`,
      );
    }

    if (evaluation.status !== FraudEvaluationStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot save feature snapshot when evaluation status is ${evaluation.status}. Expected PROCESSING.`,
      );
    }

    if (evaluation.fraudTransactionId !== input.fraudTransactionId) {
      throw new BadRequestException(
        `Evaluation ${input.evaluationId} belongs to a different fraud transaction.`,
      );
    }

    const existingCount = await this.featureRepo.count({
      where: { evaluationId: input.evaluationId },
    });
    if (existingCount > 0) {
      throw new ConflictException(
        `Feature snapshot already exists for evaluation ${input.evaluationId}.`,
      );
    }

    const now = new Date();
    const rows = input.calculatedFeatures.map((feature) => {
      const converted = this.convertFeatureValue(feature.value);
      return this.featureRepo.create({
        evaluationId: input.evaluationId,
        fraudTransactionId: input.fraudTransactionId,
        featureName: feature.name.trim(),
        featureLabel: feature.label,
        featureCategory: feature.category,
        featureDescription: feature.description,
        valueType: converted.valueType,
        numericValue: converted.numericValue,
        booleanValue: converted.booleanValue,
        stringValue: converted.stringValue,
        jsonValue: converted.jsonValue,
        unit: feature.unit,
        windowSeconds: feature.windowSeconds,
        calculatedAt: feature.calculatedAt,
        createdAt: now,
      });
    });

    const saved = await this.fraudDataSource.transaction(async (manager) => {
      return manager.save(FraudTransactionFeatureEntity, rows);
    });

    this.logger.log(
      `Persisted ${saved.length} features for evaluation ${input.evaluationId}`,
    );

    return saved;
  }

  async completeEvaluation(
    input: CompleteEvaluationInput,
  ): Promise<FraudTransactionEvaluationEntity> {
    if (!Number.isFinite(input.riskScore)) {
      throw new BadRequestException(
        'riskScore must be a finite number (NaN and Infinity are not allowed).',
      );
    }

    const evaluation = await this.evaluationRepo.findOne({
      where: { id: input.evaluationId },
    });
    if (!evaluation) {
      throw new NotFoundException(
        `Evaluation ${input.evaluationId} was not found.`,
      );
    }

    if (evaluation.status !== FraudEvaluationStatus.PROCESSING) {
      throw new ConflictException(
        `Cannot complete evaluation ${input.evaluationId} from status ${evaluation.status}. Expected PROCESSING.`,
      );
    }

    evaluation.riskScore = input.riskScore;
    evaluation.riskLevel = input.riskLevel;
    evaluation.policyDecision = input.policyDecision ?? undefined;
    evaluation.status = FraudEvaluationStatus.COMPLETED;
    evaluation.completedAt = new Date();

    return this.evaluationRepo.save(evaluation);
  }

  async failEvaluation(
    input: FailEvaluationInput,
  ): Promise<FraudTransactionEvaluationEntity> {
    const evaluation = await this.evaluationRepo.findOne({
      where: { id: input.evaluationId },
    });
    if (!evaluation) {
      throw new NotFoundException(
        `Evaluation ${input.evaluationId} was not found.`,
      );
    }

    if (evaluation.status === FraudEvaluationStatus.COMPLETED) {
      throw new ConflictException(
        `Cannot fail evaluation ${input.evaluationId} because it is already COMPLETED.`,
      );
    }

    if (evaluation.status === FraudEvaluationStatus.FAILED) {
      return evaluation;
    }

    evaluation.status = FraudEvaluationStatus.FAILED;
    evaluation.completedAt = new Date();
    return this.evaluationRepo.save(evaluation);
  }

  async getLatestEvaluation(
    fraudTransactionId: string,
  ): Promise<FraudTransactionEvaluationEntity | null> {
    const evaluation = await this.evaluationRepo.findOne({
      where: { fraudTransactionId },
      order: { evaluationVersion: 'DESC' },
      relations: { features: true },
    });

    if (!evaluation) {
      return null;
    }

    if (evaluation.features?.length) {
      evaluation.features = [...evaluation.features].sort((a, b) => {
        const categoryCompare = (a.featureCategory ?? '').localeCompare(
          b.featureCategory ?? '',
        );
        if (categoryCompare !== 0) {
          return categoryCompare;
        }
        return a.featureName.localeCompare(b.featureName);
      });
    }

    return evaluation;
  }

  private async createEvaluationWithNextVersion(
    input: StartEvaluationInput,
  ): Promise<FraudTransactionEvaluationEntity> {
    return this.fraudDataSource.transaction(async (manager) => {
      const nextVersion = await this.resolveNextEvaluationVersion(
        manager.getRepository(FraudTransactionEvaluationEntity),
        input.fraudTransactionId,
      );

      const now = new Date();
      const evaluation = manager.create(FraudTransactionEvaluationEntity, {
        fraudTransactionId: input.fraudTransactionId,
        evaluationVersion: nextVersion,
        evaluationReason: input.evaluationReason,
        status: FraudEvaluationStatus.PROCESSING,
        featureEngineVersion: input.featureEngineVersion,
        rulesEngineVersion: input.rulesEngineVersion,
        startedAt: now,
        createdAt: now,
      });

      const saved = await manager.save(FraudTransactionEvaluationEntity, evaluation);

      this.logger.log(
        `Started evaluation ${saved.id} for transaction ${saved.fraudTransactionId} version ${saved.evaluationVersion}`,
      );

      return saved;
    });
  }

  private async resolveNextEvaluationVersion(
    evaluationRepo: Repository<FraudTransactionEvaluationEntity>,
    fraudTransactionId: string,
  ): Promise<number> {
    const raw = await evaluationRepo
      .createQueryBuilder('evaluation')
      .select('MAX(evaluation.evaluation_version)', 'maxVersion')
      .where('evaluation.fraud_transaction_id = :fraudTransactionId', {
        fraudTransactionId,
      })
      .getRawOne<{ maxVersion: string | number | null }>();

    if (raw?.maxVersion === null || raw?.maxVersion === undefined) {
      return 1;
    }

    return Number(raw.maxVersion) + 1;
  }

  private convertFeatureValue(value: FraudFeatureValue): ConvertedFeatureValue {
    return convertFraudFeatureValue(value);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as
      | { number?: number; code?: string | number; message?: string }
      | undefined;
    const number = Number(driverError?.number ?? driverError?.code);
    // SQL Server unique constraint / unique index violation numbers.
    if (number === 2627 || number === 2601) {
      return true;
    }

    const message = `${error.message} ${driverError?.message ?? ''}`.toLowerCase();
    return (
      message.includes('unique') ||
      message.includes('duplicate') ||
      message.includes('ux_fraud_transaction_evaluations')
    );
  }
}
