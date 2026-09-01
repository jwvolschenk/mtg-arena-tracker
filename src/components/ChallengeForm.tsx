'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MemberOption {
  id: string;
  name: string;
  nickname?: string | null;
  elo: number;
}

/**
 * Records a one-off challenge: pick the two duelists (the challenger
 * defaults to the profile you're playing as), declare the outcome, and
 * the standard ELO exchange is applied immediately.
 */
export default function ChallengeForm({ currentMemberId }: { currentMemberId: string | null }) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberOption[] | null>(null);
  const [player1Id, setPlayer1Id] = useState(currentMemberId ?? '');
  const [player2Id, setPlayer2Id] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMembers().then((list) => {
      if (!cancelled) setMembers(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchMembers(): Promise<MemberOption[]> {
    try {
      const res = await fetch('/api/members?status=active');
      const data = (await res.json()) as { members?: MemberOption[] };
      return data.members ?? [];
    } catch {
      return [];
    }
  }

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.name ?? 'Duelist';
  const ready = player1Id !== '' && player2Id !== '' && player1Id !== player2Id;

  async function submitOutcome(payload: { winnerId?: string; isDraw?: boolean }) {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setRecorded(null);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1Id, player2Id, ...payload }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to record challenge');
      }
      setRecorded(
        payload.isDraw
          ? `Draw between ${nameOf(player1Id)} and ${nameOf(player2Id)} — ELO updated`
          : `${nameOf(payload.winnerId!)} takes it — ELO updated`,
      );
      setPlayer2Id('');
      setMembers(await fetchMembers());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record challenge');
    } finally {
      setBusy(false);
    }
  }

  const selectClass =
    'w-full cursor-pointer rounded-lg border border-white/10 bg-panel px-3 py-2 text-sm font-semibold text-slate-200 focus:border-accent focus:outline-none disabled:opacity-50';

  return (
    <div className="card space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Challenger
          </span>
          <select
            aria-label="Challenger"
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            disabled={!members}
            className={selectClass}
          >
            <option value="">— pick duelist —</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.elo})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Opponent
          </span>
          <select
            aria-label="Opponent"
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            disabled={!members}
            className={selectClass}
          >
            <option value="">— pick opponent —</option>
            {(members ?? [])
              .filter((m) => m.id !== player1Id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.elo})
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => submitOutcome({ winnerId: player1Id })}
          className="btn-ghost !px-2 !py-1.5 !text-xs"
        >
          {player1Id ? nameOf(player1Id) : 'Duelist 1'} wins
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => submitOutcome({ isDraw: true })}
          className="btn-ghost !px-2 !py-1.5 !text-xs"
        >
          Draw
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => submitOutcome({ winnerId: player2Id })}
          className="btn-ghost !px-2 !py-1.5 !text-xs"
        >
          {player2Id ? nameOf(player2Id) : 'Duelist 2'} wins
        </button>
      </div>

      {error && (
        <p role="alert" className="text-center text-xs font-semibold text-rose-400">
          {error}
        </p>
      )}
      {recorded && (
        <p className="text-center text-xs font-semibold text-emerald-400">{recorded}</p>
      )}
    </div>
  );
}
