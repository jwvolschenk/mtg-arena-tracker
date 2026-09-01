import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { createMember, listMembers, type MemberFilter } from '@/lib/members';
import { firstIssueMessage, memberNameSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    const filter: MemberFilter =
      status === 'active' || status === 'archived' ? status : 'all';
    return NextResponse.json({ members: await listMembers(filter) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const parsed = memberNameSchema.safeParse(form.get('name'));
    if (!parsed.success) {
      throw new ApiError(400, firstIssueMessage(parsed.error));
    }
    const avatar = form.get('avatar');
    const avatarFile = avatar instanceof File && avatar.size > 0 ? avatar : null;

    const member = await createMember(parsed.data, avatarFile);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
