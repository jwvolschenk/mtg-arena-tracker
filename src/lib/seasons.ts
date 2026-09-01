import { Prisma, type Season } from '@prisma/client';
import { ApiError } from './api';
import { computeNewRatings, type Outcome } from './elo';
import { prisma } from './prisma';
import { generateSchedule } from './roundRobin';

export const seasonDetailInclude = {
  participants: { include: { member: true } },
  matchups: {
    include: { player1: true, player2: true, result: true },
    orderBy: [{ round: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.SeasonInclude;

export type SeasonDetail = Prisma.SeasonGetPayload<{ include: typeof seasonDetailInclude }>;

export interface ResultInput {
  winnerId?: string;
  isDraw?: boolean;
}

export async function getActiveSeason(): Promise<SeasonDetail | null> {
  return prisma.season.findFirst({ where: { status: 'ACTIVE' }, include: seasonDetailInclude });
}

export async function getSeasonById(id: string): Promise<SeasonDetail | null> {
  return prisma.season.findUnique({ where: { id }, include: seasonDetailInclude });
}

export async function getSeasons(): Promise<SeasonDetail[]> {
  return prisma.season.findMany({ include: seasonDetailInclude, orderBy: { createdAt: 'desc' } });
}

/**
 * Creates a season and its full round-robin schedule. Rejects when
 * another season is still ACTIVE, when fewer than 2 members are given,
 * or when a selected member does not exist / is archived.
 */
export async function createSeason(name: string, memberIds: string[]): Promise<Season> {
  const active = await prisma.season.findFirst({ where: { status: 'ACTIVE' } });
  if (active) {
    throw new ApiError(
      409,
      `"${active.name}" is still in progress — record its remaining results before starting a new season.`,
    );
  }

  const uniqueIds = [...new Set(memberIds)];
  const members = await prisma.member.findMany({ where: { id: { in: uniqueIds } } });
  if (members.length !== uniqueIds.length) {
    throw new ApiError(400, 'Unknown member selected');
  }
  const inactive = members.filter((m) => !m.active);
  if (inactive.length > 0) {
    throw new ApiError(
      400,
      `Archived members cannot join a season: ${inactive.map((m) => m.name).join(', ')}`,
    );
  }

  const schedule = generateSchedule(uniqueIds);

  return prisma.$transaction(async (tx) => {
    const season = await tx.season.create({ data: { name } });
    await tx.seasonParticipant.createMany({
      data: uniqueIds.map((memberId) => ({ seasonId: season.id, memberId })),
    });
    await tx.matchup.createMany({
      data: schedule.map((m) => ({ ...m, seasonId: season.id })),
    });
    return season;
  });
}

/**
 * Records a match result: computes the ELO update with before/after
 * snapshots, updates both members, completes the matchup, and — if it
 * was the last pending matchup — completes the season. All in one
 * transaction.
 */
export async function recordResult(
  matchupId: string,
  input: ResultInput,
): Promise<{ matchupId: string; seasonCompleted: boolean }> {
  const draw = input.isDraw === true;
  const winnerId = input.winnerId;
  if (!draw && !winnerId) {
    throw new ApiError(400, 'Provide either winnerId or isDraw: true');
  }

  return prisma.$transaction(async (tx) => {
    const matchup = await tx.matchup.findUnique({ where: { id: matchupId }, include: { result: true } });
    if (!matchup) throw new ApiError(404, 'Matchup not found');
    if (matchup.status === 'COMPLETED' || matchup.result) {
      throw new ApiError(409, 'A result has already been recorded for this matchup');
    }

    if (!draw && winnerId !== matchup.player1Id && winnerId !== matchup.player2Id) {
      throw new ApiError(400, 'winnerId must be one of the two matchup players');
    }

    const [p1, p2] = await Promise.all([
      tx.member.findUnique({ where: { id: matchup.player1Id } }),
      tx.member.findUnique({ where: { id: matchup.player2Id } }),
    ]);
    if (!p1 || !p2) throw new ApiError(404, 'Matchup player not found');

    const outcomeForP1: Outcome = draw ? 'draw' : winnerId === matchup.player1Id ? 'win' : 'loss';
    const { newRatingA, newRatingB } = computeNewRatings(p1.elo, p2.elo, outcomeForP1);

    await tx.matchResult.create({
      data: {
        matchupId: matchup.id,
        winnerId: draw ? null : winnerId,
        loserId: draw
          ? null
          : winnerId === matchup.player1Id
            ? matchup.player2Id
            : matchup.player1Id,
        isDraw: draw,
        player1EloBefore: p1.elo,
        player1EloAfter: newRatingA,
        player2EloBefore: p2.elo,
        player2EloAfter: newRatingB,
      },
    });
    await tx.member.update({ where: { id: p1.id }, data: { elo: newRatingA } });
    await tx.member.update({ where: { id: p2.id }, data: { elo: newRatingB } });
    await tx.matchup.update({ where: { id: matchup.id }, data: { status: 'COMPLETED' } });

    let seasonCompleted = false;
    const pendingCount = await tx.matchup.count({
      where: { seasonId: matchup.seasonId, status: 'PENDING' },
    });
    if (pendingCount === 0) {
      await tx.season.update({
        where: { id: matchup.seasonId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      seasonCompleted = true;
    }

    return { matchupId: matchup.id, seasonCompleted };
  });
}

export interface SeasonStanding {
  memberId: string;
  name: string;
  nickname: string | null;
  avatarPath: string | null;
  wins: number;
  losses: number;
  draws: number;
  eloDelta: number;
}

/** Standings within a single season (3 pts win, 1 pt draw), for the detail page. */
export function computeStandings(season: SeasonDetail): SeasonStanding[] {
  const standings = new Map<string, SeasonStanding>();
  for (const participant of season.participants) {
    standings.set(participant.memberId, {
      memberId: participant.memberId,
      name: participant.member.name,
      nickname: participant.member.nickname,
      avatarPath: participant.member.avatarPath,
      wins: 0,
      losses: 0,
      draws: 0,
      eloDelta: 0,
    });
  }
  if (standings.size === 0) return [];

  const bump = (id: string, field: 'wins' | 'losses' | 'draws' | 'eloDelta', by = 1) => {
    const row = standings.get(id);
    if (row) row[field] += by;
  };

  for (const matchup of season.matchups) {
    const result = matchup.result;
    if (!result) continue;
    if (result.isDraw) {
      bump(matchup.player1Id, 'draws');
      bump(matchup.player2Id, 'draws');
    } else if (result.winnerId && result.loserId) {
      bump(result.winnerId, 'wins');
      bump(result.loserId, 'losses');
    }
    bump(matchup.player1Id, 'eloDelta', result.player1EloAfter - result.player1EloBefore);
    bump(matchup.player2Id, 'eloDelta', result.player2EloAfter - result.player2EloBefore);
  }

  return [...standings.values()].sort(
    (a, b) =>
      b.wins * 3 + b.draws - (a.wins * 3 + a.draws) ||
      b.eloDelta - a.eloDelta ||
      a.name.localeCompare(b.name),
  );
}
