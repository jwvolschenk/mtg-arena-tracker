import { prisma } from './prisma';

export interface LeaderboardEntry {
  memberId: string;
  name: string;
  nickname: string | null;
  avatarPath: string | null;
  colors: string | null;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Active members sorted by ELO (desc) with all-time W/L/D records
 * aggregated from every recorded match result — season fixtures and
 * one-off challenges alike.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const members = await prisma.member.findMany({
    where: { active: true },
    orderBy: [{ elo: 'desc' }, { name: 'asc' }],
  });
  const [results, challenges] = await Promise.all([
    prisma.matchResult.findMany({ include: { matchup: true } }),
    prisma.challengeMatch.findMany(),
  ]);

  const stats = new Map<string, { wins: number; losses: number; draws: number }>();
  const statsFor = (id: string) => {
    let entry = stats.get(id);
    if (!entry) {
      entry = { wins: 0, losses: 0, draws: 0 };
      stats.set(id, entry);
    }
    return entry;
  };

  for (const result of results) {
    if (result.isDraw) {
      statsFor(result.matchup.player1Id).draws++;
      statsFor(result.matchup.player2Id).draws++;
    } else if (result.winnerId && result.loserId) {
      statsFor(result.winnerId).wins++;
      statsFor(result.loserId).losses++;
    }
  }

  for (const challenge of challenges) {
    if (challenge.isDraw) {
      statsFor(challenge.player1Id).draws++;
      statsFor(challenge.player2Id).draws++;
    } else if (challenge.winnerId) {
      statsFor(challenge.winnerId).wins++;
      statsFor(challenge.winnerId === challenge.player1Id ? challenge.player2Id : challenge.player1Id)
        .losses++;
    }
  }

  return members.map((member) => {
    const record = stats.get(member.id) ?? { wins: 0, losses: 0, draws: 0 };
    return {
      memberId: member.id,
      name: member.name,
      nickname: member.nickname,
      avatarPath: member.avatarPath,
      colors: member.colors,
      elo: member.elo,
      ...record,
    };
  });
}
