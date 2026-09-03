import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { createDeck } from '@/lib/decks';
import { deckListSchema, deckNameSchema, firstIssueMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json().catch(() => null)) as { name?: unknown; list?: unknown } | null;

    const name = deckNameSchema.safeParse(body?.name);
    if (!name.success) throw new ApiError(400, firstIssueMessage(name.error));

    const list = deckListSchema.safeParse(body?.list);
    if (!list.success) throw new ApiError(400, firstIssueMessage(list.error));

    // Deck import waits on Scryfall lookups and art downloads.
    const { deck, warnings } = await createDeck(params.id, name.data, list.data);
    return NextResponse.json({ deck, warnings }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
