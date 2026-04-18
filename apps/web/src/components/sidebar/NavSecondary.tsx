'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import Link from 'next/link';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export interface NavSecondaryItem {
  title: string;
  url: string;
  icon: ReactNode;
}

interface NavSecondaryProps
  extends ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: NavSecondaryItem[];
}

/**
 * Secondary (footer-anchored) sidebar nav — used for low-frequency links like
 * Settings, Help, Search.
 */
export function NavSecondary({ items, ...props }: NavSecondaryProps) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
