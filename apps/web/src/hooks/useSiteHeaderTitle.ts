'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/clips': 'My Clips',
  '/dashboard/upload': 'Upload',
  '/dashboard/discover': 'Discover',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/vault': 'Private Vault',
  '/dashboard/settings': 'Settings',
};

/**
 * Derives the dashboard header title from the current pathname.
 * Falls back to a title-cased version of the last path segment so new
 * routes get a reasonable default without code changes here.
 */
export function useSiteHeaderTitle(): string {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) return 'Dashboard';
    if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];

    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return 'Dashboard';

    return segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [pathname]);
}
