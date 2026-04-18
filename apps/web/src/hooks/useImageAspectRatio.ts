'use client';

import { useEffect, useState } from 'react';

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export interface ImageAspectRatio {
  ratio: number | null;
  orientation: ImageOrientation | null;
  isLoaded: boolean;
}

export function useImageAspectRatio(
  url: string | null | undefined
): ImageAspectRatio {
  const [state, setState] = useState<ImageAspectRatio>({
    ratio: null,
    orientation: null,
    isLoaded: false,
  });

  useEffect(() => {
    if (!url) {
      setState({ ratio: null, orientation: null, isLoaded: false });
      return;
    }

    let cancelled = false;
    const img = new window.Image();

    const handleLoad = () => {
      if (cancelled) return;
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) {
        setState({ ratio: null, orientation: null, isLoaded: true });
        return;
      }
      const ratio = w / h;
      const orientation: ImageOrientation =
        ratio > 1.05 ? 'landscape' : ratio < 0.95 ? 'portrait' : 'square';
      setState({ ratio, orientation, isLoaded: true });
    };

    const handleError = () => {
      if (cancelled) return;
      setState({ ratio: null, orientation: null, isLoaded: true });
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = url;

    return () => {
      cancelled = true;
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [url]);

  return state;
}
