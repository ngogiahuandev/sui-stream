'use client';

import type { ComponentProps } from 'react';
import {
  BarChart3Icon,
  CompassIcon,
  FilmIcon,
  FlameIcon,
  HeartIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  LockIcon,
  SearchIcon,
  SettingsIcon,
  VideoIcon,
} from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { NavLibrary } from '@/components/sidebar/NavLibrary';
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
      title: 'Dashboard',
      url: '/dashboard',
      icon: <LayoutDashboardIcon />,
    },
    {
      title: 'My Clips',
      url: '/dashboard/clips',
      icon: <VideoIcon />,
    },
    {
      title: 'Discover',
      url: '/dashboard/discover',
      icon: <CompassIcon />,
    },
    {
      title: 'Trending',
      url: '/dashboard/trending',
      icon: <FlameIcon />,
    },
    {
      title: 'Analytics',
      url: '/dashboard/analytics',
      icon: <BarChart3Icon />,
    },
  ],
  library: [
    {
      name: 'Liked Clips',
      url: '/dashboard/liked',
      icon: <HeartIcon />,
    },
    {
      name: 'Private Vault',
      url: '/dashboard/vault',
      icon: <LockIcon />,
    },
    {
      name: 'Collections',
      url: '/dashboard/collections',
      icon: <FilmIcon />,
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '/dashboard/settings',
      icon: <SettingsIcon />,
    },
    {
      title: 'Search',
      url: '/dashboard/search',
      icon: <SearchIcon />,
    },
    {
      title: 'Help',
      url: '/dashboard/help',
      icon: <HelpCircleIcon />,
    },
  ],
} as const;

/**
 * SuiStream-branded application sidebar. Composition mirrors the shadcn
 * dashboard shell: a branded header, main/library/secondary nav groups,
 * and a wallet-aware user footer.
 */
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
        <NavLibrary items={[...SIDEBAR_DATA.library]} />
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
