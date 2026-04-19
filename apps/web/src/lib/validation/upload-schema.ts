import { z } from 'zod';
import { CLIP_LIMITS } from '@/types/clip';

export const CAMPAIGN_DURATION_DAYS = ['7', '30', '90'] as const;
export type CampaignDurationDays = (typeof CAMPAIGN_DURATION_DAYS)[number];

export const MIN_REWARD_PER_CLAIM_SUI = 0.001;
export const MAX_REWARD_PER_CLAIM_SUI = 100;
export const MAX_CLAIMS_PER_CAMPAIGN = 1_000_000;

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
    missionsEnabled: z.boolean(),
    includeLike: z.boolean(),
    includeComment: z.boolean(),
    rewardSui: z.coerce
      .number()
      .min(0)
      .max(MAX_REWARD_PER_CLAIM_SUI),
    maxClaims: z.coerce
      .number()
      .int()
      .min(0)
      .max(MAX_CLAIMS_PER_CAMPAIGN),
    durationDays: z.enum(CAMPAIGN_DURATION_DAYS),
  })
  .superRefine((data, ctx) => {
    if (!data.missionsEnabled) return;
    if (data.rewardSui < MIN_REWARD_PER_CLAIM_SUI) {
      ctx.addIssue({
        code: 'custom',
        path: ['rewardSui'],
        message: `Reward must be at least ${MIN_REWARD_PER_CLAIM_SUI} SUI`,
      });
    }
    if (!Number.isInteger(data.maxClaims) || data.maxClaims < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxClaims'],
        message: 'Max claims must be at least 1',
      });
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

export function totalDepositSui(values: UploadFormValues): number {
  if (!values.missionsEnabled) return 0;
  return values.rewardSui * values.maxClaims;
}

export function durationDaysToMs(days: CampaignDurationDays): number {
  return Number(days) * 86_400_000;
}
