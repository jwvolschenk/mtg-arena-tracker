import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Nav from '@/components/Nav';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

export const metadata: Metadata = {
  title: 'MTG Arena Tracker',
  description: 'Friday night Magic — rosters, round-robins and ELO leaderboards.',
};

/** Five-mana gradient hairline — white, blue, black, red, green. */
function ManaStrip() {
  return (
    <div
      aria-hidden
      className="h-[3px] w-full"
      style={{
        background:
          'linear-gradient(90deg, #f4f0e6 0%, #f4f0e6 16%, #0aa1e8 22%, #0aa1e8 36%, #4b4453 42%, #4b4453 56%, #e54c2e 62%, #e54c2e 76%, #2fa06a 82%, #2fa06a 100%)',
      }}
    />
  );
}

/** Original planeswalker-spark mark: a four-point spark inside a ring. */
function SparkMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00C0F3" />
          <stop offset="1" stopColor="#00568C" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="url(#spark-grad)" strokeWidth="2" />
      <path
        d="M16 5.5 L18.9 13.1 L26.5 16 L18.9 18.9 L16 26.5 L13.1 18.9 L5.5 16 L13.1 13.1 Z"
        fill="url(#spark-grad)"
      />
      <circle cx="16" cy="16" r="1.6" fill="#12151c" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currentMemberId = cookies().get('current_member')?.value ?? null;

  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="flex min-h-screen flex-col font-sans text-slate-200 antialiased">
        <ManaStrip />
        <header className="sticky top-0 z-10 border-b border-white/5 bg-base/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <SparkMark className="h-8 w-8 shrink-0 transition group-hover:drop-shadow-[0_0_8px_rgba(0,192,243,0.7)]" />
              <span className="font-display text-[11px] font-black uppercase tracking-[0.18em] sm:text-sm">
                <span className="text-slate-200">MTG</span>{' '}
                <span className="text-glow text-accent">Arena</span>{' '}
                <span className="hidden text-slate-400 sm:inline">Tracker</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Nav />
              <ProfileSwitcher initialMemberId={currentMemberId} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-white/5 px-4 py-5 text-center text-xs leading-relaxed text-slate-600">
          <p className="font-display uppercase tracking-[0.2em] text-slate-500">
            ⚡ Friday Night Magic — internal tool, trust-based scoring ⚡
          </p>
          <p className="mx-auto mt-2 max-w-2xl">
            Unofficial fan tool. Card art is © Wizards of the Coast LLC, sourced via Scryfall and used
            under the Wizards of the Coast Fan Content Policy. Not affiliated with or endorsed by
            Wizards of the Coast.
          </p>
        </footer>
      </body>
    </html>
  );
}
