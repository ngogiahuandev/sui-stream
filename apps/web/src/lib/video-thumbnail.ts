export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
}

export interface VideoThumbnail {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestampSeconds: number;
}

export interface VideoFrame {
  dataUrl: string;
  timestampSeconds: number;
}

export interface ExtractThumbnailOptions {
  timestampSeconds?: number;
  mimeType?: string;
  quality?: number;
  maxWidth?: number;
}

export interface ExtractFramesOptions {
  intervalSeconds?: number;
  maxWidth?: number;
  mimeType?: string;
  quality?: number;
}

const DEFAULT_MIME = 'image/jpeg';
const DEFAULT_QUALITY = 0.85;
const DEFAULT_TIMESTAMP = 1;
const DEFAULT_MAX_WIDTH = 1280;

function createVideoElement(file: File): HTMLVideoElement {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = URL.createObjectURL(file);
  return video;
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
  });
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to seek video'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = seconds;
  });
}

function drawFrameToCanvas(
  video: HTMLVideoElement,
  maxWidth: number
): HTMLCanvasElement {
  const naturalWidth = video.videoWidth || 1280;
  const naturalHeight = video.videoHeight || 720;
  const scale = Math.min(1, maxWidth / naturalWidth);
  const width = Math.round(naturalWidth * scale);
  const height = Math.round(naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  ctx.drawImage(video, 0, 0, width, height);

  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      mimeType,
      quality
    );
  });
}

export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  const video = createVideoElement(file);
  try {
    await waitForMetadata(video);
    return {
      durationSeconds: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}

export async function extractThumbnail(
  file: File,
  options: ExtractThumbnailOptions = {}
): Promise<VideoThumbnail> {
  const {
    timestampSeconds = DEFAULT_TIMESTAMP,
    mimeType = DEFAULT_MIME,
    quality = DEFAULT_QUALITY,
    maxWidth = DEFAULT_MAX_WIDTH,
  } = options;

  const video = createVideoElement(file);
  try {
    await waitForMetadata(video);
    const clampedTimestamp = Math.min(
      Math.max(0, timestampSeconds),
      Math.max(0, video.duration - 0.1)
    );
    await seekTo(video, clampedTimestamp);
    const canvas = drawFrameToCanvas(video, maxWidth);
    const blob = await canvasToBlob(canvas, mimeType, quality);
    const dataUrl = canvas.toDataURL(mimeType, quality);
    return {
      blob,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      timestampSeconds: clampedTimestamp,
    };
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}

export async function extractKeyframes(
  file: File,
  count: number,
  options: Omit<ExtractThumbnailOptions, 'timestampSeconds'> = {}
): Promise<VideoThumbnail[]> {
  if (count < 1) return [];

  const {
    mimeType = DEFAULT_MIME,
    quality = DEFAULT_QUALITY,
    maxWidth = DEFAULT_MAX_WIDTH,
  } = options;

  const video = createVideoElement(file);
  try {
    await waitForMetadata(video);
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Video duration is unavailable');
    }

    const step = duration / (count + 1);
    const frames: VideoThumbnail[] = [];
    for (let i = 1; i <= count; i += 1) {
      const timestampSeconds = Math.min(step * i, Math.max(0, duration - 0.1));
      await seekTo(video, timestampSeconds);
      const canvas = drawFrameToCanvas(video, maxWidth);
      const blob = await canvasToBlob(canvas, mimeType, quality);
      frames.push({
        blob,
        dataUrl: canvas.toDataURL(mimeType, quality),
        width: canvas.width,
        height: canvas.height,
        timestampSeconds,
      });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}

export async function extractFramesAtIntervals(
  file: File,
  options: ExtractFramesOptions = {}
): Promise<VideoFrame[]> {
  const {
    intervalSeconds = 10,
    maxWidth = 640,
    mimeType = DEFAULT_MIME,
    quality = 0.7,
  } = options;

  const video = createVideoElement(file);
  try {
    await waitForMetadata(video);
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Video duration is unavailable');
    }

    const frameCount = Math.min(Math.floor(duration / intervalSeconds), 6);
    if (frameCount < 1) return [];

    const frames: VideoFrame[] = [];
    for (let i = 1; i <= frameCount; i += 1) {
      const timestampSeconds = Math.min(
        intervalSeconds * i,
        Math.max(0, duration - 0.1)
      );
      await seekTo(video, timestampSeconds);
      const canvas = drawFrameToCanvas(video, maxWidth);
      const dataUrl = canvas.toDataURL(mimeType, quality);
      frames.push({
        dataUrl,
        timestampSeconds,
      });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}
