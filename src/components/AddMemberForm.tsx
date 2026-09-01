'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddMemberForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('name', name);
      if (nickname) form.set('nickname', nickname);
      if (avatar) form.set('avatar', avatar);

      const res = await fetch('/api/members', { method: 'POST', body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to add member');
      }
      setName('');
      setNickname('');
      setAvatar(null);
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card p-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
        Add a duelist
      </h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
          maxLength={40}
          required
          className="input sm:flex-1"
        />
        <input
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Nickname / game name"
          maxLength={40}
          className="input sm:flex-1"
        />
        <label className="btn-ghost cursor-pointer sm:w-48">
          {avatar ? avatar.name : 'Avatar (optional)'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setAvatar(event.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <button type="submit" disabled={busy || name.trim().length === 0} className="btn-primary">
          {busy ? 'Adding…' : 'Add member'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-400">
          {error}
        </p>
      )}
    </form>
  );
}
