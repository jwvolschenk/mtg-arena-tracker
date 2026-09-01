import { z } from 'zod';

export const memberNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(40, 'Name must be 40 characters or fewer');

export const nicknameSchema = z
  .string()
  .trim()
  .max(40, 'Nickname must be 40 characters or fewer')
  .optional()
  .transform((v: string | undefined) => (v === '' ? null : v));

export const createSeasonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Season name is required')
    .max(60, 'Season name must be 60 characters or fewer'),
  memberIds: z
    .array(z.string().min(1))
    .min(2, 'Select at least 2 members to start a season')
    .max(64, 'A season cannot have more than 64 members'),
});

export const recordResultSchema = z
  .object({
    winnerId: z.string().min(1).optional(),
    isDraw: z.boolean().optional(),
  })
  .refine(
    (data) => data.isDraw === true || typeof data.winnerId === 'string',
    { message: 'Provide either winnerId or isDraw: true' },
  );

/** Returns the first zod issue's message, for surfacing in API errors. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}
