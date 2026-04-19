'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<typeof Button>;

interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
}

export function BackButton({
  label = 'Back',
  fallbackHref = '/dashboard/discover',
  className,
  size = 'sm',
  variant = 'ghost',
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }, [router, fallbackHref]);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      className={cn('gap-1.5 self-start', className)}
    >
      <ArrowLeftIcon className="size-4" />
      {label}
    </Button>
  );
}
