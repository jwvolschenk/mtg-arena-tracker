'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';

export interface MatchupPlayer {
  id: string;
  name: string;
  avatarPath: string | null;
  elo: number;
}

export interface MatchupResult {
  winnerId: string | null;
  loserId: string | null;
  isDraw: boolean;
  player1EloBefore: number;
  player1EloAfter: number;
  player2EloBefore: number;
  player2EloAfter: number;
}

export interface MatchupData {
  id: string;
  round: number;
  status: 'PENDING' | 'COMPLETED';
  player1: MatchupPlayer;
  player2: MatchupPlayer;
  result: MatchupResult | null;
}

function EloDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-slate-500">±0</span>;
  return (
    <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  );
}

export default function MatchupCard({
  matchup,
  currentMemberId,
}: {
  matchup: MatchupData;
  currentMemberId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { player1, player2, result } = matchup;
  const completed = matchup.status === 'COMPLETED' && result !== null;

  async function recordResult(payload: { winnerId?: string; isDraw?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matchups/${matchup.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to record result');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record result');
    } finally {
      setBusy(false);
    }
  }

  const you = (id: string) => currentMemberId === id;

  return (
    <article
      className={`card fade-in-up p-4 transition ${completed ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={player1.name} avatarPath={player1.avatarPath} size={56} dimmed={completed} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">
              {player1.name}
              {you(player1.id) && <span className="ml-1 text-xs text-accent">(you)</span>}
            </p>
            <p className="text-xs text-slate-400">{player1.elo} ELO</p>
          </div>
        </div>

        <div className="shrink-0 text-center">
          <span className="text-glow-soft text-xs font-black tracking-widest text-accent">VS</span>
          {completed && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {result!.isDraw ? 'Draw' : 'Final'}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-row-reverse items-center gap-3 text-right">
          <Avatar name={player2.name} avatarPath={player2.avatarPath} size={56} dimmed={completed} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">
              {player2.name}
              {you(player2.id) && <span className="ml-1 text-xs text-accent">(you)</span>}
            </p>
            <p className="text-xs text-slate-400">{player2.elo} ELO</p>
          </div>
        </div>
      </div>

      {completed ? (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-300">
          {result!.isDraw ? (
            <>Draw — both duelists hold ground</>
          ) : (
            <>
              <span className="text-emerald-400">
                {result!.winnerId === player1.id ? player1.name : player2.name} wins
              </span>
              <EloDelta
                delta={
                  (result!.winnerId === player1.id
                    ? result!.player1EloAfter - result!.player1EloBefore
                    : result!.player2EloAfter - result!.player2EloBefore)
                }
              />
            </>
          )}
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => recordResult({ winnerId: player1.id })}
              className="btn-ghost !px-2 !py-1.5 !text-xs"
            >
              {player1.name} wins
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => recordResult({ isDraw: true })}
              className="btn-ghost !px-2 !py-1.5 !text-xs"
            >
              Draw
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => recordResult({ winnerId: player2.id })}
              className="btn-ghost !px-2 !py-1.5 !text-xs"
            >
              {player2.name} wins
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-center text-xs font-semibold text-rose-400">
              {error}
            </p>
          )}
        </>
      )}
    </article>
  );
}
