'use client';

import { Loader2Icon, Ban, UploadCloudIcon, SparklesIcon } from 'lucide-react';
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
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { VideoPreview } from '@/components/upload/VideoPreview';
import { UploadProgressOverlay } from '@/components/upload/UploadProgressOverlay';
import { useClipUpload } from '@/hooks/useClipUpload';
import { CLIP_LIMITS } from '@/types/clip';

export function UploadForm() {
  const upload = useClipUpload();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = upload.form;

  const title = upload.form.watch('title') ?? '';
  const description = upload.form.watch('description') ?? '';

  return (
    <form
      onSubmit={handleSubmit(upload.onSubmit)}
      className="relative flex flex-col gap-6"
      noValidate
    >
      <UploadProgressOverlay
        open={upload.isSubmitting}
        steps={upload.uploadSteps}
      />

      {upload.file && upload.videoUrl ? (
        <VideoPreview
          videoUrl={upload.videoUrl}
          fileName={upload.file.name}
          fileSizeBytes={upload.file.size}
          metadata={upload.metadata}
          thumbnail={upload.thumbnail}
          isProcessing={upload.isProcessing}
          isGeneratingThumbnail={upload.isGeneratingThumbnail}
          onClear={upload.clearFile}
          onGenerateThumbnail={upload.generateThumbnailWithAI}
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

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={upload.clearFile}
          disabled={
            !upload.file ||
            upload.isProcessing ||
            upload.isGenerating ||
            upload.isSubmitting
          }
        >
          <Ban className="size-4" />
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={!upload.canSubmit || upload.isGenerating}
        >
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
