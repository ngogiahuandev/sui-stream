'use client';

import type { ComponentProps } from 'react';
import {
  CompassIcon,
  HistoryIcon,
  SettingsIcon,
  VideoIcon,
} from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { NavMain } from '@/components/sidebar/NavMain';
import { NavSecondary } from '@/components/sidebar/NavSecondary';
import { NavUser } from '@/components/sidebar/NavUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const SIDEBAR_DATA = {
  navMain: [
    {
      title: 'Discover',
      url: '/dashboard/discover',
      icon: <CompassIcon />,
    },
    {
      title: 'My Channel',
      url: '/dashboard/my-videos',
      icon: <VideoIcon />,
    },
    {
      title: 'History',
      url: '/dashboard/history',
      icon: <HistoryIcon />,
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '/dashboard/settings',
      icon: <SettingsIcon />,
    },
  ],
} as const;

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Logo className="px-2 py-1.5" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={[...SIDEBAR_DATA.navMain]} />
        <NavSecondary
          items={[...SIDEBAR_DATA.navSecondary]}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
