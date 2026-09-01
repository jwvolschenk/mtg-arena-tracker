import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { getChallenges, recordChallenge } from '@/lib/challenges';
import { firstIssueMessage, challengeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const challenges = await getChallenges();
    return NextResponse.json({ challenges });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = challengeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, firstIssueMessage(parsed.error));
    }
    const challenge = await recordChallenge(parsed.data);
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
