import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { contentTypeFor, isValidAvatarFilename, UPLOAD_DIR } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } },
) {
  try {
    const { filename } = params;
    if (!isValidAvatarFilename(filename)) {
      throw new ApiError(400, 'Invalid avatar filename');
    }
    const contentType = contentTypeFor(filename);
    if (!contentType) throw new ApiError(400, 'Unsupported avatar type');

    const buffer = await readFile(path.join(UPLOAD_DIR, filename)).catch(() => {
      throw new ApiError(404, 'Avatar not found');
    });
    // Copy into an ArrayBuffer-backed view so it is a valid Response body.
    const body = new Uint8Array(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        // Filenames are unique UUIDs, so avatars can be cached forever.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
