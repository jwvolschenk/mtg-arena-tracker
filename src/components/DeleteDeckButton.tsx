'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteDeckButton({ deckId, deckName }: { deckId: string; deckName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete "${deckName}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Delete failed');
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn-danger" disabled={busy} onClick={() => void onDelete()}>
      {busy ? 'Removing…' : 'Delete'}
    </button>
  );
}
