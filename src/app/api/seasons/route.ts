import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { createSeason, getSeasons } from '@/lib/seasons';
import { createSeasonSchema, firstIssueMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ seasons: await getSeasons() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = createSeasonSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, firstIssueMessage(parsed.error));
    }
    const season = await createSeason(parsed.data.name, parsed.data.memberIds);
    return NextResponse.json({ season }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
