import { describe, expect, it } from 'vitest';
import { generateRoundRobin, generateSchedule, type Pairing } from './roundRobin';

function pairKey(pairing: Pairing): string {
  return [pairing.player1Id, pairing.player2Id].sort().join('|');
}

function allPairs(ids: string[]): Set<string> {
  const pairs = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.add([ids[i], ids[j]].sort().join('|'));
    }
  }
  return pairs;
}

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

function expectValidSchedule(playerIds: string[], expectedRounds: number) {
  const rounds = generateRoundRobin(playerIds);

  expect(rounds).toHaveLength(expectedRounds);

  const seen = new Set<string>();
  for (const round of rounds) {
    const playersThisRound = new Set<string>();
    for (const pairing of round) {
      // no duplicate pairings across the whole season
      const key = pairKey(pairing);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      // a player appears at most once per round
      expect(playersThisRound.has(pairing.player1Id)).toBe(false);
      expect(playersThisRound.has(pairing.player2Id)).toBe(false);
      playersThisRound.add(pairing.player1Id);
      playersThisRound.add(pairing.player2Id);
    }
  }

  // everyone plays everyone exactly once
  expect(seen).toEqual(allPairs(playerIds));
  return rounds;
}

describe('generateRoundRobin', () => {
  it('throws for fewer than 2 players', () => {
    expect(() => generateRoundRobin([])).toThrow(/at least 2/i);
    expect(() => generateRoundRobin(['solo'])).toThrow(/at least 2/i);
  });

  it('throws for duplicate player ids', () => {
    expect(() => generateRoundRobin(['a', 'a'])).toThrow(/unique/i);
  });

  it('schedules 2 players into a single round', () => {
    const rounds = expectValidSchedule(ids(2), 1);
    expect(rounds[0]).toEqual([{ player1Id: 'p1', player2Id: 'p2' }]);
  });

  it('schedules 4 players into 3 rounds of 2 matches', () => {
    const rounds = expectValidSchedule(ids(4), 3);
    for (const round of rounds) expect(round).toHaveLength(2);
  });

  it('schedules 6 players into 5 rounds of 3 matches', () => {
    const rounds = expectValidSchedule(ids(6), 5);
    for (const round of rounds) expect(round).toHaveLength(3);
  });

  it('schedules an odd number of players with one bye per round', () => {
    const players = ids(5);
    const rounds = expectValidSchedule(players, 5); // N rounds when odd
    for (const round of rounds) {
      expect(round).toHaveLength(2); // (5-1)/2 real matches
      // exactly one player sits out each round
      const playing = new Set(round.flatMap((p) => [p.player1Id, p.player2Id]));
      expect(playing.size).toBe(4);
    }
    // each player gets exactly one bye across the season
    const byesPerPlayer = new Map<string, number>(players.map((p) => [p, 0]));
    for (const round of rounds) {
      const playing = new Set(round.flatMap((p) => [p.player1Id, p.player2Id]));
      for (const player of players) {
        if (!playing.has(player)) byesPerPlayer.set(player, byesPerPlayer.get(player)! + 1);
      }
    }
    expect([...byesPerPlayer.values()].every((byes) => byes === 1)).toBe(true);
  });

  it('schedules 3 players into 3 rounds of 1 match', () => {
    const rounds = expectValidSchedule(ids(3), 3);
    for (const round of rounds) expect(round).toHaveLength(1);
  });
});

describe('generateSchedule', () => {
  it('tags every matchup with a 1-based round number', () => {
    const players = ids(5);
    const schedule = generateSchedule(players);
    const roundNumbers = new Set(schedule.map((m) => m.round));
    expect([...roundNumbers].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(schedule).toHaveLength(10); // C(5,2)
  });

  it('contains every pair exactly once regardless of shuffling', () => {
    const players = ids(8);
    const schedule = generateSchedule(players);
    const keys = schedule.map(pairKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys)).toEqual(allPairs(players));
  });
});
