'use client';

import type { MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';

type ButtonSize = 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';

interface CopyButtonProps {
  /** Text to copy when clicked. */
  value: string;
  /** Accessible label (used as aria-label). Default: "Copy". */
  label?: string;
  /** Icon button size. Default: `icon-xs`. */
  size?: ButtonSize;
  /** Stop the click from bubbling (useful inside dropdown menus). Default true. */
  stopPropagation?: boolean;
  /** Show a success toast after copy. Default false. */
  successToast?: string | false;
  className?: string;
}

/**
 * UI-only copy-to-clipboard icon button. All side effects live in
 * `useCopyToClipboard`.
 */
export function CopyButton({
  value,
  label = 'Copy',
  stopPropagation = true,
  successToast = false,
  className,
}: CopyButtonProps) {
  const { copy, copied } = useCopyToClipboard({ successToast });

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) event.stopPropagation();
    // Prevent parent triggers (e.g. DropdownMenuItem) from closing/activating.
    event.preventDefault();
    void copy(value);
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={copied ? 'Copied' : label}
      onClick={handleClick}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        copied && 'text-emerald-500 hover:text-emerald-500',
        className
      )}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </Button>
  );
}
