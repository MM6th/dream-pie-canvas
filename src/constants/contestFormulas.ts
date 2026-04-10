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
