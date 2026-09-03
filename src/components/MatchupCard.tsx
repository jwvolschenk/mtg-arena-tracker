'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';

export interface MatchupPlayer {
  id: string;
  name: string;
  nickname?: string | null;
  avatarPath: string | null;
  colors: string | null;
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
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
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
  const skipped = matchup.status === 'SKIPPED';

  async function post(path: string, payload?: { winnerId?: string; isDraw?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matchups/${matchup.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload === undefined ? undefined : JSON.stringify(payload),
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
  const nick = (p: MatchupPlayer) =>
    p.nickname ? (
      <p className="truncate text-[11px] font-normal leading-tight text-slate-500 sm:text-xs">
        “{p.nickname}”
      </p>
    ) : null;

  return (
    <article
      className={`card fade-in-up p-4 transition ${
        completed || skipped
          ? 'opacity-70 hover:opacity-100'
          : 'hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow'
      }`}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Avatar
            name={player1.name}
            avatarPath={player1.avatarPath}
            colors={player1.colors}
            size={56}
            sizeClassName="h-10 w-10 sm:h-14 sm:w-14"
            dimmed={completed}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-100 sm:text-sm">
              {player1.name}
              {you(player1.id) && <span className="ml-1 text-xs text-accent">(you)</span>}
            </p>
            {nick(player1)}
            <p className="text-xs text-slate-400">{player1.elo} ELO</p>
          </div>
        </div>

        <div className="shrink-0 text-center">
          <div className="relative flex h-8 w-8 items-center justify-center sm:h-10 sm:w-10">
            <span
              aria-hidden
              className="absolute inset-1.5 rotate-45 rounded-[5px] border border-accent/50 bg-gradient-to-br from-navy/70 to-plum/50 shadow-glow"
            />
            <span className="relative font-display text-[9px] font-black tracking-widest text-accent text-glow-soft sm:text-[10px]">
              VS
            </span>
          </div>
          {completed && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {result!.isDraw ? 'Draw' : 'Final'}
            </p>
          )}
          {skipped && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Void
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right sm:gap-3">
          <Avatar
            name={player2.name}
            avatarPath={player2.avatarPath}
            colors={player2.colors}
            size={56}
            sizeClassName="h-10 w-10 sm:h-14 sm:w-14"
            dimmed={completed}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-100 sm:text-sm">
              {player2.name}
              {you(player2.id) && <span className="ml-1 text-xs text-accent">(you)</span>}
            </p>
            {nick(player2)}
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
              <span aria-hidden>🏆</span>
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
      ) : skipped ? (
        <>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <span aria-hidden>🚫</span>
            Match skipped — not played, no result, ELO unchanged
          </p>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => post('unskip')}
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-accent disabled:opacity-50"
            >
              ↩ Restore match
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-center text-xs font-semibold text-rose-400">
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => post('result', { winnerId: player1.id })}
              className="btn-ghost !px-2 !py-1.5 !text-xs"
            >
              {player1.name} wins
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => post('result', { isDraw: true })}
              className="btn-ghost !px-2 !py-1.5 !text-xs"
            >
              Draw
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => post('result', { winnerId: player2.id })}
              className="btn-ghost !px-2 !py-1.5 !text-xs"
            >
              {player2.name} wins
            </button>
          </div>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => post('skip')}
              title="Skip if this match cannot be played — no result is recorded and neither player's ELO changes"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-rose-300 disabled:opacity-50"
            >
              Skip match
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
