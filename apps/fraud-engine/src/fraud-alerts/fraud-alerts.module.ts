import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudAlertHistoryEntity } from '../database/entities/fraud-alert-history.entity';
import { FraudAlertNoteEntity } from '../database/entities/fraud-alert-note.entity';
import { FraudAlertPolicyActionEntity } from '../database/entities/fraud-alert-policy-action.entity';
import { FraudAlertTriggeredRuleEntity } from '../database/entities/fraud-alert-triggered-rule.entity';
import { FraudAlertEntity } from '../database/entities/fraud-alert.entity';
import { FraudAlertsController } from './fraud-alerts.controller';
import { FraudAlertsService } from './fraud-alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        FraudAlertEntity,
        FraudAlertTriggeredRuleEntity,
        FraudAlertPolicyActionEntity,
        FraudAlertNoteEntity,
        FraudAlertHistoryEntity,
      ],
      'fraud',
    ),
  ],
  controllers: [FraudAlertsController],
  providers: [FraudAlertsService],
  exports: [FraudAlertsService],
})
export class FraudAlertsModule {}
