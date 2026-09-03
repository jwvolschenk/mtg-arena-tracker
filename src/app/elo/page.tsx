import { cookies } from 'next/headers';
import PageBanner from '@/components/PageBanner';
import EloTracker from '@/components/elo/EloTracker';
import { getEloHistories } from '@/lib/eloHistory';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'ELO Tracker — MTG Arena Tracker' };

/**
 * Rating history across every season fixture and challenge: one trail per
 * duelist on the overview chart, and a per-member breakdown where each
 * point is stamped with the opponent's avatar.
 */
export default async function EloPage() {
  const [{ people, histories }, currentMemberId] = await Promise.all([
    getEloHistories(),
    Promise.resolve(cookies().get('current_member')?.value ?? null),
  ]);

  return (
    <div className="space-y-8">
      <PageBanner image="/art/seasons-timewarp.jpg" kicker="Rating history" title="ELO Tracker">
        <p className="max-w-xl text-sm leading-relaxed text-slate-300">
          Every rating point tells a story. Follow each duelist's ELO across seasons and challenges —
          and see exactly who was on the other side of every swing.
        </p>
      </PageBanner>

      <EloTracker people={people} histories={histories} initialMemberId={currentMemberId} />
    </div>
  );
}
