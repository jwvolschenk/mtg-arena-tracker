import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { getLeaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Leaderboard — MTG Arena Tracker' };

const RANK_STYLES = [
  'bg-accent text-slate-950 shadow-glow',
  'bg-slate-300 text-slate-900',
  'bg-amber-700 text-amber-100',
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <div className="space-y-8">
      <header className="fade-in-up">
        <h1 className="text-glow text-3xl font-black uppercase tracking-wide text-slate-100">
          🏆 Leaderboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          All-time ELO standings across every season (active members).
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-400">
          No active members yet — add duelists on the{' '}
          <Link href="/roster" className="text-accent hover:underline">
            roster page
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={entry.memberId}
              className={`card fade-in-up flex items-center gap-4 p-4 transition ${
                index === 0 ? 'glow-pulse' : 'hover:border-accent/30'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  index < 3 ? RANK_STYLES[index] : 'bg-panel text-slate-400'
                }`}
                aria-label={`Rank ${index + 1}`}
              >
                {index < 3 ? MEDALS[index] : index + 1}
              </span>
              <Avatar name={entry.name} avatarPath={entry.avatarPath} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-100">{entry.name}</p>
                <p className="text-xs text-slate-500">
                  <span className="text-emerald-400">{entry.wins}W</span>{' '}
                  <span className="text-rose-400">{entry.losses}L</span>{' '}
                  <span className="text-slate-400">{entry.draws}D</span>
                </p>
              </div>
              <p
                className={`text-glow-soft shrink-0 text-2xl font-black tabular-nums ${
                  index === 0 ? 'text-accent' : 'text-slate-200'
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
