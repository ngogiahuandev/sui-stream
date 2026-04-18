'use client';

import { useCallback, useRef, useState, type SyntheticEvent } from 'react';
import { cn } from '@/lib/utils';
import { getVideoAspectClass } from '@/lib/video-aspect';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onDimensionsDetected?: (width: number, height: number) => void;
  preventDownload?: boolean;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  onTimeUpdate,
  onDimensionsDetected,
  preventDownload = false,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget;
      setDuration(video.duration);
      if (video.videoWidth && video.videoHeight) {
        setDimensions({ width: video.videoWidth, height: video.videoHeight });
        onDimensionsDetected?.(video.videoWidth, video.videoHeight);
      }
    },
    [onDimensionsDetected]
  );

  const handleTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      if (!onTimeUpdate || !duration) return;
      onTimeUpdate(event.currentTarget.currentTime, duration);
    },
    [onTimeUpdate, duration]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLVideoElement>) => {
      if (preventDownload) {
        event.preventDefault();
      }
    },
    [preventDownload]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLVideoElement>) => {
      if (preventDownload) {
        if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
        }
      }
    },
    [preventDownload]
  );

  const aspectClass = getVideoAspectClass(
    dimensions?.width,
    dimensions?.height
  );

  return (
    <div
      className={cn('overflow-hidden rounded-2xl border bg-black', className)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        controlsList={
          preventDownload ? 'nodownload nofullscreen' : 'nofullscreen'
        }
        playsInline
        autoPlay
        muted
        className={cn('w-full bg-black object-contain', aspectClass)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
