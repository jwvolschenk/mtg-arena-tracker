import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { skipMatchup } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await skipMatchup(params.id);
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
