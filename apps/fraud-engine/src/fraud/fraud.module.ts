import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudAlertHistoryEntity } from '../database/entities/fraud-alert-history.entity';
import { FraudAlertPolicyActionEntity } from '../database/entities/fraud-alert-policy-action.entity';
import { FraudAlertTriggeredRuleEntity } from '../database/entities/fraud-alert-triggered-rule.entity';
import { FraudAlertEntity } from '../database/entities/fraud-alert.entity';
import { FraudIdentifierEntity } from '../database/entities/fraud-identifier.entity';
import { FraudPolicyRuleEntity } from '../database/entities/fraud-policy-rule.entity';
import { FraudRiskLevelEntity } from '../database/entities/fraud-risk-level.entity';
import { FraudRuleConfigEntity } from '../database/entities/fraud-rule-config.entity';
import { FraudTransactionEntity } from '../database/entities/fraud-transaction.entity';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { FeatureModule } from './features/feature.module';
import { FraudEvaluationModule } from '../fraud-evaluation/fraud-evaluation.module';
import { FraudController } from './fraud.controller';
import { AlertEngine } from './engines/alert.engine';
import { FeatureEngine } from './engines/feature.engine';
import { GraphEngine } from './engines/graph.engine';
import { PolicyEngine } from './engines/policy.engine';
import { RelationshipEngine } from './engines/relationship.engine';
import { RiskClassificationEngine } from './engines/risk-classification.engine';
import { RiskScoreEngine } from './engines/risk-score.engine';
import { RulesEngine } from './engines/rules.engine';
import { FraudConfigService } from './fraud-config.service';
import { FraudEvaluationService } from './fraud-evaluation.service';
import { FraudService } from './fraud.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        FraudIdentifierEntity,
        FraudTransactionEntity,
        FraudRuleConfigEntity,
        FraudRiskLevelEntity,
        FraudPolicyRuleEntity,
        FraudAlertEntity,
        FraudAlertTriggeredRuleEntity,
        FraudAlertPolicyActionEntity,
        FraudAlertHistoryEntity,
      ],
      'fraud',
    ),
    Neo4jModule,
    FeatureModule,
    FraudEvaluationModule,
  ],
  controllers: [FraudController],
  providers: [
    FraudService,
    FraudConfigService,
    RelationshipEngine,
    GraphEngine,
    FeatureEngine,
    RulesEngine,
    RiskScoreEngine,
    RiskClassificationEngine,
    PolicyEngine,
    FraudEvaluationService,
    AlertEngine,
  ],
  exports: [
    FraudService,
    FraudEvaluationService,
    RelationshipEngine,
    FeatureEngine,
    RulesEngine,
    RiskScoreEngine,
    RiskClassificationEngine,
    PolicyEngine,
    GraphEngine,
    AlertEngine,
  ],
})
export class FraudModule {}
