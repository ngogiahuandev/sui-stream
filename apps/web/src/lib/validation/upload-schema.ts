import { z } from 'zod';
import { CLIP_LIMITS } from '@/types/clip';

export const uploadFormSchema = z.object({
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
});

export type UploadFormValues = z.infer<typeof uploadFormSchema>;

export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter((tag) => tag.length > 0 && tag.length <= CLIP_LIMITS.maxTagLength)
    .slice(0, CLIP_LIMITS.maxTags);
}
