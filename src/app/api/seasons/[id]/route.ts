import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { getSeasonById } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const season = await getSeasonById(params.id);
    if (!season) throw new ApiError(404, 'Season not found');
    return NextResponse.json({ season });
  } catch (err) {
    return errorResponse(err);
  }
}
