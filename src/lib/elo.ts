/**
 * Standard ELO rating calculation.
 *
 * expectedA = 1 / (1 + 10^((ratingB - ratingA) / 400))
 * newRating  = rating + K * (score - expected)
 *
 * K = 32, starting rating 1200.
 */

export const K_FACTOR = 32;
export const INITIAL_ELO = 1200;

/** Outcome of a match from player A's perspective. */
export type Outcome = 'win' | 'loss' | 'draw';

/** Expected score (0..1) for player A given both ratings. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * New ratings for both players after a match, given the outcome from
 * player A's perspective. Results are rounded to whole numbers.
 */
export function computeNewRatings(
  ratingA: number,
  ratingB: number,
  outcomeForA: Outcome,
): { newRatingA: number; newRatingB: number } {
  const expectedA = expectedScore(ratingA, ratingB);
  const scoreA = outcomeForA === 'win' ? 1 : outcomeForA === 'draw' ? 0.5 : 0;
  const scoreB = 1 - scoreA;

  return {
    newRatingA: Math.round(ratingA + K_FACTOR * (scoreA - expectedA)),
    newRatingB: Math.round(ratingB + K_FACTOR * (scoreB - (1 - expectedA))),
  };
}
