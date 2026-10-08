import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudTransactionEvaluationEntity } from '../database/entities/fraud-transaction-evaluation.entity';
import { FraudTransactionFeatureEntity } from '../database/entities/fraud-transaction-feature.entity';
import { FeatureSnapshotService } from './feature-snapshot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [FraudTransactionEvaluationEntity, FraudTransactionFeatureEntity],
      'fraud',
    ),
  ],
  providers: [FeatureSnapshotService],
  exports: [FeatureSnapshotService],
})
export class FraudEvaluationModule {}
