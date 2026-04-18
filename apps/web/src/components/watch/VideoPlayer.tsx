'use client';

import { useCallback, useRef, useState, type SyntheticEvent } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function VideoPlayer({ src, poster, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);

  const handleLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget;
      setDuration(video.duration);
    },
    []
  );

  const handleTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      if (!onTimeUpdate || !duration) return;
      onTimeUpdate(event.currentTarget.currentTime, duration);
    },
    [onTimeUpdate, duration]
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        playsInline
        autoPlay
        muted
        className="aspect-video w-full bg-black object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}
