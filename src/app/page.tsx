import Link from 'next/link';
import { cookies } from 'next/headers';
import MatchupCard, { type MatchupData } from '@/components/MatchupCard';
import { getActiveSeason, getSeasons, type SeasonDetail } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

function SeasonProgress({ season }: { season: SeasonDetail }) {
  const total = season.matchups.length;
  const completed = season.matchups.filter((m) => m.status === 'COMPLETED').length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="w-full sm:w-64">
      <div className="flex items-baseline justify-between text-xs font-semibold text-slate-400">
        <span>
          {completed} / {total} matches
        </span>
        <span className="text-accent">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel">
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy via-accent-strong to-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [season, currentMemberId, seasons] = await Promise.all([
    getActiveSeason(),
    Promise.resolve(cookies().get('current_member')?.value ?? null),
    getSeasons(),
  ]);

  if (!season) {
    const lastCompleted = seasons.find((s) => s.status === 'COMPLETED');
    return (
      <div className="fade-in-up mx-auto mt-16 max-w-xl text-center">
        <h1 className="text-glow text-4xl font-black uppercase tracking-wide text-slate-100">
          No active season
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          The arena is quiet. Round up the crew, start a round-robin season and let
          the ELO points flow.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/seasons/new" className="btn-primary">
            ⚔️ Start a season
          </Link>
          <Link href="/leaderboard" className="btn-ghost">
            View leaderboard
          </Link>
        </div>
        {lastCompleted && (
          <p className="mt-8 text-sm text-slate-500">
            🏆{' '}
            <Link href={`/seasons/${lastCompleted.id}`} className="text-accent hover:underline">
              {lastCompleted.name}
            </Link>{' '}
            just finished — check the final standings.
          </p>
        )}
      </div>
    );
  }

  const pending = season.matchups.filter((m) => m.status === 'PENDING');
  const completed = season.matchups.filter((m) => m.status === 'COMPLETED');

  const rounds = new Map<number, SeasonDetail['matchups']>();
  for (const matchup of pending) {
    const list = rounds.get(matchup.round) ?? [];
    list.push(matchup);
    rounds.set(matchup.round, list);
  }

  return (
    <div className="space-y-8">
      <header className="fade-in-up flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Current season
          </p>
          <h1 className="text-glow mt-1 text-3xl font-black uppercase tracking-wide text-slate-100">
            {season.name}
          </h1>
        </div>
        <SeasonProgress season={season} />
      </header>

      {pending.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-400">
          All matchups are recorded — this season is about to close out. 🏆
        </p>
      ) : (
        [...rounds.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([round, matchups]) => (
            <section key={round} className="space-y-3">
              <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-300">
                Round {round}
                <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
                <span className="text-xs font-semibold text-slate-500">
                  {matchups.length} {matchups.length === 1 ? 'match' : 'matches'}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {matchups.map((matchup) => (
                  <MatchupCard
                    key={matchup.id}
                    matchup={matchup as MatchupData}
                    currentMemberId={currentMemberId}
                  />
                ))}
              </div>
            </section>
          ))
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            Completed
            <span className="h-px flex-1 bg-gradient-to-r from-plum to-transparent" />
            <span className="text-xs font-semibold text-slate-500">
              {completed.length} {completed.length === 1 ? 'match' : 'matches'}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...completed].reverse().map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup as MatchupData}
                currentMemberId={currentMemberId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
