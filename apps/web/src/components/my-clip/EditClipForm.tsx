'use client';

import { useMemo, useState } from 'react';
import { Loader2Icon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagsInput } from '@/components/ui/tags-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUpdateClipMetadata } from '@/hooks/useUpdateClipMetadata';
import { CLIP_LIMITS } from '@/types/clip';
import type { Clip } from '@/types/clip';
import { cn } from '@/lib/utils';

interface EditClipFormProps {
  clip: Clip;
}

export function EditClipForm({ clip }: EditClipFormProps) {
  const { submit, isSubmitting, isOwner } = useUpdateClipMetadata(clip);

  const [title, setTitle] = useState(clip.title);
  const [description, setDescription] = useState(clip.description);
  const [tags, setTags] = useState<string[]>(clip.tags);
  const [tagInput, setTagInput] = useState('');

  const isDirty = useMemo(() => {
    if (title !== clip.title) return true;
    if (description !== clip.description) return true;
    if (tags.length !== clip.tags.length) return true;
    for (let i = 0; i < tags.length; i += 1) {
      if (tags[i] !== clip.tags[i]) return true;
    }
    return false;
  }, [title, description, tags, clip]);

  const titleTooLong = title.length > CLIP_LIMITS.maxTitleLength;
  const descriptionTooLong =
    description.length > CLIP_LIMITS.maxDescriptionLength;
  const titleEmpty = title.trim().length === 0;

  const canSubmit =
    isOwner &&
    !isSubmitting &&
    isDirty &&
    !titleTooLong &&
    !descriptionTooLong &&
    !titleEmpty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await submit({ title, description, tags });
  };

  const handleReset = () => {
    setTitle(clip.title);
    setDescription(clip.description);
    setTags(clip.tags);
    setTagInput('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clip metadata</CardTitle>
        <CardDescription>
          Update the title, description, and tags. The uploaded video cannot be
          changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="clip-title">Title</Label>
            <Input
              id="clip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isOwner || isSubmitting}
              maxLength={CLIP_LIMITS.maxTitleLength + 20}
            />
            <span
              className={cn(
                'text-muted-foreground text-xs',
                titleTooLong && 'text-destructive',
                titleEmpty && 'text-destructive'
              )}
            >
              {title.length} / {CLIP_LIMITS.maxTitleLength} characters
              {titleEmpty ? ' • title is required' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clip-description">Description</Label>
            <Textarea
              id="clip-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner || isSubmitting}
              rows={4}
              className="resize-none"
            />
            <span
              className={cn(
                'text-muted-foreground text-xs',
                descriptionTooLong && 'text-destructive'
              )}
            >
              {description.length} / {CLIP_LIMITS.maxDescriptionLength}{' '}
              characters
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <TagsInput
              value={tags}
              onChange={setTags}
              inputValue={tagInput}
              onInputChange={setTagInput}
              disabled={!isOwner || isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="size-3.5" />
              )}
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
