import { prisma } from './prisma';

export interface LeaderboardEntry {
  memberId: string;
  name: string;
  avatarPath: string | null;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Active members sorted by ELO (desc) with all-time W/L/D records
 * aggregated from every recorded match result.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const members = await prisma.member.findMany({
    where: { active: true },
    orderBy: [{ elo: 'desc' }, { name: 'asc' }],
  });
  const results = await prisma.matchResult.findMany({ include: { matchup: true } });

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

  return members.map((member) => {
    const record = stats.get(member.id) ?? { wins: 0, losses: 0, draws: 0 };
    return {
      memberId: member.id,
      name: member.name,
      avatarPath: member.avatarPath,
      elo: member.elo,
      ...record,
    };
  });
}
