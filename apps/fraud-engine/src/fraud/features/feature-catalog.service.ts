import { Inject, Injectable } from '@nestjs/common';
import { FeatureCalculator } from './feature-calculator.interface';
import { sortFeatureCalculators } from './feature-calculator.sort';
import { FEATURE_CALCULATORS } from './feature-registry';

export interface FeatureCatalogEntry {
  featureName: string;
  label: string;
  description: string;
  category: string;
  dataType: 'number' | 'boolean';
  supportedOperators: string[];
  unit?: string;
  windowSeconds?: number;
  version: string;
}

@Injectable()
export class FeatureCatalogService {
  private readonly sortedCalculators: FeatureCalculator[];

  constructor(
    @Inject(FEATURE_CALCULATORS)
    calculators: FeatureCalculator[],
  ) {
    this.sortedCalculators = sortFeatureCalculators(calculators);
  }

  getAvailableFeatures(): FeatureCatalogEntry[] {
    return this.sortedCalculators.map((calculator) =>
      this.toCatalogEntry(calculator),
    );
  }

  getFeature(featureName: string): FeatureCatalogEntry | undefined {
    return this.getAvailableFeatures().find(
      (feature) => feature.featureName === featureName,
    );
  }

  private toCatalogEntry(calculator: FeatureCalculator): FeatureCatalogEntry {
    return {
      featureName: calculator.featureName,
      label: calculator.label,
      description: calculator.description,
      category: calculator.category,
      dataType: calculator.dataType,
      supportedOperators: [...calculator.supportedOperators],
      unit: calculator.unit,
      windowSeconds: calculator.windowSeconds,
      version: calculator.version,
    };
  }
}
