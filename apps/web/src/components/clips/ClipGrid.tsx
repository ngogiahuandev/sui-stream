'use client';

import { ClipCard } from '@/components/clips/ClipCard';
import type { Clip } from '@/types/clip';

interface ClipGridProps {
  clips: Clip[];
}

export function ClipGrid({ clips }: ClipGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clips.map((clip) => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
