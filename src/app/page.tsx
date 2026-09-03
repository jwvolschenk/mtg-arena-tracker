import Link from 'next/link';
import { cookies } from 'next/headers';
import MatchupCard, { type MatchupData } from '@/components/MatchupCard';
import { getActiveSeason, getSeasons, type SeasonDetail } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

function SeasonProgress({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-baseline justify-between text-xs font-semibold text-slate-400">
        <span>
          {completed} / {total} matches decided
        </span>
        <span className="text-accent">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-inset ring-white/10">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-navy via-accent-strong to-accent transition-all"
          style={{ width: `${pct}%` }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 right-0 w-8 rounded-full bg-white/30 blur-[6px]"
          />
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 backdrop-blur-sm">
      <p className="font-display text-lg font-black leading-tight text-slate-100">{value}</p>
      {sub && (
        <p className="text-[11px] font-normal leading-tight text-slate-400">“{sub}”</p>
      )}
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
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
      <div className="fade-in-up relative mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
        <div
          aria-hidden
          className="float absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: 'url(/art/empty-sanctuary.jpg)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-base/70 via-base/85 to-base"
        />
        <div className="relative px-6 py-14 text-center sm:px-10">
          <p className="kicker justify-center [&::before]:hidden [&::after]:content-[''] [&::after]:h-px [&::after]:w-7 [&::after]:bg-gradient-to-l [&::after]:from-accent [&::after]:to-transparent">
            The arena stands silent
          </p>
          <h1 className="text-glow mt-3 font-display text-4xl font-black uppercase tracking-wide text-slate-100">
            No active season
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Round up the crew, start a round-robin season and let the ELO points flow.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
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
              <Link
                href={`/seasons/${lastCompleted.id}`}
                className="text-accent hover:underline"
              >
                {lastCompleted.name}
              </Link>{' '}
              just finished — check the final standings.
            </p>
          )}
        </div>
      </div>
    );
  }

  const pending = season.matchups.filter((m) => m.status === 'PENDING');
  const completed = season.matchups.filter((m) => m.status === 'COMPLETED');
  const leader = [...season.participants].sort((a, b) => b.member.elo - a.member.elo)[0];

  const rounds = new Map<number, SeasonDetail['matchups']>();
  for (const matchup of pending) {
    const list = rounds.get(matchup.round) ?? [];
    list.push(matchup);
    rounds.set(matchup.round, list);
  }

  return (
    <div className="space-y-8">
      {/* Hero — Nicol Bolas, Dragon-God looming over the season in progress */}
      <section className="fade-in-up relative overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-75"
          style={{ backgroundImage: 'url(/art/hero-bolas.jpg)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-base via-base/80 to-base/15"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-base/95 via-base/20 to-base/40"
        />
        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:max-w-[65%]">
          <div className="flex items-center gap-3">
            <p className="kicker">Current season</p>
            <span className="badge border border-accent/40 bg-accent/10 text-accent">
              ● Live
            </span>
          </div>
          <h1 className="text-glow font-display text-3xl font-black uppercase leading-tight tracking-wide text-slate-50 sm:text-4xl">
            {season.name}
          </h1>
          <div className="flex flex-wrap items-stretch gap-2.5">
            <StatChip
              label="Duelists"
              value={String(season.participants.length)}
            />
            <StatChip label="Matches" value={String(season.matchups.length)} />
            <StatChip label="Decided" value={String(completed.length)} />
            {leader && (
              <StatChip label="Top ELO" value={leader.member.name} sub={leader.member.nickname} />
            )}
          </div>
          <SeasonProgress total={season.matchups.length} completed={completed.length} />
        </div>
      </section>

      {pending.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-400">
          All matchups are recorded — this season is about to close out. 🏆
        </p>
      ) : (
        [...rounds.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([round, matchups]) => (
            <section key={round} className="space-y-3">
              <h2 className="section-title">
                Round {round}
                <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
                <span className="font-sans text-xs font-semibold normal-case tracking-normal text-slate-500">
                  {matchups.length} {matchups.length === 1 ? 'match' : 'matches'}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <h2 className="section-title text-slate-400">
            Completed
            <span className="h-px flex-1 bg-gradient-to-r from-plum to-transparent" />
            <span className="font-sans text-xs font-semibold normal-case tracking-normal text-slate-500">
              {completed.length} {completed.length === 1 ? 'match' : 'matches'}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
