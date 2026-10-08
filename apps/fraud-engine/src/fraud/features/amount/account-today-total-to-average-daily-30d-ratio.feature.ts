import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class AccountTodayTotalToAverageDaily30dRatioFeature
  implements FeatureCalculator
{
  readonly featureName = 'accountTodayTotalToAverageDaily30dRatio';
  readonly label = 'Today total to 30-day daily account average ratio';
  readonly description =
    'Detect card/account spending much more today than normal.';
  readonly category = 'Amount Baseline';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'ratio';
  readonly windowSeconds = 2592000;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 110;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const transaction = context.transaction;
    const paymentAccount = transaction?.paymentAccount?.trim();
    if (!transaction || !paymentAccount) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(transaction.transactionDate);
    const startOfToday = this.utils.startOfDay(referenceDate);

    const todayTotal = await this.utils.getTotalAmountForFieldBetween(
      'paymentAccount',
      paymentAccount,
      startOfToday,
      referenceDate,
    );
    const averageDaily =
      await this.utils.getAverageDailyAmountForFieldPreviousDays(
        'paymentAccount',
        paymentAccount,
        referenceDate,
        30,
      );

    if (!averageDaily) {
      return 0;
    }

    return this.utils.roundRatio(todayTotal / averageDaily);
  }
}
