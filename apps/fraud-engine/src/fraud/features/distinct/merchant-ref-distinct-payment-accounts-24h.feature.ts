import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class MerchantRefDistinctPaymentAccounts24hFeature
  implements FeatureCalculator
{
  readonly featureName = 'merchantRefDistinctPaymentAccounts24h';
  readonly label =
    'Distinct payment accounts per merchant reference in 24 hours';
  readonly description =
    'Detect one order/reference being tried with many cards.';
  readonly category = 'Merchant Monitoring';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'accounts';
  readonly windowSeconds = 86400;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 210;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const merchantRef = context.transaction?.merchantRef?.trim();
    if (!merchantRef) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(
      context.transaction?.transactionDate,
    );
    const fromDate = this.utils.hoursAgo(referenceDate, 24);

    return this.utils.distinctCountByFieldWhere(
      'merchantRef',
      merchantRef,
      'paymentAccount',
      fromDate,
      referenceDate,
    );
  }
}
