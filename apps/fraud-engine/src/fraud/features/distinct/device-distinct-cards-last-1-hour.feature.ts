import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class DeviceDistinctCardsLast1HourFeature implements FeatureCalculator {
  readonly featureName = 'deviceDistinctCardsLast1Hour';
  readonly label = 'Distinct cards per device in last 1 hour';
  readonly description = 'Detect one device trying many cards/accounts.';
  readonly category = 'Velocity';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'accounts';
  readonly windowSeconds = 3600;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 50;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const deviceFingerprint = context.transaction?.deviceFingerprint?.trim();
    if (!deviceFingerprint) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(
      context.transaction?.transactionDate,
    );
    const fromDate = this.utils.hoursAgo(referenceDate, 1);

    return this.utils.distinctCountByFieldWhere(
      'deviceFingerprint',
      deviceFingerprint,
      'paymentAccount',
      fromDate,
      referenceDate,
    );
  }
}
