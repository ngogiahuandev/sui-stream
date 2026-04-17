import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: readonly FooterLink[];
}

const COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Discover', href: '#discover' },
      { label: 'Upload', href: '#upload' },
      { label: 'How it works', href: '#how-it-works' },
    ],
  },
  {
    title: 'Stack',
    links: [
      { label: 'Sui', href: 'https://sui.io' },
      { label: 'Walrus', href: 'https://www.walrus.xyz' },
      { label: 'Seal', href: 'https://seal-docs.wal.app' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Docs', href: '#docs' },
      { label: 'GitHub', href: '#github' },
      { label: 'Roadmap', href: '#roadmap' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            A decentralized home for short videos. Stored on Walrus, owned on
            Sui, gated by Seal.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold tracking-wide">
              {column.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} SuiStream. All rights reserved.</p>
          <p>Built on Sui · Walrus · Seal</p>
        </div>
      </div>
    </footer>
  );
}
