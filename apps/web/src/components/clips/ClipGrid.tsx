'use client';

import { ClipCardBento } from '@/components/clips/ClipCard';
import type { Clip } from '@/types/clip';

interface ClipGridProps {
  clips: Clip[];
  mode?: 'watch' | 'edit';
}

export function ClipGrid({ clips, mode = 'watch' }: ClipGridProps) {
  return (
    <div className="columns-2 gap-3 [column-fill:_balance] sm:columns-3 lg:columns-4 xl:columns-5">
      {clips.map((clip) => (
        <ClipCardBento key={clip.id} clip={clip} mode={mode} />
      ))}
    </div>
  );
}
