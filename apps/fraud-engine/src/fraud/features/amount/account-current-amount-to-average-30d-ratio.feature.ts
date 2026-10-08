import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class AccountCurrentAmountToAverage30dRatioFeature
  implements FeatureCalculator
{
  readonly featureName = 'accountCurrentAmountToAverage30dRatio';
  readonly label = 'Current amount to 30-day account average ratio';
  readonly description =
    'Detect transaction amount much higher than normal for the account.';
  readonly category = 'Amount Baseline';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'ratio';
  readonly windowSeconds = 2592000;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 100;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const transaction = context.transaction;
    const paymentAccount = transaction?.paymentAccount?.trim();
    const currentAmount = Number(transaction?.amountValue ?? 0);
    if (!transaction || !paymentAccount || !currentAmount) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(transaction.transactionDate);
    const historicalAverage =
      await this.utils.getAverageAmountForFieldLastDays(
        'paymentAccount',
        paymentAccount,
        referenceDate,
        30,
        transaction.id,
      );

    if (!historicalAverage) {
      return 0;
    }

    return this.utils.roundRatio(currentAmount / historicalAverage);
  }
}
