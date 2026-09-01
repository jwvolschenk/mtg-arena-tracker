import { Prisma, type Member } from '@prisma/client';
import { ApiError } from './api';
import { prisma } from './prisma';
import { saveAvatarFile } from './uploads';

export type MemberFilter = 'all' | 'active' | 'archived';

export async function listMembers(filter: MemberFilter = 'all'): Promise<Member[]> {
  const where = filter === 'all' ? {} : { active: filter === 'active' };
  return prisma.member.findMany({
    where,
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export async function createMember(name: string, avatar: File | null): Promise<Member> {
  const avatarPath = avatar ? await saveAvatarFile(avatar) : null;
  try {
    return await prisma.member.create({ data: { name, avatarPath } });
  } catch (err) {
    throw translatePrismaError(err, `A member named "${name}" already exists`);
  }
}

export async function updateMember(
  id: string,
  data: { name?: string; active?: boolean; avatar?: File | null },
): Promise<Member> {
  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Member not found');

  const update: Prisma.MemberUpdateInput = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.active !== undefined) update.active = data.active;
  if (data.avatar) update.avatarPath = await saveAvatarFile(data.avatar);

  try {
    return await prisma.member.update({ where: { id }, data: update });
  } catch (err) {
    throw translatePrismaError(err, `A member named "${data.name}" already exists`);
  }
}

function translatePrismaError(err: unknown, duplicateMessage: string): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return new ApiError(409, duplicateMessage);
  }
  return err;
}
