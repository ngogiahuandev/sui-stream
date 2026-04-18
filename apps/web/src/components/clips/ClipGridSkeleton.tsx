import { Skeleton } from '@/components/ui/skeleton';

interface ClipGridSkeletonProps {
  count?: number;
}

export function ClipGridSkeleton({ count = 8 }: ClipGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border/60 flex flex-col gap-3 rounded-xl border p-3"
        >
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
