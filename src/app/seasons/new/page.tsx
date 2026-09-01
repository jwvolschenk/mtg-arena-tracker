import Link from 'next/link';
import StartSeasonForm from '@/components/StartSeasonForm';
import { getActiveSeason, getSeasons } from '@/lib/seasons';
import { listMembers } from '@/lib/members';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Start a season — MTG Arena Tracker' };

export default async function NewSeasonPage() {
  const [activeSeason, members, seasons] = await Promise.all([
    getActiveSeason(),
    listMembers('active'),
    getSeasons(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="fade-in-up">
        <h1 className="text-glow text-3xl font-black uppercase tracking-wide text-slate-100">
          Start a season
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick the duelists — everyone plays everyone exactly once.
        </p>
      </header>

      {activeSeason ? (
        <div className="card border-amber-400/30 bg-amber-400/5 p-5 text-sm text-amber-200">
          <p className="font-bold">
            ⚔️ &ldquo;{activeSeason.name}&rdquo; is still in progress.
          </p>
          <p className="mt-1 text-amber-200/80">
            Only one season can run at a time — record its remaining results on the{' '}
            <Link href="/" className="underline">
              dashboard
            </Link>{' '}
            first.
          </p>
        </div>
      ) : (
        <StartSeasonForm
          members={members.map((m) => ({
            id: m.id,
            name: m.name,
            avatarPath: m.avatarPath,
            elo: m.elo,
          }))}
          defaultName={`Friday Night Magic ${seasons.length + 1}`}
        />
      )}
    </div>
  );
}
