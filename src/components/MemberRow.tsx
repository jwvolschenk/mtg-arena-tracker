'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';

export interface MemberInfo {
  id: string;
  name: string;
  avatarPath: string | null;
  elo: number;
  active: boolean;
}

export default function MemberRow({ member }: { member: MemberInfo }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(data: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        body: data,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Update failed');
      }
      setEditing(false);
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setError(null);
    setEditing(true);
  }

  async function setActive(active: boolean) {
    const form = new FormData();
    form.set('active', String(active));
    await send(form);
  }

  if (editing) {
    return (
      <li className="card fade-in-up p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void send(form);
          }}
        >
          <Avatar name={member.name} avatarPath={member.avatarPath} size={36} />
          <input
            name="name"
            type="text"
            defaultValue={member.name}
            maxLength={40}
            required
            className="input sm:flex-1"
          />
          <label className="btn-ghost cursor-pointer sm:w-48">
            New avatar (optional)
            <input
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-rose-400">
            {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="card fade-in-up flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={member.name} avatarPath={member.avatarPath} size={40} dimmed={!member.active} />
        <div className="min-w-0">
          <p className={`truncate text-sm font-bold ${member.active ? 'text-slate-100' : 'text-slate-400'}`}>
            {member.name}
            {!member.active && (
              <span className="badge ml-2 bg-plum/40 text-slate-300">Archived</span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            <span className={member.active ? 'text-slate-300' : ''}>{member.elo}</span> ELO
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={startEdit}>
          Edit
        </button>
        {member.active ? (
          <button type="button" className="btn-danger" disabled={busy} onClick={() => void setActive(false)}>
            Archive
          </button>
        ) : (
          <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => void setActive(true)}>
            Restore
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </li>
  );
}
