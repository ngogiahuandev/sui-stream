'use client';

import type { CSSProperties, ReactNode } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { SiteHeader } from '@/components/sidebar/SiteHeader';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

const SHELL_STYLE = {
  '--sidebar-width': 'calc(var(--spacing) * 72)',
  '--header-height': 'calc(var(--spacing) * 12)',
} as CSSProperties;

interface DashboardShellProps {
  children: ReactNode;
}

/**
 * Reusable dashboard chrome: sidebar + top site-header + content slot.
 * Every page rendered under /app/dashboard/* inherits this shell via
 * the colocated layout.tsx.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider style={SHELL_STYLE}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
