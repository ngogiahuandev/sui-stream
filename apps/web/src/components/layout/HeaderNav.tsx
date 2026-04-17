import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Discover', href: '#discover' },
  { label: 'Upload', href: '#upload' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Docs', href: '#docs' },
];

interface HeaderNavProps {
  className?: string;
}

export function HeaderNav({ className }: HeaderNavProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn('hidden items-center gap-1 md:flex', className)}
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
