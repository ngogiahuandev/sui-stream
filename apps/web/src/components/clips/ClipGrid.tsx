'use client';

import { ClipCardBento } from '@/components/clips/ClipCard';
import type { Clip } from '@/types/clip';

interface ClipGridProps {
  clips: Clip[];
}

export function ClipGrid({ clips }: ClipGridProps) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5 [column-fill:_balance]">
      {clips.map((clip) => (
        <ClipCardBento key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
