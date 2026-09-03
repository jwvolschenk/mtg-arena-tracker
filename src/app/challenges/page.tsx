import { cookies } from 'next/headers';
import Avatar from '@/components/Avatar';
import ChallengeForm from '@/components/ChallengeForm';
import PageBanner from '@/components/PageBanner';
import { getChallenges, type ChallengeEntry } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Challenges — MTG Arena Tracker' };

function EloDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-slate-500">±0</span>;
  return (
    <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  );
}

function ChallengeRow({ challenge }: { challenge: ChallengeEntry }) {
  const { player1, player2 } = challenge;
  const p1Delta = challenge.player1EloAfter - challenge.player1EloBefore;
  const p2Delta = challenge.player2EloAfter - challenge.player2EloBefore;
  const winnerName =
    challenge.winnerId === player1.id ? player1.name : challenge.winnerId === player2.id ? player2.name : null;

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <Avatar name={player1.name} avatarPath={player1.avatarPath} colors={player1.colors} size={32} />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-100">{player1.name}</p>
          <p className="text-[11px] font-semibold">
            <EloDelta delta={p1Delta} />
          </p>
        </div>
      </div>

      <div className="shrink-0 text-center">
        <p className="text-xs font-semibold text-slate-300">
          {challenge.isDraw ? (
            'Draw'
          ) : (
            <span className="text-emerald-400">{winnerName} wins</span>
          )}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {challenge.playedAt.toLocaleDateString()}
        </p>
      </div>

      <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right sm:gap-2.5">
        <Avatar name={player2.name} avatarPath={player2.avatarPath} colors={player2.colors} size={32} />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-100">{player2.name}</p>
          <p className="text-[11px] font-semibold">
            <EloDelta delta={p2Delta} />
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * One-off matches outside the season round-robin: manual pairings and
 * challenges. Full ELO impact, logged below in a collapsible history.
 */
export default async function ChallengesPage() {
  const [challenges, currentMemberId] = await Promise.all([
    getChallenges(),
    Promise.resolve(cookies().get('current_member')?.value ?? null),
  ]);

  return (
    <div className="space-y-8">
      <PageBanner
        image="/art/hero-emrakul.jpg"
        kicker="Outside the season"
        title="Challenges"
      >
        <p className="max-w-xl text-sm leading-relaxed text-slate-300">
          Settle the scores outside the round-robin. Challenge matches apply the full ELO
          exchange and count towards all-time records — but never towards season standings.
        </p>
      </PageBanner>

      <section className="space-y-3">
        <h2 className="section-title">
          Record a challenge
          <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
        </h2>
        <ChallengeForm currentMemberId={currentMemberId} />
      </section>

      <section>
        <details open className="card group">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-slate-200 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="text-xs text-accent transition-transform duration-200 group-open:rotate-90"
              >
                ▶
              </span>
              Challenge log
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {challenges.length} {challenges.length === 1 ? 'entry' : 'entries'}
            </span>
          </summary>
          <div className="border-t border-white/5 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            {challenges.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-slate-400">
                No challenges yet — the first grudge match awaits above. ⚡
              </p>
            ) : (
              <ul className="space-y-2">
                {challenges.map((challenge) => (
                  <ChallengeRow key={challenge.id} challenge={challenge} />
                ))}
              </ul>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
