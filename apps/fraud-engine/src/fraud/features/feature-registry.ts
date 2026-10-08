/**
 * Injection token used to register all feature calculator plugins.
 * FeatureEngine receives every provider bound to this token as an array.
 */
export const FEATURE_CALCULATORS = Symbol('FEATURE_CALCULATORS');
