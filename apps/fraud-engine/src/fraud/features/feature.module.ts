import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudTransactionEntity } from '../../database/entities/fraud-transaction.entity';
import { AccountCurrentAmountToAverage30dRatioFeature } from './amount/account-current-amount-to-average-30d-ratio.feature';
import { AccountTodayTotalToAverageDaily30dRatioFeature } from './amount/account-today-total-to-average-daily-30d-ratio.feature';
import { MerchantTodayTotalToAverageDaily7dRatioFeature } from './amount/merchant-today-total-to-average-daily-7d-ratio.feature';
import { DeviceDistinctCardsLast1HourFeature } from './distinct/device-distinct-cards-last-1-hour.feature';
import { IpDistinctCardsLast15MinutesFeature } from './distinct/ip-distinct-cards-last-15-minutes.feature';
import { MerchantDistinctCardsLast15MinutesFeature } from './distinct/merchant-distinct-cards-last-15-minutes.feature';
import { MerchantRefDistinctPaymentAccounts24hFeature } from './distinct/merchant-ref-distinct-payment-accounts-24h.feature';
import { FeatureCalculator } from './feature-calculator.interface';
import { FeatureCatalogService } from './feature-catalog.service';
import { FEATURE_CALCULATORS } from './feature-registry';
import { FeatureRegistryValidator } from './feature-registry.validator';
import { FeatureUtilsService } from './feature-utils.service';
import { OrderTrackingIdSuccessExistsFeature } from './replay/order-tracking-id-success-exists.feature';
import { FailedTxnCountPerCardLast15MinutesFeature } from './velocity/failed-txn-count-per-card-last-15-minutes.feature';
import { FailedTxnCountPerDeviceLast15MinutesFeature } from './velocity/failed-txn-count-per-device-last-15-minutes.feature';
import { FailedTxnCountPerEmailLast15MinutesFeature } from './velocity/failed-txn-count-per-email-last-15-minutes.feature';
import { FailedTxnCountPerPhoneLast15MinutesFeature } from './velocity/failed-txn-count-per-phone-last-15-minutes.feature';

const FEATURE_CALCULATOR_CLASSES = [
  FailedTxnCountPerCardLast15MinutesFeature,
  FailedTxnCountPerEmailLast15MinutesFeature,
  FailedTxnCountPerPhoneLast15MinutesFeature,
  FailedTxnCountPerDeviceLast15MinutesFeature,
  AccountCurrentAmountToAverage30dRatioFeature,
  AccountTodayTotalToAverageDaily30dRatioFeature,
  MerchantTodayTotalToAverageDaily7dRatioFeature,
  DeviceDistinctCardsLast1HourFeature,
  IpDistinctCardsLast15MinutesFeature,
  MerchantDistinctCardsLast15MinutesFeature,
  MerchantRefDistinctPaymentAccounts24hFeature,
  OrderTrackingIdSuccessExistsFeature,
];

@Module({
  imports: [TypeOrmModule.forFeature([FraudTransactionEntity], 'fraud')],
  providers: [
    FeatureUtilsService,
    FeatureCatalogService,
    FeatureRegistryValidator,
    ...FEATURE_CALCULATOR_CLASSES,
    {
      provide: FEATURE_CALCULATORS,
      useFactory: (...calculators: FeatureCalculator[]): FeatureCalculator[] =>
        calculators,
      inject: FEATURE_CALCULATOR_CLASSES,
    },
  ],
  exports: [FeatureUtilsService, FeatureCatalogService, FEATURE_CALCULATORS],
})
export class FeatureModule {}
