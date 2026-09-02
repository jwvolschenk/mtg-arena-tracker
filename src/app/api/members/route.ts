import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { canonicalizeColors } from '@/lib/colors';
import { createMember, listMembers, type MemberFilter } from '@/lib/members';
import { colorsSchema, firstIssueMessage, memberNameSchema, nicknameSchema } from '@/lib/validation';

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

    const nicknameRaw = form.get('nickname');
    const nicknameParsed = nicknameSchema.safeParse(nicknameRaw ?? undefined);
    const nickname = nicknameParsed.success ? nicknameParsed.data : null;

    const member = await createMember(parsed.data, avatarFile, nickname, parseColors(form));
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Reads repeat `colors` entries from the form and canonicalises them (null = none ticked). */
function parseColors(form: FormData): string | null {
  const raw = form.getAll('colors').filter((v): v is string => typeof v === 'string');
  const parsed = colorsSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, firstIssueMessage(parsed.error));
  return canonicalizeColors(parsed.data);
}
