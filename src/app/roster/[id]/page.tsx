import Link from 'next/link';
import { notFound } from 'next/navigation';
import Avatar from '@/components/Avatar';
import DeckImportForm from '@/components/DeckImportForm';
import DeckView from '@/components/DeckView';
import PageBanner from '@/components/PageBanner';
import { listDecksForMember } from '@/lib/decks';
import { getMember } from '@/lib/members';

export const dynamic = 'force-dynamic';

export default async function MemberProfilePage({ params }: { params: { id: string } }) {
  const member = await getMember(params.id);
  if (!member) notFound();

  const decks = await listDecksForMember(member.id);

  return (
    <div className="space-y-8">
      <PageBanner image="/art/hero-bolas.jpg" kicker="Roster · Duelist" title={member.name}>
        <div className="flex items-center gap-3">
          <Avatar
            name={member.name}
            avatarPath={member.avatarPath}
            colors={member.colors}
            size={48}
            dimmed={!member.active}
          />
          <p className="text-sm text-slate-300">
            <span className={member.active ? 'font-bold text-slate-100' : 'font-bold text-slate-400'}>
              {member.elo}
            </span>{' '}
            ELO
            {member.nickname && <span className="text-slate-400"> · “{member.nickname}”</span>}
            {!member.active && <span className="text-slate-500"> · archived</span>}
            <span className="text-slate-400">
              {' '}
              · {decks.length === 1 ? '1 deck' : `${decks.length} decks`}
            </span>
          </p>
        </div>
      </PageBanner>

      <Link
        href="/roster"
        className="inline-flex text-xs font-semibold text-slate-400 transition hover:text-accent"
      >
        ← Back to roster
      </Link>

      <DeckImportForm memberId={member.id} />

      {decks.length === 0 ? (
        <p className="card p-6 text-center text-sm text-slate-400">
          No decks yet — export one from MTG Arena and paste it above. 🐺
        </p>
      ) : (
        <div className="space-y-6">
          {decks.map((deck) => (
            <DeckView key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
