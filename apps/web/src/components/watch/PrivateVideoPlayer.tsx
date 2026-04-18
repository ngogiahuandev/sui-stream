'use client';

import { useEffect } from 'react';
import { Loader2Icon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/watch/VideoPlayer';
import { UnlockPrompt } from '@/components/watch/UnlockPrompt';
import { useClipAccess } from '@/hooks/useClipAccess';
import { useDecryptedClipUrl } from '@/hooks/useDecryptedClipUrl';
import { useUnlockClip } from '@/hooks/useUnlockClip';
import { useCurrentAccount } from '@mysten/dapp-kit';
import type { Clip } from '@/types/clip';

interface PrivateVideoPlayerProps {
  clip: Clip;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  preventDownload?: boolean;
}

export function PrivateVideoPlayer({
  clip,
  onTimeUpdate,
  preventDownload = false,
}: PrivateVideoPlayerProps) {
  const account = useCurrentAccount();
  const isOwner = Boolean(account && account.address === clip.owner);

  const { access, refetch: refetchAccess } = useClipAccess({
    clipId: clip.id,
    viewerAddress: account?.address,
  });

  const hasAccess = isOwner || Boolean(access);

  const { unlock, isUnlocking } = useUnlockClip();

  const { url, isPreparing, error, start } = useDecryptedClipUrl({
    clip,
    access,
    isOwner,
    enabled: hasAccess,
  });

  useEffect(() => {
    if (hasAccess && !url && !isPreparing && !error) {
      void start();
    }
  }, [hasAccess, url, isPreparing, error, start]);

  if (!account) {
    return (
      <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-2xl border p-12 text-center">
        <h2 className="text-lg font-semibold">Connect your wallet</h2>
        <p className="text-muted-foreground text-sm">
          Connect a wallet to unlock and watch private clips.
        </p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <UnlockPrompt
        thumbnailBlobId={clip.thumbnailBlobId}
        title={clip.title}
        priceMist={clip.priceMist}
        isUnlocking={isUnlocking}
        onUnlock={async () => {
          await unlock({
            clipId: clip.id,
            priceMist: BigInt(clip.priceMist),
          });
          refetchAccess();
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-2xl border p-12 text-center">
        <h2 className="text-base font-semibold">Could not decrypt clip</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={() => start()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (isPreparing || !url) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border bg-black text-white">
        {isPreparing ? (
          <>
            <Loader2Icon className="size-6 animate-spin" />
            <span className="text-sm">Decrypting clip…</span>
          </>
        ) : (
          <Button onClick={() => start()} variant="secondary" className="gap-2">
            <PlayIcon className="size-4" />
            Start playback
          </Button>
        )}
      </div>
    );
  }

  return (
    <VideoPlayer
      src={url}
      onTimeUpdate={onTimeUpdate}
      preventDownload={preventDownload}
    />
  );
}
