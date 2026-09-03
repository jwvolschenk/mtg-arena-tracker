import type { DeckCard } from '@prisma/client';
import { splitColors } from '@/lib/colors';
import type { DeckWithCards } from '@/lib/decks';
import DeleteDeckButton from './DeleteDeckButton';
import { hueFor } from './Avatar';
import ManaCost from './ManaCost';
import ManaSymbol from './ManaSymbol';

/**
 * Renders one imported deck: a header banner using the key card's artwork,
 * then each board as a grid of card tiles (art, quantity, name, mana cost).
 * Tiles link to the card on Scryfall.
 */

const BOARD_LABELS: Partial<Record<string, string>> = {
  commander: 'Commander',
  companion: 'Companion',
  side: 'Sideboard',
};

const isLand = (card: DeckCard) => /\bLand\b/.test(card.typeLine ?? '');

/** Nonlands by ascending mana value, lands last — the usual "how a deck reads" order. */
function sortForDisplay(cards: DeckCard[]): DeckCard[] {
  return [...cards].sort((a, b) => {
    const landDiff = Number(isLand(a)) - Number(isLand(b));
    if (landDiff !== 0) return landDiff;
    const cmcDiff = (a.cmc ?? 99) - (b.cmc ?? 99);
    if (cmcDiff !== 0) return cmcDiff;
    return a.name.localeCompare(b.name);
  });
}

function CardTile({ card }: { card: DeckCard }) {
  const total = card.quantity > 1 ? `${card.quantity}× ` : '';
  const title = `${total}${card.name}${card.typeLine ? ` — ${card.typeLine}` : ''}`;
  const href = `https://scryfall.com/card/${card.setCode.toLowerCase()}/${card.collectorNumber}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      className="group relative block overflow-hidden rounded-lg border border-white/10 bg-panel transition hover:border-accent/60 hover:shadow-glow"
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        {card.artPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- art is served by our own API route
          <img
            src={`/api/card-art/${card.artPath}`}
            alt={card.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(150deg, hsl(${hueFor(card.name)} 45% 30%), hsl(${(hueFor(card.name) + 40) % 360} 40% 18%))`,
            }}
          >
            <span className="font-display text-2xl font-black text-white/25">{card.name[0]}</span>
          </div>
        )}
      </div>
      {card.quantity > 1 && (
        <span className="absolute right-1 top-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-white/15">
          {card.quantity}×
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1.5 pb-1 pt-5">
        <p className="truncate text-[10px] font-semibold leading-tight text-slate-100">{card.name}</p>
        <ManaCost cost={card.manaCost} size={11} className="mt-0.5" />
      </div>
    </a>
  );
}

function CardGrid({ cards }: { cards: DeckCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
      {cards.map((card) => (
        <CardTile key={card.id} card={card} />
      ))}
    </div>
  );
}

export default function DeckView({ deck }: { deck: DeckWithCards }) {
  const boards = new Map<string, DeckCard[]>();
  for (const card of deck.cards) {
    const list = boards.get(card.board) ?? [];
    list.push(card);
    boards.set(card.board, list);
  }

  const main = sortForDisplay(boards.get('main') ?? []);
  const side = sortForDisplay(boards.get('side') ?? []);
  const commandCards = sortForDisplay([
    ...(boards.get('commander') ?? []),
    ...(boards.get('companion') ?? []),
  ]);

  const countBoard = (cards: DeckCard[]) => cards.reduce((sum, card) => sum + card.quantity, 0);
  const mainCount = countBoard(main) + countBoard(commandCards);

  // Key card for the banner art: the commander, else the biggest nonland we have art for.
  const keyCard =
    commandCards.find((card) => card.artPath) ??
    main.find((card) => card.artPath && !isLand(card)) ??
    main.find((card) => card.artPath) ??
    commandCards[0] ??
    main[0];

  const manaColors = splitColors(deck.colors);

  return (
    <article className="card fade-in-up overflow-hidden">
      <header className="relative h-28 overflow-hidden">
        {keyCard?.artPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- art is served by our own API route
          <img
            src={`/api/card-art/${keyCard.artPath}`}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-[50%_20%] opacity-50"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, hsl(${hueFor(deck.name)} 55% 26%), hsl(${(hueFor(deck.name) + 45) % 360} 45% 14%))`,
            }}
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/70 to-base/20" />
        <div className="relative flex h-full items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="text-glow-soft truncate font-display text-lg font-bold uppercase tracking-wide text-slate-50">
              {deck.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {mainCount} cards
              {side.length > 0 && ` · ${countBoard(side)} sideboard`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {manaColors.length > 0 && (
              <span className="flex gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]" title={`Colors: ${deck.colors}`}>
                {manaColors.map((letter) => (
                  <ManaSymbol key={letter} color={letter} size={16} />
                ))}
              </span>
            )}
            <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {commandCards.length > 0 && (
          <section className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {boards.has('commander') ? 'Commander' : 'Companion'}
            </h4>
            <CardGrid cards={commandCards} />
          </section>
        )}

        <section className="space-y-1.5">
          {commandCards.length > 0 && (
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Main deck</h4>
          )}
          <CardGrid cards={main} />
        </section>

        {side.length > 0 && (
          <section className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sideboard</h4>
            <CardGrid cards={side} />
          </section>
        )}
      </div>
    </article>
  );
}
