import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class IpDistinctCardsLast15MinutesFeature implements FeatureCalculator {
  readonly featureName = 'ipDistinctCardsLast15Minutes';
  readonly label = 'Distinct cards per IP in last 15 minutes';
  readonly description = 'Detect one IP trying many cards/accounts.';
  readonly category = 'Velocity';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'accounts';
  readonly windowSeconds = 900;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 60;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const ipAddress = context.transaction?.ipAddress?.trim();
    if (!ipAddress) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(
      context.transaction?.transactionDate,
    );
    const fromDate = this.utils.minutesAgo(referenceDate, 15);

    return this.utils.distinctCountByFieldWhere(
      'ipAddress',
      ipAddress,
      'paymentAccount',
      fromDate,
      referenceDate,
    );
  }
}
