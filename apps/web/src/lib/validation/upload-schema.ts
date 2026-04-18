import { z } from 'zod';
import { CLIP_LIMITS } from '@/types/clip';

export const uploadFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(
        CLIP_LIMITS.maxTitleLength,
        `Title must be ${CLIP_LIMITS.maxTitleLength} characters or fewer`
      ),
    description: z
      .string()
      .max(
        CLIP_LIMITS.maxDescriptionLength,
        `Description must be ${CLIP_LIMITS.maxDescriptionLength} characters or fewer`
      ),
    tagsInput: z.string().max(200, 'Tags list is too long'),
    visibility: z.enum(['public', 'private']),
    priceSui: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.visibility === 'private') {
      const raw = (value.priceSui ?? '').trim();
      if (!raw) {
        ctx.addIssue({
          code: 'custom',
          path: ['priceSui'],
          message: 'Set an unlock price in SUI',
        });
        return;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['priceSui'],
          message: 'Price must be greater than 0',
        });
      } else if (parsed < 0.001) {
        ctx.addIssue({
          code: 'custom',
          path: ['priceSui'],
          message: 'Minimum price is 0.001 SUI',
        });
      } else if (parsed > 1_000_000) {
        ctx.addIssue({
          code: 'custom',
          path: ['priceSui'],
          message: 'Price is too large',
        });
      }
    }
  });

export type UploadFormValues = z.infer<typeof uploadFormSchema>;

export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter((tag) => tag.length > 0 && tag.length <= CLIP_LIMITS.maxTagLength)
    .slice(0, CLIP_LIMITS.maxTags);
}

export function suiToMist(suiString: string): bigint {
  const trimmed = suiString.trim();
  if (!trimmed) throw new Error('Empty SUI amount');
  const [whole, fraction = ''] = trimmed.split('.');
  const fractionPadded = (fraction + '000000000').slice(0, 9);
  return BigInt(whole) * 1_000_000_000n + BigInt(fractionPadded || '0');
}

export function mistToSui(mist: string | bigint): string {
  const value = typeof mist === 'bigint' ? mist : BigInt(mist);
  const whole = value / 1_000_000_000n;
  const fraction = value % 1_000_000_000n;
  const fracStr = fraction.toString().padStart(9, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
