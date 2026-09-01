import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from './api';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

/** True if the filename has the exact shape we generate for avatars. */
export function isValidAvatarFilename(filename: string): boolean {
  return /^[A-Za-z0-9-]+\.(png|jpg|jpeg|webp)$/.test(filename);
}

export function contentTypeFor(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}

/** Validates and persists an uploaded avatar, returning its filename. */
export async function saveAvatarFile(file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    throw new ApiError(400, 'Avatar must be a PNG, JPG or WebP image');
  }
  if (file.size === 0) {
    throw new ApiError(400, 'Avatar file is empty');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ApiError(400, 'Avatar must be 5MB or smaller');
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  );
  return filename;
}
