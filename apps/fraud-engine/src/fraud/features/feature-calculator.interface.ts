import { FeatureContext } from './feature-context';

export type FeatureDataType = 'number' | 'boolean';

export interface FeatureCalculator {
  readonly featureName: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly dataType: FeatureDataType;
  readonly supportedOperators: readonly string[];
  readonly defaultValue: number | boolean;
  readonly unit?: string;
  readonly windowSeconds?: number;
  readonly version: string;
  readonly executionOrder: number;

  calculate(context: FeatureContext): Promise<number | boolean>;
}
