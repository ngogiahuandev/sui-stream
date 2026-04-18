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

      {upload.file && !upload.isGenerating && (
        <Button
          type="button"
          variant="outline"
          onClick={upload.generateWithAI}
          className="w-full gap-2"
        >
          <SparklesIcon className="size-4" />
          Generate title, description, tags with AI
        </Button>
      )}

      {upload.isGenerating && (
        <div className="bg-muted/30 flex items-center justify-center gap-2 rounded-2xl border p-4">
          <Loader2Icon className="size-5 animate-spin" />
          <span className="text-sm">Analyzing video with AI...</span>
        </div>
      )}

      <FieldSet disabled={!upload.file || upload.isGenerating}>
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="clip-title">Title</FieldLabel>
            <Input
              id="clip-title"
              placeholder="Give your clip a catchy title"
              maxLength={CLIP_LIMITS.maxTitleLength}
              aria-invalid={errors.title ? true : undefined}
              disabled={upload.isGenerating}
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
              disabled={upload.isGenerating}
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
              disabled={upload.isGenerating}
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
          variant={'secondary'}
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
          variant={'default'}
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
