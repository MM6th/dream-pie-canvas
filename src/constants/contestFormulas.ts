/**
 * Scoring formula for live contest sessions.
 * Used by the scoring engine to calculate final points.
 */
export const CONTEST_SCORING_FORMULA = {
  description: 'gifts + poll votes won × skill % × sample intensity = final points',
  calculate: ({
    gifts,
    pollVotesWon,
    skillPercent,
    sampleIntensity,
  }: {
    gifts: number;
    pollVotesWon: number;
    skillPercent: number;
    sampleIntensity: number;
  }): number => {
    return gifts + pollVotesWon * (skillPercent / 100) * (sampleIntensity / 100);
  },
};

/**
 * Sample Ratio Formula with Log Dampening
 *
 * Purpose: Levels the playing field so a contestant with fewer viewers
 * isn't automatically crushed by someone with a massive audience.
 * Instead of raw fan count, sample intensity is based on ENGAGEMENT RATE
 * (voters/viewers) with a log dampening factor to prevent tiny audiences
 * from gaming the system (e.g. 3/3 = 100% shouldn't beat 800/1000 = 80%).
 *
 * Formula: (voters / viewers) × log2(viewers + 1) × scaleFactor
 * - voters: number of fans/supporters who actively participated (voted/entered)
 * - viewers: total viewers on that contestant's side
 * - log2(viewers + 1): dampening — gives a mild bonus for drawing larger crowds
 * - scaleFactor: normalises the result into a 0-100 range
 *
 * The scaleFactor is calibrated so that at the max expected viewer count
 * (e.g. 1000 viewers, 100% engagement) the result caps at ~100.
 */
export const SAMPLE_RATIO_FORMULA = {
  description: '(voters / viewers) × log2(viewers + 1) × scale = sample intensity (0-100)',

  /** Max viewers used to calibrate the scale factor */
  MAX_EXPECTED_VIEWERS: 1000,

  calculate: ({
    voters,
    viewers,
  }: {
    voters: number;
    viewers: number;
  }): number => {
    if (viewers <= 0 || voters <= 0) return 0;
    const engagementRate = Math.min(voters / viewers, 1); // cap at 100%
    const logDampening = Math.log2(viewers + 1);
    // Scale factor: at 1000 viewers with 100% engagement, log2(1001) ≈ 9.97
    // We want that to equal ~100, so scale = 100 / log2(1001) ≈ 10.03
    const scaleFactor = 100 / Math.log2(1001);
    const raw = engagementRate * logDampening * scaleFactor;
    return Math.min(Math.round(raw), 100);
  },
};
