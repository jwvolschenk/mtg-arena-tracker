import Link from 'next/link';
import { notFound } from 'next/navigation';
import Avatar from '@/components/Avatar';
import MatchupCard, { type MatchupData } from '@/components/MatchupCard';
import { computeStandings, getSeasonById, type SeasonDetail } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

type SeasonMatchup = SeasonDetail['matchups'][number];

export async function generateMetadata({ params }: { params: { id: string } }) {
  const season = await getSeasonById(params.id);
  return { title: season ? `${season.name} — MTG Arena Tracker` : 'Season not found' };
}

export default async function SeasonDetailPage({ params }: { params: { id: string } }) {
  const season = await getSeasonById(params.id);
  if (!season) notFound();

  const standings = computeStandings(season);
  const total = season.matchups.length;
  const completed = season.matchups.filter((m) => m.status === 'COMPLETED').length;
  const isActive = season.status === 'ACTIVE';

  const rounds = new Map<number, SeasonMatchup[]>();
  for (const matchup of season.matchups) {
    const list = rounds.get(matchup.round) ?? [];
    list.push(matchup);
    rounds.set(matchup.round, list);
  }

  return (
    <div className="space-y-8">
      <header className="fade-in-up">
        <div className="flex items-center gap-3">
          <Link href="/seasons" className="text-xs font-semibold text-slate-500 hover:text-accent">
            ← All seasons
          </Link>
          {isActive ? (
            <span className="badge border border-accent/40 bg-accent/10 text-accent">● Active</span>
          ) : (
            <span className="badge bg-plum/40 text-slate-300">✦ Completed</span>
          )}
        </div>
        <h1 className="text-glow mt-2 text-3xl font-black uppercase tracking-wide text-slate-100">
          {season.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Started {season.createdAt.toLocaleDateString()}
          {season.completedAt && ` · finished ${season.completedAt.toLocaleDateString()}`} ·{' '}
          {completed}/{total} matches
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-300">
          Standings
          <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Duelist</th>
                <th className="px-4 py-3 text-center font-semibold">W</th>
                <th className="px-4 py-3 text-center font-semibold">L</th>
                <th className="px-4 py-3 text-center font-semibold">D</th>
                <th className="px-4 py-3 text-center font-semibold">Pts</th>
                <th className="px-4 py-3 text-right font-semibold">ELO Δ</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr
                  key={row.memberId}
                  className={`border-b border-white/5 last:border-0 ${
                    index === 0 ? 'bg-accent/5' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-black text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-bold text-slate-100">
                      <Avatar name={row.name} avatarPath={row.avatarPath} size={28} />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-400">{row.wins}</td>
                  <td className="px-4 py-3 text-center text-rose-400">{row.losses}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{row.draws}</td>
                  <td className="px-4 py-3 text-center font-bold text-accent">
                    {row.wins * 3 + row.draws}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      row.eloDelta > 0
                        ? 'text-emerald-400'
                        : row.eloDelta < 0
                          ? 'text-rose-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {row.eloDelta > 0 ? '+' : ''}
                    {row.eloDelta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {[...rounds.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([round, matchups]) => (
          <section key={round} className="space-y-3">
            <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-300">
              Round {round}
              <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {matchups.map((matchup) => (
                <MatchupCard key={matchup.id} matchup={matchup as MatchupData} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
