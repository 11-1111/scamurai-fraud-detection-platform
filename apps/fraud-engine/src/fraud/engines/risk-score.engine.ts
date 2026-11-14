import { Injectable, Logger } from '@nestjs/common';
import { RiskScoreResult, TriggeredRule } from '../types/fraud.types';
import { RiskClassificationEngine } from './risk-classification.engine';

/*
 * The scale the configured risk levels in fraud_risk_levels are expressed
 * against. Scores outside it match no configured band, which is why they are
 * clamped rather than passed through.
 */
const MIN_RISK_SCORE = 0;
const MAX_RISK_SCORE = 100;

@Injectable()
export class RiskScoreEngine {
  private readonly logger = new Logger(RiskScoreEngine.name);

  private readonly reportedRules = new Set<string>();

  constructor(
    private readonly riskClassificationEngine: RiskClassificationEngine,
  ) {}

  /*
   * Risk score as the sum of the triggered rules' impacts, clamped to the
   * configured scale.
   *
   * The additive model is a deliberate limitation, not an oversight: rule
   * impacts are not independent, so two rules firing on the same underlying
   * behaviour count twice, and the total is an ordering signal rather than a
   * probability. Replacing it with a calibrated model is worth doing, and is
   * not something that can be slipped in here -- the risk-level bands in
   * fraud_risk_levels are configured as ranges on this exact scale, so
   * changing how scores are distributed silently reclassifies every
   * transaction. That belongs with the work that recalibrates the bands.
   *
   * What is fixed here is the arithmetic around it.
   */
  async calculate(triggeredRules: TriggeredRule[]): Promise<RiskScoreResult> {
    let rawScore = 0;

    for (const rule of triggeredRules) {
      const impact = Number(rule.scoreImpact);

      if (!Number.isFinite(impact)) {
        /*
         * One unusable impact used to poison the whole sum: the total became
         * NaN, NaN matched no configured band, and the fallback ladder
         * compares NaN against every threshold as false -- so a single bad
         * rule quietly classified every transaction as LOW / ALLOW. Failing
         * open is the worst possible direction for this to fail in.
         */
        this.reportUnusableImpact(rule);
        continue;
      }

      rawScore += impact;
    }

    /*
     * Clamped at both ends. The upper bound was already here; the lower one
     * was not, so a negative impact -- which nothing in the schema prevents
     * -- produced a negative score that matched no band and fell through to
     * the hardcoded ladder.
     */
    const riskScore = Math.min(
      MAX_RISK_SCORE,
      Math.max(MIN_RISK_SCORE, rawScore),
    );

    const classification =
      await this.riskClassificationEngine.classify(riskScore);

    return {
      riskScore,
      /*
       * Kept because the clamp destroys information an analyst wants: ten
       * critical rules and one both score 100. Classification uses the
       * clamped value, so bands are unaffected, but a queue can still rank
       * the ten above the one.
       */
      rawScore,
      riskLevel: classification.riskLevel,
      decision: classification.defaultDecision,
      displayColor: classification.displayColor,
    };
  }

  private reportUnusableImpact(rule: TriggeredRule): void {
    if (this.reportedRules.has(rule.ruleCode)) {
      return;
    }

    this.reportedRules.add(rule.ruleCode);
    this.logger.warn(
      `Rule ${rule.ruleCode} has a score impact that is not a number ` +
        `(${String(rule.scoreImpact)}); it contributed nothing to the score.`,
    );
  }
}
