import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { getActiveSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const season = await getActiveSeason();
    return NextResponse.json({ season });
  } catch (err) {
    return errorResponse(err);
  }
}
