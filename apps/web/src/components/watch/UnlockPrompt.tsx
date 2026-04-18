'use client';

import Image from 'next/image';
import { LockIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mistToSui } from '@/lib/validation/upload-schema';
import { getWalrusBlobUrl } from '@/lib/walrus';

interface UnlockPromptProps {
  thumbnailBlobId: string;
  title: string;
  priceMist: string;
  onUnlock: () => void;
  isUnlocking: boolean;
}

export function UnlockPrompt({
  thumbnailBlobId,
  title,
  priceMist,
  onUnlock,
  isUnlocking,
}: UnlockPromptProps) {
  return (
    <div className="bg-muted relative overflow-hidden rounded-2xl border">
      <div className="relative aspect-video">
        <Image
          src={getWalrusBlobUrl(thumbnailBlobId)}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover blur-md scale-105"
          unoptimized
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 p-6 text-center text-white">
          <span className="bg-white/10 flex size-12 items-center justify-center rounded-full">
            <LockIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">This clip is private</h2>
            <p className="text-sm text-white/80">
              Pay once to unlock — replay anytime, forever.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onUnlock}
            disabled={isUnlocking}
            className="gap-2"
          >
            {isUnlocking ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <LockIcon className="size-4" />
            )}
            Unlock for {mistToSui(priceMist)} SUI
          </Button>
        </div>
      </div>
    </div>
  );
}
