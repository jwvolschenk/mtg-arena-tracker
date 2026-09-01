import { describe, expect, it } from 'vitest';
import { computeNewRatings, expectedScore, INITIAL_ELO, K_FACTOR } from './elo';

describe('expectedScore', () => {
  it('is 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it('is higher for the stronger player', () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1400)).toBeLessThan(0.5);
  });

  it('is symmetric: e(A,B) + e(B,A) = 1', () => {
    const a = expectedScore(1650, 1330);
    const b = expectedScore(1330, 1650);
    expect(a + b).toBeCloseTo(1);
  });

  it('saturates towards 1 at a 400+ point gap', () => {
    expect(expectedScore(1600, 1200)).toBeCloseTo(0.909, 3);
  });
});

describe('computeNewRatings', () => {
  it('moves ratings by K/2 in each direction for equal-rated players', () => {
    const result = computeNewRatings(1200, 1200, 'win');
    expect(result).toEqual({ newRatingA: 1216, newRatingB: 1184 });
  });

  it('leaves ratings unchanged for a draw between equal-rated players', () => {
    const result = computeNewRatings(1200, 1200, 'draw');
    expect(result).toEqual({ newRatingA: 1200, newRatingB: 1200 });
  });

  it('returns exactly the inverse result from the loser perspective', () => {
    const win = computeNewRatings(1200, 1200, 'win');
    const loss = computeNewRatings(1200, 1200, 'loss');
    expect(loss.newRatingA).toBe(win.newRatingB);
    expect(loss.newRatingB).toBe(win.newRatingA);
  });

  it('rewards an underdog win more than a favorite win', () => {
    const underdog = computeNewRatings(1000, 2000, 'win');
    const favorite = computeNewRatings(2000, 1000, 'win');
    expect(underdog.newRatingA - 1000).toBeGreaterThan(favorite.newRatingA - 2000);
  });

  it('barely changes ratings when a huge favorite wins', () => {
    const result = computeNewRatings(2000, 1000, 'win');
    expect(result.newRatingA).toBe(2000);
    expect(result.newRatingB).toBe(1000);
  });

  it('gives the underdog a big jump on an upset', () => {
    const result = computeNewRatings(1000, 2000, 'win');
    expect(result.newRatingA).toBe(1032);
    expect(result.newRatingB).toBe(1968);
  });

  it('splits points on a draw between unequal ratings', () => {
    const result = computeNewRatings(1200, 1400, 'draw');
    expect(result.newRatingA).toBe(1208);
    expect(result.newRatingB).toBe(1392);
  });

  it('keeps the rating pool roughly conserved', () => {
    const result = computeNewRatings(1483, 1171, 'win');
    const before = 1483 + 1171;
    const after = result.newRatingA + result.newRatingB;
    expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  });
});

describe('constants', () => {
  it('uses the documented K factor and starting rating', () => {
    expect(K_FACTOR).toBe(32);
    expect(INITIAL_ELO).toBe(1200);
  });
});
