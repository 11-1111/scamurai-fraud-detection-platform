import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import {
  AllowedTransactionField,
  FeatureUtilsService,
} from '../feature-utils.service';

@Injectable()
export class MerchantDistinctCardsLast15MinutesFeature
  implements FeatureCalculator
{
  readonly featureName = 'merchantDistinctCardsLast15Minutes';
  readonly label = 'Distinct cards per merchant in last 15 minutes';
  readonly description = 'Detect card testing at one merchant.';
  readonly category = 'Merchant Monitoring';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'accounts';
  readonly windowSeconds = 900;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 200;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const transaction = context.transaction;
    if (!transaction) {
      return 0;
    }

    const merchantEmail = transaction.merchantEmail?.trim();
    const merchantName = transaction.merchantName?.trim();
    const merchantField: AllowedTransactionField | null = merchantEmail
      ? 'merchantEmail'
      : merchantName
        ? 'merchantName'
        : null;
    const merchantValue = merchantEmail || merchantName;
    if (!merchantField || !merchantValue) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(transaction.transactionDate);
    const fromDate = this.utils.minutesAgo(referenceDate, 15);

    return this.utils.distinctCountByFieldWhere(
      merchantField,
      merchantValue,
      'paymentAccount',
      fromDate,
      referenceDate,
    );
  }
}
