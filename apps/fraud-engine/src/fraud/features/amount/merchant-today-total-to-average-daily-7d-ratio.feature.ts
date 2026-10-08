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
export class MerchantTodayTotalToAverageDaily7dRatioFeature
  implements FeatureCalculator
{
  readonly featureName = 'merchantTodayTotalToAverageDaily7dRatio';
  readonly label = 'Merchant today total to 7-day daily average ratio';
  readonly description =
    'Detect merchant receiving much more today than normal.';
  readonly category = 'Amount Baseline';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'ratio';
  readonly windowSeconds = 604800;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 120;

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
    const startOfToday = this.utils.startOfDay(referenceDate);

    const todayTotal = await this.utils.getTotalAmountForFieldBetween(
      merchantField,
      merchantValue,
      startOfToday,
      referenceDate,
    );
    const averageDaily =
      await this.utils.getAverageDailyAmountForFieldPreviousDays(
        merchantField,
        merchantValue,
        referenceDate,
        7,
      );

    if (!averageDaily) {
      return 0;
    }

    return this.utils.roundRatio(todayTotal / averageDaily);
  }
}
