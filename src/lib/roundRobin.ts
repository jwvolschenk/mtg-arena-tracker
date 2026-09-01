/**
 * Round-robin schedule generation using the circle method.
 *
 * For N players: if N is odd a placeholder BYE is added so the circle
 * rotation works, and the pair containing the BYE is skipped (that
 * player sits the round out). Even N yields N-1 rounds; odd N yields
 * N rounds (each player gets exactly one bye round).
 */

export const BYE = '__BYE__';

export interface Pairing {
  player1Id: string;
  player2Id: string;
}

export interface ScheduledMatchup extends Pairing {
  round: number;
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pure round-robin over the given player ids (in the order provided).
 * Returns one array of pairings per round. Throws if fewer than 2
 * players or if ids are not unique.
 */
export function generateRoundRobin(playerIds: readonly string[]): Pairing[][] {
  if (playerIds.length < 2) {
    throw new Error('Round-robin needs at least 2 players');
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error('Round-robin player ids must be unique');
  }

  const players = [...playerIds];
  if (players.length % 2 === 1) players.push(BYE);

  const n = players.length;
  const fixed = players[0];
  const rotating = players.slice(1);
  const rounds: Pairing[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const arranged = [fixed, ...rotating];
    const pairings: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arranged[i];
      const b = arranged[n - 1 - i];
      if (a !== BYE && b !== BYE) {
        pairings.push({ player1Id: a, player2Id: b });
      }
    }
    rounds.push(pairings);
    rotating.unshift(rotating.pop()!);
  }

  return rounds;
}

/**
 * Full schedule for a season: shuffles the players so pairings are not
 * predictable, then flattens the round-robin into matchups tagged with
 * their round number (1-based).
 */
export function generateSchedule(playerIds: readonly string[]): ScheduledMatchup[] {
  const shuffled = shuffle(playerIds);
  return generateRoundRobin(shuffled).flatMap((pairings, index) =>
    pairings.map((pairing) => ({ round: index + 1, ...pairing })),
  );
}
