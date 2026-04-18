'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloudIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACCEPTED_VIDEO_MIME_TYPES, CLIP_LIMITS } from '@/types/clip';

interface UploadDropzoneProps {
  onFileSelected: (file: File | null) => void | Promise<void>;
  isProcessing: boolean;
  className?: string;
}

const ACCEPT = ACCEPTED_VIDEO_MIME_TYPES.join(',');
const MAX_MB = Math.round(CLIP_LIMITS.maxSizeBytes / (1024 * 1024));

export function UploadDropzone({
  onFileSelected,
  isProcessing,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    if (isProcessing) return;
    inputRef.current?.click();
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    await onFileSelected(nextFile);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    await onFileSelected(nextFile);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a video"
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-colors',
        'hover:border-primary/60 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'border-primary bg-primary/5',
        isProcessing && 'pointer-events-none opacity-70',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <span
        aria-hidden="true"
        className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        <UploadCloudIcon className="size-7" />
      </span>
      <h3 className="text-base font-semibold">
        {isProcessing ? 'Processing video…' : 'Drop a clip or browse'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        MP4, MOV, or WebM up to {MAX_MB} MB. Max {CLIP_LIMITS.maxDurationSeconds}
        {' '}seconds.
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-5"
        onClick={(event) => {
          event.stopPropagation();
          openPicker();
        }}
        disabled={isProcessing}
      >
        Select video
      </Button>
    </div>
  );
}
