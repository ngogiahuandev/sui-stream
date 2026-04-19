'use client';

import {
  CoinsIcon,
  EyeIcon,
  LockIcon,
  MessageSquareIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import type { UseClipUploadResult } from '@/hooks/useClipUpload';
import {
  CAMPAIGN_DURATION_DAYS,
  MAX_CLAIMS_PER_CAMPAIGN,
  MAX_REWARD_PER_CLAIM_SUI,
  MIN_REWARD_PER_CLAIM_SUI,
  totalDepositSui,
} from '@/lib/validation/upload-schema';

interface UploadCampaignTabProps {
  upload: UseClipUploadResult;
}

export function UploadCampaignTab({ upload }: UploadCampaignTabProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = upload.form;

  const values = watch();
  const enabled = values.missionsEnabled;
  const total = totalDepositSui(values);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-muted/40 flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CoinsIcon className="size-4" />
            <span className="text-sm font-medium">Offer viewer rewards</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Lock SUI in a contract-owned vault. Viewers who complete every
            required mission can claim a reward — once each.
          </p>
        </div>
        <Controller
          control={control}
          name="missionsEnabled"
          render={({ field }) => (
            <Switch
              type="button"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={upload.isSubmitting}
              aria-label="Enable reward campaign"
            />
          )}
        />
      </div>

      <FieldSet disabled={!enabled || upload.isSubmitting}>
        <FieldGroup>
          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                  <EyeIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Watch</span>
                  <span className="text-muted-foreground text-xs">
                    Always required. Viewer watches 30s of the clip.
                  </span>
                </div>
              </div>
              <LockIcon className="text-muted-foreground mt-1 size-4" />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                  <ThumbsUpIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Upvote</span>
                  <span className="text-muted-foreground text-xs">
                    Viewer casts an upvote on the clip.
                  </span>
                </div>
              </div>
              <Controller
                control={control}
                name="includeLike"
                render={({ field }) => (
                  <Switch
                    type="button"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!enabled || upload.isSubmitting}
                  />
                )}
              />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                  <MessageSquareIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Comment</span>
                  <span className="text-muted-foreground text-xs">
                    Viewer posts a non-empty comment.
                  </span>
                </div>
              </div>
              <Controller
                control={control}
                name="includeComment"
                render={({ field }) => (
                  <Switch
                    type="button"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!enabled || upload.isSubmitting}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field data-invalid={errors.rewardSui ? true : undefined}>
              <FieldLabel htmlFor="reward-sui">
                Reward per claim (SUI)
              </FieldLabel>
              <Input
                id="reward-sui"
                type="number"
                inputMode="decimal"
                step={MIN_REWARD_PER_CLAIM_SUI}
                min={0}
                max={MAX_REWARD_PER_CLAIM_SUI}
                placeholder="0.01"
                disabled={!enabled || upload.isSubmitting}
                aria-invalid={errors.rewardSui ? true : undefined}
                {...register('rewardSui', { valueAsNumber: true })}
              />
              <FieldError
                errors={errors.rewardSui ? [errors.rewardSui] : undefined}
              />
            </Field>

            <Field data-invalid={errors.maxClaims ? true : undefined}>
              <FieldLabel htmlFor="max-claims">Max claims</FieldLabel>
              <Input
                id="max-claims"
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                max={MAX_CLAIMS_PER_CAMPAIGN}
                placeholder="100"
                disabled={!enabled || upload.isSubmitting}
                aria-invalid={errors.maxClaims ? true : undefined}
                {...register('maxClaims', { valueAsNumber: true })}
              />
              <FieldError
                errors={errors.maxClaims ? [errors.maxClaims] : undefined}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Pool duration</FieldLabel>
            <Controller
              control={control}
              name="durationDays"
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  variant="outline"
                  className="w-full"
                  disabled={!enabled || upload.isSubmitting}
                >
                  {CAMPAIGN_DURATION_DAYS.map((d) => (
                    <ToggleGroupItem
                      key={d}
                      type="button"
                      value={d}
                      className="flex-1 text-sm"
                    >
                      {d} days
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
            <p className="text-muted-foreground text-xs">
              You can reclaim unused SUI after the pool ends. No mid-life
              withdrawal.
            </p>
          </Field>

          <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-xl border p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Total locked</span>
              <span className="text-muted-foreground text-xs">
                Funded from your wallet on publish.
              </span>
            </div>
            <span className="text-lg font-semibold tabular-nums">
              {total.toFixed(4)} SUI
            </span>
          </div>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
