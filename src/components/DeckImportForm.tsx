'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Paste-an-Arena-export form. The server does the Scryfall lookups and
 * artwork downloads, so a submit can take a few seconds.
 */
export default function DeckImportForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [list, setList] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setWarnings(null);
    try {
      const res = await fetch(`/api/members/${memberId}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, list }),
      });
      const body = (await res.json().catch(() => null)) as
        | { deck?: unknown; warnings?: string[]; error?: string }
        | null;
      if (!res.ok || !body?.deck) {
        throw new Error(body?.error ?? 'Import failed');
      }
      setName('');
      setList('');
      setWarnings(body.warnings?.length ? body.warnings : null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && name.trim().length > 0 && list.trim().length > 0;

  return (
    <form onSubmit={onSubmit} className="card p-4">
      <h2 className="section-title">Import a deck</h2>
      <p className="mt-2 text-xs text-slate-500">
        In MTG Arena open the deck, click <span className="text-slate-300">Export</span>, then paste the clipboard here.
        Card details and artwork are pulled from Scryfall.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Deck name (e.g. Wargs of Rhovanion)"
          maxLength={60}
          required
          className="input sm:w-72"
        />
        <button type="submit" disabled={!canSubmit} className="btn-primary sm:self-start">
          {busy ? 'Summoning…' : 'Import deck'}
        </button>
      </div>
      <textarea
        value={list}
        onChange={(event) => setList(event.target.value)}
        placeholder={'Deck\n4 Head of the Hunt (HOB) 75\n3 The Chief Warg (HOB) 150\n9 Forest (THB) 254'}
        rows={7}
        spellCheck={false}
        className="input mt-2 font-mono text-xs leading-relaxed"
      />
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-400">
          {error}
        </p>
      )}
      {warnings && (
        <div role="status" className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/10 p-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Deck imported with warnings
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-200/90">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
