import type { ChallengeMatch, MatchResult, Member } from '@prisma/client';
import { prisma } from './prisma';

/** One rated match that moved a member's ELO — a season fixture or a challenge. */
export interface EloEvent {
  id: string;
  /** Epoch millis — MatchResult.recordedAt or ChallengeMatch.playedAt. */
  date: number;
  before: number;
  after: number;
  outcome: 'win' | 'loss' | 'draw';
  opponentId: string;
  kind: 'season' | 'challenge';
  /** Where it happened, e.g. "Bloodmoon Rumble · Round 3" or "Challenge". */
  context: string;
}

/** Lightweight member card used for avatars and the opponent lookup. */
export interface EloPerson {
  id: string;
  name: string;
  nickname: string | null;
  avatarPath: string | null;
  colors: string | null;
  active: boolean;
}

export interface EloHistory {
  member: EloPerson;
  currentElo: number;
  /** Rating before their first recorded match (falls back to current ELO). */
  startElo: number;
  /** When the trail starts — member join date, rated at startElo. */
  anchorDate: number;
  peakElo: number;
  /** Oldest → newest. */
  events: EloEvent[];
}

type ResultWithMatchup = MatchResult & {
  matchup: { round: number; player1Id: string; player2Id: string; season: { name: string } };
};

type MemberCard = Omit<Member, 'createdAt'> & { createdAt: number };

/**
 * Pure builder so the merging/ordering logic is unit-testable without a
 * database: folds every recorded result and challenge into one timeline
 * per member. Members without rated matches get no history (only `people`).
 */
export function buildEloHistories(members: MemberCard[], results: ResultWithMatchup[], challenges: ChallengeMatch[]): {
  people: EloPerson[];
  histories: EloHistory[];
} {
  const people: EloPerson[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    nickname: m.nickname,
    avatarPath: m.avatarPath,
    colors: m.colors,
    active: m.active,
  }));

  const byMember = new Map<string, EloEvent[]>();
  const push = (memberId: string, event: EloEvent) => {
    const list = byMember.get(memberId);
    if (list) list.push(event);
    else byMember.set(memberId, [event]);
  };

  for (const result of results) {
    const { player1Id, player2Id } = result.matchup;
    const context = `${result.matchup.season.name} · Round ${result.matchup.round}`;
    const date = result.recordedAt.getTime();
    const outcomeFor = (id: string): EloEvent['outcome'] =>
      result.isDraw ? 'draw' : result.winnerId === id ? 'win' : 'loss';

    push(player1Id, {
      id: result.id,
      date,
      before: result.player1EloBefore,
      after: result.player1EloAfter,
      outcome: outcomeFor(player1Id),
      opponentId: player2Id,
      kind: 'season',
      context,
    });
    push(player2Id, {
      id: result.id,
      date,
      before: result.player2EloBefore,
      after: result.player2EloAfter,
      outcome: outcomeFor(player2Id),
      opponentId: player1Id,
      kind: 'season',
      context,
    });
  }

  for (const c of challenges) {
    const date = c.playedAt.getTime();
    const outcomeFor = (id: string): EloEvent['outcome'] =>
      c.isDraw ? 'draw' : c.winnerId === id ? 'win' : 'loss';

    push(c.player1Id, {
      id: c.id,
      date,
      before: c.player1EloBefore,
      after: c.player1EloAfter,
      outcome: outcomeFor(c.player1Id),
      opponentId: c.player2Id,
      kind: 'challenge',
      context: 'Challenge',
    });
    push(c.player2Id, {
      id: c.id,
      date,
      before: c.player2EloBefore,
      after: c.player2EloAfter,
      outcome: outcomeFor(c.player2Id),
      opponentId: c.player1Id,
      kind: 'challenge',
      context: 'Challenge',
    });
  }

  const histories: EloHistory[] = [];
  for (const m of members) {
    const events = byMember.get(m.id);
    if (!events || events.length === 0) continue;

    events.sort((a, b) => a.date - b.date || a.id.localeCompare(b.id));
    const firstEvent = events[0];
    // Join-date anchor carries the rating they walked in with; if the clock
    // somehow puts creation after the first match, anchor just before it.
    const anchorDate = Math.min(m.createdAt, firstEvent.date - 1);
    const startElo = firstEvent.before;
    const peakElo = events.reduce((peak, e) => Math.max(peak, e.after), startElo);

    histories.push({
      member: {
        id: m.id,
        name: m.name,
        nickname: m.nickname,
        avatarPath: m.avatarPath,
        colors: m.colors,
        active: m.active,
      },
      currentElo: m.elo,
      startElo,
      anchorDate,
      peakElo,
      events,
    });
  }

  // Legend order mirrors the leaderboard: strongest rating first.
  histories.sort((a, b) => b.currentElo - a.currentElo || a.member.name.localeCompare(b.member.name));
  return { people, histories };
}

/** Everyone's ELO timeline across season fixtures and challenges. */
export async function getEloHistories() {
  const [members, results, challenges] = await Promise.all([
    prisma.member.findMany({ orderBy: { name: 'asc' } }),
    prisma.matchResult.findMany({ include: { matchup: { include: { season: true } } } }),
    prisma.challengeMatch.findMany(),
  ]);

  return buildEloHistories(
    members.map(({ createdAt, ...rest }) => ({ ...rest, createdAt: createdAt.getTime() })),
    results,
    challenges,
  );
}
