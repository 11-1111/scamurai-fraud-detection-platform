import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NUMERIC_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class FailedTxnCountPerDeviceLast15MinutesFeature
  implements FeatureCalculator
{
  readonly featureName = 'failedTxnCountPerDeviceLast15Minutes';
  readonly label = 'Failed transactions per device in last 15 minutes';
  readonly description = 'Detect repeated failed attempts from one device.';
  readonly category = 'Velocity';
  readonly dataType = 'number' as const;
  readonly supportedOperators = DEFAULT_NUMERIC_OPERATORS;
  readonly defaultValue = 0;
  readonly unit = 'transactions';
  readonly windowSeconds = 900;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 40;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<number> {
    const deviceFingerprint = context.transaction?.deviceFingerprint?.trim();
    if (!deviceFingerprint) {
      return 0;
    }

    const referenceDate = this.utils.normalizeDate(
      context.transaction?.transactionDate,
    );
    const fromDate = this.utils.minutesAgo(referenceDate, 15);

    return this.utils.countFailedTransactionsByField(
      'deviceFingerprint',
      deviceFingerprint,
      fromDate,
      referenceDate,
    );
  }
}
