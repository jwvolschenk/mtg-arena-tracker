import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { recordResult } from '@/lib/seasons';
import { firstIssueMessage, recordResultSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = recordResultSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, firstIssueMessage(parsed.error));
    }
    const result = await recordResult(params.id, parsed.data);
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
