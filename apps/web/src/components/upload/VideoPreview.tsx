'use client';

import { VideoPlayerTile } from '@/components/upload/VideoPlayerTile';
import { ThumbnailTile } from '@/components/upload/ThumbnailTile';
import { FileInfoBar } from '@/components/upload/FileInfoBar';
import { getVideoAspectClass } from '@/lib/video-aspect';
import type { VideoMetadata, VideoThumbnail } from '@/lib/video-thumbnail';

interface VideoPreviewProps {
  videoUrl: string;
  fileName: string;
  fileSizeBytes: number;
  metadata: VideoMetadata | null;
  thumbnail: VideoThumbnail | null;
  isProcessing: boolean;
  isGeneratingThumbnail: boolean;
  onClear: () => void;
  onGenerateThumbnail: () => void;
}

export function VideoPreview({
  videoUrl,
  fileName,
  fileSizeBytes,
  metadata,
  thumbnail,
  isProcessing,
  isGeneratingThumbnail,
  onClear,
  onGenerateThumbnail,
}: VideoPreviewProps) {
  const aspectClass = getVideoAspectClass(metadata?.width, metadata?.height);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <VideoPlayerTile videoUrl={videoUrl} aspectClass={aspectClass} />
        <ThumbnailTile
          thumbnail={thumbnail}
          aspectClass={aspectClass}
          isProcessing={isProcessing}
          isGeneratingThumbnail={isGeneratingThumbnail}
          onGenerateThumbnail={onGenerateThumbnail}
        />
      </div>
      <FileInfoBar
        fileName={fileName}
        fileSizeBytes={fileSizeBytes}
        metadata={metadata}
        isProcessing={isProcessing}
        onClear={onClear}
      />
    </div>
  );
}
