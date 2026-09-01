import AddMemberForm from '@/components/AddMemberForm';
import MemberRow, { type MemberInfo } from '@/components/MemberRow';
import { listMembers } from '@/lib/members';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Roster — MTG Arena Tracker' };

export default async function RosterPage() {
  const members = await listMembers('all');
  const active = members.filter((m) => m.active);
  const archived = members.filter((m) => !m.active);

  return (
    <div className="space-y-8">
      <header className="fade-in-up">
        <h1 className="text-glow text-3xl font-black uppercase tracking-wide text-slate-100">
          Team roster
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {active.length} active {active.length === 1 ? 'duelist' : 'duelists'}
          {archived.length > 0 && ` · ${archived.length} archived`}
        </p>
      </header>

      <AddMemberForm />

      {active.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-400">
          No members yet — add the first duelist above. ⚡
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((member) => (
            <MemberRow key={member.id} member={member as MemberInfo} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            Archived
            <span className="h-px flex-1 bg-gradient-to-r from-plum to-transparent" />
          </h2>
          <p className="text-xs text-slate-600">
            Archived members keep their ELO and match history but can&apos;t join new seasons.
          </p>
          <ul className="space-y-2">
            {archived.map((member) => (
              <MemberRow key={member.id} member={member as MemberInfo} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
