import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { deleteDeck } from '@/lib/decks';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deleteDeck(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
