import Link from 'next/link';
import { cookies } from 'next/headers';
import MatchupCard, { type MatchupData } from '@/components/MatchupCard';
import PageBanner from '@/components/PageBanner';
import { computeStandings, getActiveSeason, type SeasonDetail } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'My Matches — MTG Arena Tracker' };

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3.5 py-2 backdrop-blur-sm">
      <p className="font-display text-lg font-black leading-tight text-slate-100">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
    </div>
  );
}

function MessageCard({ children }: { children: React.ReactNode }) {
  return <p className="card fade-in-up p-8 text-center text-sm text-slate-400">{children}</p>;
}

/**
 * Personal fixture list for the profile picked in the "Playing as"
 * switcher: only this duelist's matchups from the active season, with
 * their upcoming rounds first and played/void fixtures below.
 */
export default async function MyMatchupsPage() {
  const [season, currentMemberId] = await Promise.all([
    getActiveSeason(),
    Promise.resolve(cookies().get('current_member')?.value ?? null),
  ]);

  if (!season) {
    return (
      <div className="fade-in-up space-y-4">
        <h1 className="text-glow font-display text-3xl font-black uppercase tracking-wide text-slate-100">
          My matches
        </h1>
        <MessageCard>
          No active season — nothing to play yet.{' '}
          <Link href="/seasons/new" className="text-accent hover:underline">
            Start one
          </Link>{' '}
          or browse the{' '}
          <Link href="/seasons" className="text-accent hover:underline">
            archive
          </Link>
          .
        </MessageCard>
      </div>
    );
  }

  if (!currentMemberId) {
    return (
      <div className="fade-in-up space-y-4">
        <h1 className="text-glow font-display text-3xl font-black uppercase tracking-wide text-slate-100">
          My matches
        </h1>
        <MessageCard>
          Who are you? Pick your profile in the <strong className="text-slate-200">Playing as</strong>{' '}
          selector (top right) to see only your own fixtures in {season.name}.
        </MessageCard>
      </div>
    );
  }

  const me = season.participants.find((p) => p.memberId === currentMemberId)?.member ?? null;
  if (!me) {
    return (
      <div className="fade-in-up space-y-4">
        <h1 className="text-glow font-display text-3xl font-black uppercase tracking-wide text-slate-100">
          My matches
        </h1>
        <MessageCard>
          The profile you&rsquo;re playing as isn&rsquo;t part of &ldquo;{season.name}&rdquo;. Switch profiles in the{' '}
          <strong className="text-slate-200">Playing as</strong> selector, or view all matches on the{' '}
          <Link href="/" className="text-accent hover:underline">
            Arena
          </Link>{' '}
          page.
        </MessageCard>
      </div>
    );
  }

  const mine = season.matchups.filter(
    (m) => m.player1Id === me.id || m.player2Id === me.id,
  );
  const pending = mine.filter((m) => m.status === 'PENDING');
  const played = mine.filter((m) => m.status === 'COMPLETED');
  const voided = mine.filter((m) => m.status === 'SKIPPED');
  const row =
    computeStandings(season).find((r) => r.memberId === me.id) ?? {
      wins: 0,
      losses: 0,
      draws: 0,
      eloDelta: 0,
    };
  const nextRound = pending.length > 0 ? Math.min(...pending.map((m) => m.round)) : null;

  const rounds = new Map<number, SeasonDetail['matchups'][number][]>();
  for (const matchup of pending) {
    const list = rounds.get(matchup.round) ?? [];
    list.push(matchup);
    rounds.set(matchup.round, list);
  }

  return (
    <div className="space-y-8">
      <PageBanner image="/art/hero-ugin.jpg" kicker={`Your fixtures · ${season.name}`} title={me.name}>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <StatChip label="Record" value={`${row.wins}–${row.losses}–${row.draws}`} />
          <StatChip label="Points" value={String(row.wins * 3 + row.draws)} />
          <StatChip label="ELO" value={String(me.elo)} />
          <StatChip
            label="Season ELO Δ"
            value={`${row.eloDelta > 0 ? '+' : ''}${row.eloDelta}`}
          />
        </div>
        <p className="mt-3 text-sm text-slate-300">
          {pending.length === 0
            ? 'Every one of your fixtures is settled. 🏆'
            : `${pending.length} ${pending.length === 1 ? 'fixture' : 'fixtures'} still to play.`}
        </p>
      </PageBanner>

      {pending.length === 0 ? (
        <MessageCard>
          All your matches are decided — see you next season. Check the{' '}
          <Link href={`/seasons/${season.id}`} className="text-accent hover:underline">
            full standings
          </Link>
          .
        </MessageCard>
      ) : (
        [...rounds.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([round, matchups]) => (
            <section key={round} className="space-y-3">
              <h2 className="section-title">
                Round {round}
                <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
                {round === nextRound && (
                  <span className="badge border border-accent/40 bg-accent/10 text-accent">
                    Up next
                  </span>
                )}
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

      {played.length + voided.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title text-slate-400">
            Played
            <span className="h-px flex-1 bg-gradient-to-r from-plum to-transparent" />
            <span className="font-sans text-xs font-semibold normal-case tracking-normal text-slate-500">
              {played.length + voided.length}{' '}
              {played.length + voided.length === 1 ? 'match' : 'matches'}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...played].reverse().map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup as MatchupData}
                currentMemberId={currentMemberId}
              />
            ))}
            {voided.map((matchup) => (
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
