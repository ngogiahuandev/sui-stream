'use client';

import {
  GlobeIcon,
  LockIcon,
  Loader2Icon,
  Ban,
  UploadCloudIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { VideoPreview } from '@/components/upload/VideoPreview';
import { useClipUpload } from '@/hooks/useClipUpload';
import { CLIP_LIMITS } from '@/types/clip';
import { cn } from '@/lib/utils';

export function UploadForm() {
  const upload = useClipUpload();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = upload.form;

  const title = watch('title') ?? '';
  const description = watch('description') ?? '';
  const visibility = watch('visibility');

  return (
    <form
      onSubmit={handleSubmit(upload.onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      {upload.file && upload.videoUrl ? (
        <VideoPreview
          videoUrl={upload.videoUrl}
          fileName={upload.file.name}
          fileSizeBytes={upload.file.size}
          metadata={upload.metadata}
          thumbnail={upload.thumbnail}
          isProcessing={upload.isProcessing}
          onClear={upload.clearFile}
        />
      ) : (
        <UploadDropzone
          onFileSelected={upload.onFileSelected}
          isProcessing={upload.isProcessing}
        />
      )}

      {upload.validationError ? (
        <p className="text-destructive text-sm">{upload.validationError}</p>
      ) : null}

      <FieldSet disabled={!upload.file}>
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="clip-title">Title</FieldLabel>
            <Input
              id="clip-title"
              placeholder="Give your clip a catchy title"
              maxLength={CLIP_LIMITS.maxTitleLength}
              aria-invalid={errors.title ? true : undefined}
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
              {...register('tagsInput')}
            />
            <FieldDescription>
              Up to {CLIP_LIMITS.maxTags} tags. Separate with commas.
            </FieldDescription>
            <FieldError
              errors={errors.tagsInput ? [errors.tagsInput] : undefined}
            />
          </Field>

          <Field>
            <FieldLabel>Visibility</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setValue('visibility', 'public', { shouldValidate: true })
                }
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                  visibility === 'public'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                  <GlobeIcon className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Public</span>
                  <span className="text-muted-foreground text-xs">
                    Anyone can watch for free.
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setValue('visibility', 'private', { shouldValidate: true })
                }
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-4 text-left transition',
                  visibility === 'private'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                  <LockIcon className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Private (paid)</span>
                  <span className="text-muted-foreground text-xs">
                    Encrypted with Seal. Viewers pay SUI to unlock.
                  </span>
                </div>
              </button>
            </div>
          </Field>

          {visibility === 'private' ? (
            <Field data-invalid={errors.priceSui ? true : undefined}>
              <FieldLabel htmlFor="clip-price">Unlock price (SUI)</FieldLabel>
              <Input
                id="clip-price"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0.001"
                placeholder="0.5"
                aria-invalid={errors.priceSui ? true : undefined}
                {...register('priceSui')}
              />
              <FieldDescription>
                Viewers pay this amount in SUI to unlock the clip. Min 0.001
                SUI.
              </FieldDescription>
              <FieldError
                errors={errors.priceSui ? [errors.priceSui] : undefined}
              />
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="button"
          variant={'secondary'}
          onClick={upload.clearFile}
          disabled={!upload.file || upload.isProcessing || upload.isSubmitting}
        >
          <Ban className="size-4" />
          Cancel
        </Button>
        <Button type="submit" variant={'default'} disabled={!upload.canSubmit}>
          {upload.isSubmitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <UploadCloudIcon className="size-4" />
          )}
          Publish clip
        </Button>
      </div>
    </form>
  );
}
