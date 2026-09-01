'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Arena', glyph: '⚔' },
  { href: '/my-matchups', label: 'My Matches', glyph: '✦' },
  { href: '/roster', label: 'Roster', glyph: '⚜' },
  { href: '/seasons', label: 'Seasons', glyph: '⧗' },
  { href: '/leaderboard', label: 'Leaderboard', glyph: '🏆' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-2 py-1.5 text-sm font-semibold transition sm:px-3 ${
              active
                ? 'bg-gradient-to-b from-accent/25 to-accent/10 text-accent text-glow-soft shadow-glow ring-1 ring-accent/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <span aria-hidden className="mr-1.5 text-xs opacity-80">
              {link.glyph}
            </span>
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
