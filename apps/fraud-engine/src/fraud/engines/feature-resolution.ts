import { FraudFeatureValue, FraudFeatures } from '../types/fraud.types';

/*
 * Reading a feature value for comparison, shared by the rules engine and the
 * policy engine.
 *
 * Both used to coerce with `Number(value ?? 0)`, which collapsed two
 * distinctions that matter:
 *
 *   absent is not zero       -- a feature that was never calculated has no
 *                               value, and zero is a value
 *   unevaluable is not false -- false means the comparison was made and did
 *                               not hold
 *
 * Collapsing the first made every `<` rule fire on every transaction when
 * its feature was missing. Collapsing the second made a misconfigured rule
 * indistinguishable from a rule that simply did not match, so nobody found
 * out it was broken.
 */

export type ResolvedFeature =
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'absent' }
  | { kind: 'unusable' };

/** A feature that can actually be compared. */
export type UsableFeature = Extract<
  ResolvedFeature,
  { kind: 'boolean' } | { kind: 'number' }
>;

export function resolveFeature(
  features: FraudFeatures,
  featureName: string,
): ResolvedFeature {
  if (!Object.prototype.hasOwnProperty.call(features, featureName)) {
    return { kind: 'absent' };
  }

  const raw: FraudFeatureValue | undefined = features[featureName];

  if (raw === undefined || raw === null) {
    return { kind: 'absent' };
  }

  if (typeof raw === 'boolean') {
    return { kind: 'boolean', value: raw };
  }

  if (typeof raw === 'number') {
    // NaN and Infinity compare false against everything, which would make
    // the rule look evaluated when it was not.
    return Number.isFinite(raw)
      ? { kind: 'number', value: raw }
      : { kind: 'unusable' };
  }

  /*
   * Numeric strings are accepted: SQL Server returns DECIMAL as a string
   * through some driver paths, and a feature that has been round-tripped
   * through storage should still compare.
   */
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return { kind: 'unusable' };
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed)
      ? { kind: 'number', value: parsed }
      : { kind: 'unusable' };
  }

  // An object or an array cannot be compared against a numeric threshold.
  return { kind: 'unusable' };
}

/*
 * Compare a resolved feature against a numeric threshold.
 *
 * null means the comparison could not be made -- an operator that does not
 * apply, or one the engine does not implement -- which is not the same as
 * false.
 */
export function compareFeature(
  feature: UsableFeature,
  operator: string | undefined,
  thresholdValue: number,
): boolean | null {
  if (feature.kind === 'boolean') {
    // Configuration expresses a boolean threshold as 1/0, or any non-zero as
    // true, without coercing the feature itself to a number.
    const thresholdAsBoolean = thresholdValue !== 0;

    switch (operator) {
      case '=':
        return feature.value === thresholdAsBoolean;
      case '!=':
        return feature.value !== thresholdAsBoolean;
      default:
        // Ordering a boolean is a configuration mistake, not a false result.
        return null;
    }
  }

  switch (operator) {
    case '>':
      return feature.value > thresholdValue;
    case '>=':
      return feature.value >= thresholdValue;
    case '<':
      return feature.value < thresholdValue;
    case '<=':
      return feature.value <= thresholdValue;
    case '=':
      return feature.value === thresholdValue;
    case '!=':
      return feature.value !== thresholdValue;
    default:
      return null;
  }
}

/*
 * A configured numeric bound, or null when there is no bound.
 *
 * TypeORM returns null -- not undefined -- for a nullable column, so a
 * `!== undefined` guard lets null straight through to the comparison, where
 * `score > null` coerces to `score > 0`. A bound meaning "unlimited" then
 * excluded everything above zero.
 */
export function resolveBound(
  value: number | null | undefined,
):
  | { kind: 'unbounded' }
  | { kind: 'bound'; value: number }
  | { kind: 'unusable' } {
  if (value === null || value === undefined) {
    return { kind: 'unbounded' };
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? { kind: 'bound', value: parsed }
    : { kind: 'unusable' };
}
