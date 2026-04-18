'use client';

import { GlobeIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

export function UploadForm() {
  const upload = useClipUpload();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = upload.form;

  const title = watch('title') ?? '';
  const description = watch('description') ?? '';

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

          <div className="bg-muted/30 flex items-center justify-between rounded-2xl border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <GlobeIcon className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Visibility</span>
                <span className="text-muted-foreground text-xs">
                  Clip is visible to everyone on SuiStream.
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full capitalize">
              Public
            </Badge>
          </div>
        </FieldGroup>
      </FieldSet>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={upload.clearFile}
          disabled={!upload.file || upload.isProcessing || upload.isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!upload.canSubmit} className="gap-2">
          {upload.isSubmitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          Publish clip
        </Button>
      </div>
    </form>
  );
}
