import Link from 'next/link';
import PageBanner from '@/components/PageBanner';
import { getSeasons } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Seasons — MTG Arena Tracker' };

export default async function SeasonsPage() {
  const seasons = await getSeasons();
  const hasActive = seasons.some((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-8">
      <PageBanner image="/art/seasons-timewarp.jpg" kicker="Saga archive" title="Seasons">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            Round-robin history — every season, preserved for posterity.
          </p>
          {!hasActive && (
            <Link href="/seasons/new" className="btn-primary">
              ⚔️ Start season
            </Link>
          )}
        </div>
      </PageBanner>

      {seasons.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-400">
          No seasons yet.{' '}
          <Link href="/seasons/new" className="text-accent hover:underline">
            Start the first one
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {seasons.map((season) => {
            const total = season.matchups.length;
            const completed = season.matchups.filter((m) => m.status === 'COMPLETED').length;
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <li key={season.id}>
                <Link
                  href={`/seasons/${season.id}`}
                  className="card fade-in-up flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold tracking-wide text-slate-100">
                      {season.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Started {season.createdAt.toLocaleDateString()} ·{' '}
                      {season.participants.length} duelists · {completed}/{total} matches
                    </p>
                    <div className="mt-2 h-1 max-w-56 overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-navy via-accent-strong to-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {season.status === 'ACTIVE' ? (
                    <span className="badge shrink-0 border border-accent/40 bg-accent/10 text-accent">
                      ● Active
                    </span>
                  ) : (
                    <span className="badge shrink-0 bg-plum/40 text-slate-300">
                      ✦ Completed
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
