import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Nav from '@/components/Nav';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MTG Arena Tracker',
  description: 'Friday night Magic — rosters, round-robins and ELO leaderboards.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currentMemberId = cookies().get('current_member')?.value ?? null;

  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans text-slate-200 antialiased">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-base/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span aria-hidden className="text-xl">⚡</span>
              <span className="text-sm font-black uppercase tracking-widest">
                <span className="text-slate-200">MTG</span>{' '}
                <span className="text-glow text-accent">Arena</span>{' '}
                <span className="text-slate-400">Tracker</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Nav />
              <ProfileSwitcher initialMemberId={currentMemberId} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-600">
          Friday Night Magic — internal tool, trust-based scoring ⚡
        </footer>
      </body>
    </html>
  );
}
