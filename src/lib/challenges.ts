import { Prisma } from '@prisma/client';
import { ApiError } from './api';
import { computeNewRatings, type Outcome } from './elo';
import { prisma } from './prisma';

export const challengeInclude = {
  player1: true,
  player2: true,
} satisfies Prisma.ChallengeMatchInclude;

export type ChallengeEntry = Prisma.ChallengeMatchGetPayload<{ include: typeof challengeInclude }>;

export interface ChallengeInput {
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  isDraw?: boolean;
}

/** Full challenge log, newest first. */
export async function getChallenges(): Promise<ChallengeEntry[]> {
  return prisma.challengeMatch.findMany({
    include: challengeInclude,
    orderBy: { playedAt: 'desc' },
  });
}

/**
 * Records a one-off challenge match: applies the standard ELO exchange
 * (with before/after snapshots) to both members' all-time ratings and
 * writes the log entry, all in one transaction. Season standings are
 * never touched — challenges live outside the round-robin.
 */
export async function recordChallenge(input: ChallengeInput): Promise<ChallengeEntry> {
  const draw = input.isDraw === true;
  const { player1Id, player2Id } = input;
  const winnerId = input.winnerId;

  if (!draw && winnerId !== player1Id && winnerId !== player2Id) {
    throw new ApiError(400, 'winnerId must be one of the two duelists');
  }

  return prisma.$transaction(async (tx) => {
    const [p1, p2] = await Promise.all([
      tx.member.findUnique({ where: { id: player1Id } }),
      tx.member.findUnique({ where: { id: player2Id } }),
    ]);
    if (!p1 || !p2) throw new ApiError(404, 'Duelist not found');

    const outcomeForP1: Outcome = draw ? 'draw' : winnerId === player1Id ? 'win' : 'loss';
    const { newRatingA, newRatingB } = computeNewRatings(p1.elo, p2.elo, outcomeForP1);

    const challenge = await tx.challengeMatch.create({
      data: {
        player1Id,
        player2Id,
        winnerId: draw ? null : winnerId,
        isDraw: draw,
        player1EloBefore: p1.elo,
        player1EloAfter: newRatingA,
        player2EloBefore: p2.elo,
        player2EloAfter: newRatingB,
      },
      include: challengeInclude,
    });
    await tx.member.update({ where: { id: p1.id }, data: { elo: newRatingA } });
    await tx.member.update({ where: { id: p2.id }, data: { elo: newRatingB } });

    return challenge;
  });
}
