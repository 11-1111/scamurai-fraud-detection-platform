import { Injectable } from '@nestjs/common';
import {
  BOOLEAN_OPERATORS,
  FEATURE_CALCULATOR_VERSION,
} from '../feature-calculator.constants';
import { FeatureCalculator } from '../feature-calculator.interface';
import { FeatureContext } from '../feature-context';
import { FeatureUtilsService } from '../feature-utils.service';

@Injectable()
export class OrderTrackingIdSuccessExistsFeature implements FeatureCalculator {
  readonly featureName = 'orderTrackingIdSuccessExists';
  readonly label = 'Successful order tracking ID already exists';
  readonly description = 'Prevent duplicate successful transaction processing.';
  readonly category = 'Replay / Duplicate Prevention';
  readonly dataType = 'boolean' as const;
  readonly supportedOperators = BOOLEAN_OPERATORS;
  readonly defaultValue = false;
  readonly version = FEATURE_CALCULATOR_VERSION;
  readonly executionOrder = 300;

  constructor(private readonly utils: FeatureUtilsService) {}

  async calculate(context: FeatureContext): Promise<boolean> {
    const transaction = context.transaction;

    const orderTrackingId =
      transaction?.orderTrackingId?.trim() ||
      (context.type?.trim().toLowerCase() === 'order_tracking_id'
        ? context.value?.trim()
        : undefined);

    if (!orderTrackingId) {
      return false;
    }

    const exists = await this.utils.successfulTransactionExists(
      orderTrackingId,
      transaction?.id,
    );

    return exists;
  }
}
