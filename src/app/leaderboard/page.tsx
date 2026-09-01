import Link from 'next/link';
import Avatar from '@/components/Avatar';
import PageBanner from '@/components/PageBanner';
import { getLeaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Leaderboard — MTG Arena Tracker' };

const MEDALS = ['🥇', '🥈', '🥉'];

/** Podium frames for the top three — gold, silver, bronze. */
const PODIUM_FRAMES = [
  'border-gold/45 glow-pulse-gold bg-[linear-gradient(180deg,rgba(217,180,91,0.12),rgba(217,180,91,0)_45%),#241f2a]',
  'border-slate-300/30 bg-[linear-gradient(180deg,rgba(203,213,225,0.10),rgba(203,213,225,0)_45%),#22262f]',
  'border-amber-700/40 bg-[linear-gradient(180deg,rgba(180,83,9,0.14),rgba(180,83,9,0)_45%),#25211c]',
];

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <div className="space-y-8">
      <PageBanner
        image="/art/champion-kenrith.jpg"
        kicker="Hall of champions"
        title="Leaderboard"
      >
        <p className="text-sm text-slate-300">
          All-time ELO standings across every season (active members).
        </p>
      </PageBanner>

      {entries.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-400">
          No active members yet — add duelists on the{' '}
          <Link href="/roster" className="text-accent hover:underline">
            roster page
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2.5">
          {entries.map((entry, index) => (
            <li
              key={entry.memberId}
              className={`card fade-in-up flex items-center gap-4 p-4 transition hover:shadow-glow ${
                index < 3 ? `${PODIUM_FRAMES[index]} border` : 'hover:border-accent/30'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-black ${
                  index === 0
                    ? 'bg-gradient-to-b from-gold-soft to-gold-deep text-slate-900 shadow-glow-gold'
                    : index === 1
                      ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900'
                      : index === 2
                        ? 'bg-gradient-to-b from-amber-600 to-amber-800 text-amber-50'
                        : 'bg-panel text-slate-400'
                }`}
                aria-label={`Rank ${index + 1}`}
              >
                {index < 3 ? MEDALS[index] : index + 1}
              </span>
              <Avatar name={entry.name} avatarPath={entry.avatarPath} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-100">
                  {entry.name}
                  {entry.nickname && (
                    <span className="ml-1.5 text-sm font-normal text-slate-400">
                      “{entry.nickname}”
                    </span>
                  )}
                  {index === 0 && (
                    <span className="ml-2 align-middle text-sm" title="Reigning champion">
                      👑
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="text-emerald-400">{entry.wins}W</span>{' '}
                  <span className="text-rose-400">{entry.losses}L</span>{' '}
                  <span className="text-slate-400">{entry.draws}D</span>
                </p>
              </div>
              <p
                className={`shrink-0 font-display text-2xl font-black tabular-nums ${
                  index === 0
                    ? 'text-glow-gold text-gold-soft'
                    : index < 3
                      ? 'text-slate-200'
                      : 'text-slate-300'
                }`}
              >
                {entry.elo}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
