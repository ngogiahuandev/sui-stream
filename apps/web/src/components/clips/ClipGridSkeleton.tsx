import { Skeleton } from '@/components/ui/skeleton';

interface ClipGridSkeletonProps {
  count?: number;
}

const ASPECT_PATTERN = ['16 / 9', '9 / 16', '16 / 9', '1 / 1', '9 / 16', '16 / 9'];

export function ClipGridSkeleton({ count = 10 }: ClipGridSkeletonProps) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5 [column-fill:_balance]">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          style={{ aspectRatio: ASPECT_PATTERN[i % ASPECT_PATTERN.length] }}
          className="mb-3 w-full break-inside-avoid rounded-xl"
        />
      ))}
    </div>
  );
}
