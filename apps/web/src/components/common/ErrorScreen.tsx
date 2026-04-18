import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorScreenAction {
  label: string;
  /** Provide `href` for a Link, or `onClick` for a handler. */
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

interface ErrorScreenProps {
  /** Eyebrow shown above the title (e.g. "401" or "Wallet required"). */
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  primaryAction?: ErrorScreenAction;
  secondaryAction?: ErrorScreenAction;
  /**
   * `full` fills the viewport. `inline` fills its parent so it can be reused
   * inside a panel (e.g. a failed widget). Default `full`.
   */
  variant?: 'full' | 'inline';
  className?: string;
}

function ActionButton({ action }: { action: ErrorScreenAction }) {
  const { label, href, onClick, variant = 'default' } = action;
  if (href) {
    return (
      <Button asChild variant={variant} size="lg">
        <Link href={href}>{label}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} size="lg" onClick={onClick}>
      {label}
    </Button>
  );
}

/**
 * Reusable error state. UI only — callers supply title/description/actions.
 */
export function ErrorScreen({
  eyebrow,
  title,
  description,
  icon: Icon = AlertTriangle,
  primaryAction,
  secondaryAction,
  variant = 'full',
  className,
}: ErrorScreenProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-6 px-6 text-center',
        variant === 'full' ? 'min-h-screen' : 'min-h-[320px] flex-1',
        className
      )}
    >
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
        <Icon className="size-7" aria-hidden="true" />
      </span>

      <div className="max-w-md space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-widest text-destructive uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {primaryAction || secondaryAction ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {primaryAction ? <ActionButton action={primaryAction} /> : null}
          {secondaryAction ? (
            <ActionButton
              action={{ variant: 'outline', ...secondaryAction }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
