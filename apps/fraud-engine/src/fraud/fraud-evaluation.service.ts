import { Injectable, Logger } from '@nestjs/common';
import {
  FraudEvaluationReason,
  FraudEvaluationStatus,
} from '../database/entities/fraud-transaction-evaluation.entity';
import { FraudTransactionEntity } from '../database/entities/fraud-transaction.entity';
import { FeatureSnapshotService } from '../fraud-evaluation/feature-snapshot.service';
import { AlertEngine } from './engines/alert.engine';
import { FeatureEngine } from './engines/feature.engine';
import { GraphEngine } from './engines/graph.engine';
import { PolicyEngine } from './engines/policy.engine';
import { RelationshipEngine } from './engines/relationship.engine';
import { RiskScoreEngine } from './engines/risk-score.engine';
import { RulesEngine } from './engines/rules.engine';

export interface EvaluateIdentifierOptions {
  depth?: number;
  transaction?: FraudTransactionEntity | null;
  /**
   * When true, starts/completes a FraudDb evaluation snapshot around the run.
   * Requires options.transaction.
   */
  persistEvaluation?: boolean;
  /**
   * When true, creates an alert after policy evaluation and before complete.
   * Requires persistEvaluation + transaction + rootIdentifier.
   */
  createAlert?: boolean;
  rootIdentifier?: { type: string; value: string };
  sourceTransactionId?: string;
}

@Injectable()
export class FraudEvaluationService {
  private readonly logger = new Logger(FraudEvaluationService.name);

  constructor(
    private readonly relationshipEngine: RelationshipEngine,
    private readonly graphEngine: GraphEngine,
    private readonly featureEngine: FeatureEngine,
    private readonly rulesEngine: RulesEngine,
    private readonly riskScoreEngine: RiskScoreEngine,
    private readonly policyEngine: PolicyEngine,
    private readonly featureSnapshotService: FeatureSnapshotService,
    private readonly alertEngine: AlertEngine,
  ) {}

  async evaluateIdentifier(
    type: string,
    value: string,
    options?: EvaluateIdentifierOptions,
  ) {
    const relatedIdentifiers =
      await this.relationshipEngine.getRelatedIdentifiers(type, value);
    const graph = await this.graphEngine.getNetwork(
      type,
      value,
      options?.depth ?? 2,
    );

    const shouldPersist =
      Boolean(options?.persistEvaluation) && Boolean(options?.transaction);

    let evaluationId: string | undefined;
    if (shouldPersist && options?.transaction) {
      const evaluationReason = await this.resolveEvaluationReason(
        options.transaction.id,
      );
      const evaluation = await this.featureSnapshotService.startEvaluation({
        fraudTransactionId: options.transaction.id,
        evaluationReason,
      });
      evaluationId = evaluation.id;
      this.logger.log(
        `evaluation started id=${evaluation.id} fraudTransactionId=${options.transaction.id} version=${evaluation.evaluationVersion} reason=${evaluationReason}`,
      );
    }

    try {
      const featureResult = await this.featureEngine.calculateFeatures({
        type,
        value,
        relatedIdentifiers,
        transaction: options?.transaction ?? null,
      });
      this.logger.log(
        `number of calculated features=${featureResult.calculatedFeatures.length}` +
          (options?.transaction
            ? ` fraudTransactionId=${options.transaction.id}`
            : ''),
      );

      // Persist the exact in-memory values before rules so RulesEngine and
      // fraud_transaction_features stay consistent for this evaluation.
      if (evaluationId && options?.transaction) {
        await this.featureSnapshotService.saveFeatureSnapshot({
          evaluationId,
          fraudTransactionId: options.transaction.id,
          calculatedFeatures: featureResult.calculatedFeatures,
        });
        this.logger.log(
          `feature snapshot persisted evaluationId=${evaluationId} features=${featureResult.calculatedFeatures.length}`,
        );
      }

      const features = featureResult.featureMap;
      const triggeredRules = await this.rulesEngine.evaluate(features);
      this.logger.log(`number of triggered rules=${triggeredRules.length}`);

      const risk = await this.riskScoreEngine.calculate(triggeredRules);
      this.logger.log(`final risk score=${risk.riskScore}`);
      this.logger.log(`final risk level=${risk.riskLevel}`);

      const policy = await this.policyEngine.evaluatePolicy({
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        defaultDecision: risk.decision,
        features,
      });
      this.logger.log(`policy decision=${policy.finalDecision}`);

      const reasons = triggeredRules.map((rule) => rule.message);

      let alertCreated = false;
      if (
        options?.createAlert &&
        options.rootIdentifier &&
        options.transaction
      ) {
        const alertResult = await this.alertEngine.evaluateAndCreateAlert({
          transactionId: options.sourceTransactionId ?? options.transaction.id,
          rootIdentifier: options.rootIdentifier,
          features,
          relatedIdentifiers,
          graph,
          triggeredRules,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          defaultDecision: risk.decision,
          finalDecision: policy.finalDecision,
          displayColor: risk.displayColor,
          policyActions: policy.policyActions,
          reasons,
          source: 'INGESTION',
        });
        alertCreated = alertResult.created;
      }

      if (evaluationId) {
        await this.featureSnapshotService.completeEvaluation({
          evaluationId,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          policyDecision: policy.finalDecision,
        });
        this.logger.log(`evaluation completed evaluationId=${evaluationId}`);
      }

      return {
        relatedIdentifiers,
        graph,
        features,
        calculatedFeatures: featureResult.calculatedFeatures,
        triggeredRules,
        risk,
        policy,
        reasons,
        alertCreated,
        evaluationId,
      };
    } catch (error) {
      if (evaluationId) {
        await this.markEvaluationFailed(
          evaluationId,
          options?.transaction?.id,
          options?.sourceTransactionId,
          error,
        );
      }
      throw error;
    }
  }

  private async resolveEvaluationReason(
    fraudTransactionId: string,
  ): Promise<FraudEvaluationReason> {
    const latest =
      await this.featureSnapshotService.getLatestEvaluation(fraudTransactionId);

    if (latest?.status === FraudEvaluationStatus.FAILED) {
      return FraudEvaluationReason.SYSTEM_RETRY;
    }

    return FraudEvaluationReason.INGESTION;
  }

  private async markEvaluationFailed(
    evaluationId: string,
    fraudTransactionId: string | undefined,
    sourceTransactionId: string | undefined,
    originalError: unknown,
  ): Promise<void> {
    try {
      await this.featureSnapshotService.failEvaluation({ evaluationId });
      this.logger.error(
        `evaluation failed evaluationId=${evaluationId}` +
          ` fraudTransactionId=${fraudTransactionId ?? 'n/a'}` +
          ` sourceTransactionId=${sourceTransactionId ?? 'n/a'}` +
          ` error=${(originalError as Error).message}`,
      );
    } catch (failError) {
      this.logger.error(
        `failEvaluation secondary error for evaluationId=${evaluationId}: ${
          (failError as Error).message
        }`,
      );
    }
  }
}
