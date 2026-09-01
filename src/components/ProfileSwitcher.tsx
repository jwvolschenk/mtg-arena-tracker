'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "Who are you" picker — pure UX convenience. Stores the chosen member
 * id in the `current_member` cookie so the UI can personalize (it is
 * NOT security; anyone can switch at any time).
 */
export default function ProfileSwitcher({
  initialMemberId,
}: {
  initialMemberId: string | null;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState(initialMemberId ?? '');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/members?status=active')
      .then((res) => res.json())
      .then((data: { members?: { id: string; name: string }[] }) => {
        if (!cancelled) setMembers(data.members ?? []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onChange(id: string) {
    setSelected(id);
    document.cookie = 'current_member=; Path=/; Max-Age=0; SameSite=Lax';
    if (id) {
      document.cookie = `current_member=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
      <span className="hidden sm:inline">Playing as</span>
      <select
        aria-label="Playing as"
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        disabled={!members}
        className="max-w-40 cursor-pointer rounded-lg border border-white/10 bg-panel px-2 py-1.5 text-xs font-semibold text-slate-200 focus:border-accent focus:outline-none disabled:opacity-50"
      >
        <option value="">— pick profile —</option>
        {(members ?? []).map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </label>
  );
}
