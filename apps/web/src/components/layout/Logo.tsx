import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="SuiStream home"
      className={cn(
        'group font-heading inline-flex items-center gap-2 text-lg font-bold tracking-tight',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="from-primary to-chart-2 text-primary-foreground relative inline-flex size-7 items-center justify-center rounded-lg bg-linear-to-br shadow-sm transition-transform group-hover:scale-105"
      >
        <span className="text-sm leading-none font-black">S</span>
        <span className="bg-chart-1 ring-background absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2" />
      </span>
      <span className="from-foreground via-foreground to-primary bg-linear-to-r bg-clip-text text-transparent">
        SuiStream
      </span>
    </Link>
  );
}
