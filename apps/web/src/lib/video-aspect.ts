export function getVideoAspectClass(width?: number, height?: number): string {
  if (!width || !height) return 'aspect-video';
  const ratio = width / height;
  if (ratio > 1.1) return 'aspect-video';
  if (ratio < 0.9) return 'aspect-[9/16]';
  return 'aspect-video';
}

export function isPortraitVideo(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return width / height < 0.9;
}
