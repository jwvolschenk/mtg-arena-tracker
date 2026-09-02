import { NextRequest, NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { canonicalizeColors } from '@/lib/colors';
import { updateMember } from '@/lib/members';
import { colorsSchema, firstIssueMessage, memberNameSchema, nicknameSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const form = await req.formData();

    const data: { name?: string; nickname?: string | null; colors?: string | null; active?: boolean; avatar?: File | null } = {};

    const name = form.get('name');
    if (name !== null) {
      const parsed = memberNameSchema.safeParse(name);
      if (!parsed.success) throw new ApiError(400, firstIssueMessage(parsed.error));
      data.name = parsed.data;
    }

    // The edit form sends a colors_set marker so "every box unticked"
    // (clear the flair) is distinguishable from "field not in this form".
    if (form.get('colors_set') !== null) {
      const raw = form.getAll('colors').filter((v): v is string => typeof v === 'string');
      const parsed = colorsSchema.safeParse(raw);
      if (!parsed.success) throw new ApiError(400, firstIssueMessage(parsed.error));
      data.colors = canonicalizeColors(parsed.data);
    }

    const nickname = form.get('nickname');
    if (nickname !== null) {
      const parsed = nicknameSchema.safeParse(nickname);
      if (!parsed.success) throw new ApiError(400, firstIssueMessage(parsed.error));
      data.nickname = parsed.data ?? null;
    }

    const active = form.get('active');
    if (active !== null) {
      if (active !== 'true' && active !== 'false') {
        throw new ApiError(400, 'active must be "true" or "false"');
      }
      data.active = active === 'true';
    }

    const avatar = form.get('avatar');
    if (avatar instanceof File && avatar.size > 0) {
      data.avatar = avatar;
    }

    const member = await updateMember(params.id, data);
    return NextResponse.json({ member });
  } catch (err) {
    return errorResponse(err);
  }
}
