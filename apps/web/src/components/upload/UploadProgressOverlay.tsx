'use client';

import { CheckIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { UploadStep } from '@/hooks/useClipUpload';

interface UploadProgressOverlayProps {
  open: boolean;
  steps: UploadStep[];
}

function StepIcon({ status }: { status: UploadStep['status'] }) {
  if (status === 'complete') {
    return (
      <motion.span
        key="complete"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        className="bg-primary text-primary-foreground shadow-primary/30 flex size-7 shrink-0 items-center justify-center rounded-full shadow"
      >
        <CheckIcon className="size-4" />
      </motion.span>
    );
  }
  if (status === 'active') {
    return <Loader2Icon className="text-primary size-7 animate-spin" />;
  }
  if (status === 'error') {
    return (
      <span className="border-destructive text-destructive flex size-7 shrink-0 items-center justify-center rounded-full border-2">
        <AlertTriangleIcon className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="border-muted-foreground/30 text-muted-foreground/60 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold" />
  );
}

export function UploadProgressOverlay({
  open,
  steps,
}: UploadProgressOverlayProps) {
  if (!open) return null;

  const activeIndex = steps.findIndex((s) => s.status === 'active');
  const completedCount = steps.filter((s) => s.status === 'complete').length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="bg-background/60 absolute inset-0 z-20 flex items-center justify-center rounded-2xl backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.96, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-card/90 border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl"
      >
        <div className="mb-5 flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Publishing your clip
          </span>
          <span className="text-lg font-semibold">
            {progress === 100 ? 'All done — redirecting…' : 'Hang tight…'}
          </span>
          <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          </div>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => {
            const isDimmed =
              step.status === 'pending' &&
              activeIndex !== -1 &&
              index > activeIndex;
            return (
              <motion.li
                key={step.id}
                layout
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                  step.status === 'active' && 'bg-primary/5',
                  step.status === 'complete' && 'bg-primary/5',
                  step.status === 'error' && 'bg-destructive/5'
                )}
              >
                <StepIcon status={step.status} />
                <span
                  className={cn(
                    'text-sm transition-colors',
                    step.status === 'complete' && 'text-primary font-medium',
                    step.status === 'active' && 'text-foreground font-semibold',
                    step.status === 'error' && 'text-destructive font-medium',
                    step.status === 'pending' && 'text-muted-foreground',
                    isDimmed && 'opacity-60'
                  )}
                >
                  {step.label}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </motion.div>
    </motion.div>
  );
}
