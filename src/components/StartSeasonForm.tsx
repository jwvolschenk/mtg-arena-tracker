'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';

interface MemberOption {
  id: string;
  name: string;
  avatarPath: string | null;
  elo: number;
}

export default function StartSeasonForm({
  members,
  defaultName,
}: {
  members: MemberOption[];
  defaultName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = selected.size === members.length && members.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, memberIds: [...selected] }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to start season');
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start season');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Season name
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          required
          className="input sm:flex-1"
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Duelists{' '}
          <span className={`ml-1 ${selected.size >= 2 ? 'text-accent' : 'text-rose-400'}`}>
            {selected.size} selected
          </span>
        </h2>
        <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={toggleAll}>
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {members.length < 2 ? (
        <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          You need at least 2 active members to start a season. Add more on the{' '}
          <a href="/roster" className="underline">
            roster page
          </a>
          .
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {members.map((member) => {
            const checked = selected.has(member.id);
            return (
              <li key={member.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    checked
                      ? 'border-accent/60 bg-accent/10 shadow-glow'
                      : 'border-white/10 bg-panel hover:border-white/20 hover:bg-card'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(member.id)}
                    className="h-4 w-4 accent-[#00C0F3]"
                  />
                  <Avatar name={member.name} avatarPath={member.avatarPath} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">
                    {member.name}
                  </span>
                  <span className="text-xs text-slate-400">{member.elo}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {members.length >= 2
            ? `Everyone plays everyone once — ${Math.round((Math.max(selected.size, 2) * (Math.max(selected.size, 2) - 1)) / 2)} matches total.`
            : ''}
        </p>
        <button
          type="submit"
          disabled={busy || selected.size < 2 || name.trim().length === 0}
          className="btn-primary"
        >
          {busy ? 'Starting…' : "⚔️ Start season"}
        </button>
      </div>
    </form>
  );
}
