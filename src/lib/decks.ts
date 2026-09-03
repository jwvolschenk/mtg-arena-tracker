import { Prisma } from '@prisma/client';
import { parseArenaDeck } from './arenaDeck';
import { canonicalizeColors } from './colors';
import { ApiError } from './api';
import { prisma } from './prisma';
import { downloadCardArt, fetchCards } from './scryfall';

export type DeckWithCards = Prisma.DeckGetPayload<{ include: { cards: true } }>;

export async function listDecksForMember(memberId: string): Promise<DeckWithCards[]> {
  return prisma.deck.findMany({
    where: { memberId },
    include: { cards: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteDeck(id: string): Promise<void> {
  const existing = await prisma.deck.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Deck not found');
  await prisma.deck.delete({ where: { id } });
}

/**
 * Imports an MTG Arena clipboard export as a deck on a member's profile:
 * parses the list, enriches it from Scryfall, downloads artwork, and
 * computes the deck's color identity. Unmatchable cards are still stored
 * (name + printing only) and reported as warnings.
 */
export async function createDeck(
  memberId: string,
  name: string,
  list: string,
): Promise<{ deck: DeckWithCards; warnings: string[] }> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new ApiError(404, 'Member not found');

  const { cards: parsed, errors } = parseArenaDeck(list);
  if (parsed.length === 0) {
    throw new ApiError(400, 'No cards found — paste an Arena deck export ("4 Card Name (SET) 123")');
  }

  const warnings: string[] = errors.map((line) => `Skipped unrecognised line: ${line}`);

  const { byRef, notFound } = await fetchCards(parsed.map((card) => ({
    name: card.name,
    setCode: card.setCode,
    collectorNumber: card.collectorNumber,
  })));
  for (const ref of notFound) {
    warnings.push(`No Scryfall match for ${ref.name} (${ref.setCode} ${ref.collectorNumber}) — stored without details`);
  }

  // Download art once per unique card; failures degrade to a placeholder.
  const artByRefKey = new Map<string, string | null>();
  for (const card of byRef.values()) {
    artByRefKey.set(`${card.setCode.toLowerCase()}|${card.collectorNumber.toLowerCase()}`, await downloadCardArt(card));
  }

  const deckColors = canonicalizeColors(
    [...byRef.values()].flatMap((card) => (card.colors ? card.colors.split('') : [])),
  );

  const deck = await prisma.deck.create({
    data: {
      memberId,
      name,
      colors: deckColors,
      cards: {
        create: parsed.map((card, index) => {
          const refKey = `${card.setCode.toLowerCase()}|${card.collectorNumber.toLowerCase()}`;
          const details = byRef.get(refKey) ?? null;
          return {
            board: card.board,
            position: index,
            quantity: card.quantity,
            name: card.name,
            setCode: card.setCode,
            collectorNumber: card.collectorNumber,
            scryfallId: details?.scryfallId ?? null,
            manaCost: details?.manaCost ?? null,
            typeLine: details?.typeLine ?? null,
            colors: details?.colors ?? null,
            cmc: details?.cmc ?? null,
            rarity: details?.rarity ?? null,
            artPath: details ? artByRefKey.get(refKey) ?? null : null,
          };
        }),
      },
    },
    include: { cards: true },
  });

  return { deck, warnings };
}
