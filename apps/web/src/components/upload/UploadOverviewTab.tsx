'use client';

import { Loader2Icon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import type { UseClipUploadResult } from '@/hooks/useClipUpload';
import { CLIP_LIMITS } from '@/types/clip';

interface UploadOverviewTabProps {
  upload: UseClipUploadResult;
}

export function UploadOverviewTab({ upload }: UploadOverviewTabProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = upload.form;

  const title = watch('title') ?? '';
  const description = watch('description') ?? '';

  return (
    <div className="flex flex-col gap-6">
      <Button
        type="button"
        variant="default"
        onClick={upload.generateWithAI}
        disabled={
          upload.isGeneratingThumbnail || !upload.file || upload.isSubmitting
        }
      >
        {upload.isGenerating ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SparklesIcon className="size-4" />
        )}
        <span>Generate title, description &amp; tags with AI</span>
      </Button>

      <FieldSet disabled={!upload.file || upload.isGenerating}>
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="clip-title">Title</FieldLabel>
            <Input
              id="clip-title"
              placeholder="Give your clip a catchy title"
              maxLength={CLIP_LIMITS.maxTitleLength}
              aria-invalid={errors.title ? true : undefined}
              disabled={upload.isGenerating || upload.isSubmitting}
              {...register('title')}
            />
            <div className="flex items-center justify-between gap-2">
              <FieldError errors={errors.title ? [errors.title] : undefined} />
              <span className="text-muted-foreground ml-auto text-xs">
                {title.length}/{CLIP_LIMITS.maxTitleLength}
              </span>
            </div>
          </Field>

          <Field data-invalid={errors.description ? true : undefined}>
            <FieldLabel htmlFor="clip-description">Description</FieldLabel>
            <Textarea
              id="clip-description"
              placeholder="What's this clip about?"
              maxLength={CLIP_LIMITS.maxDescriptionLength}
              rows={4}
              aria-invalid={errors.description ? true : undefined}
              disabled={upload.isGenerating || upload.isSubmitting}
              {...register('description')}
            />
            <div className="flex items-center justify-between gap-2">
              <FieldError
                errors={errors.description ? [errors.description] : undefined}
              />
              <span className="text-muted-foreground ml-auto text-xs">
                {description.length}/{CLIP_LIMITS.maxDescriptionLength}
              </span>
            </div>
          </Field>

          <Field data-invalid={errors.tagsInput ? true : undefined}>
            <FieldLabel htmlFor="clip-tags">Tags</FieldLabel>
            <Input
              id="clip-tags"
              placeholder="comma, separated, tags"
              aria-invalid={errors.tagsInput ? true : undefined}
              disabled={upload.isGenerating || upload.isSubmitting}
              {...register('tagsInput')}
            />
            <FieldError
              errors={errors.tagsInput ? [errors.tagsInput] : undefined}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
