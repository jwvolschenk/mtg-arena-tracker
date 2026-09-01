import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { unskipMatchup } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await unskipMatchup(params.id);
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
