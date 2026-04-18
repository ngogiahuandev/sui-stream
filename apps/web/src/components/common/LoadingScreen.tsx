import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  /** Primary line, e.g. "Connecting wallet…". */
  title?: string;
  /** Secondary line, smaller and muted. */
  description?: string;
  /**
   * `full` fills the viewport (min-h-screen). `inline` fills its parent so it
   * can be reused inside a dashboard panel. Default `full`.
   */
  variant?: 'full' | 'inline';
  className?: string;
}

/**
 * Reusable loading state. UI only — no data fetching or state.
 */
export function LoadingScreen({
  title = 'Loading…',
  description,
  variant = 'full',
  className,
}: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-6 text-center',
        variant === 'full' ? 'min-h-screen' : 'min-h-80 flex-1',
        className
      )}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />

      <div className="space-y-1">
        <p className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </p>
        {description ? (
          <p className="text-muted-foreground max-w-sm text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
