import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { getLeaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ leaderboard: await getLeaderboard() });
  } catch (err) {
    return errorResponse(err);
  }
}
