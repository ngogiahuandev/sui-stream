'use client';

import Link from 'next/link';
import { Avatar } from 'web3-avatar-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  EllipsisVerticalIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  WalletIcon,
  CopyIcon,
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
} from 'lucide-react';
import { ConnectModal } from '@mysten/dapp-kit';
import { useTheme } from 'next-themes';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useSuiBalance } from '@/hooks/useSuiBalance';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

/**
 * Sidebar footer trigger that exposes the connected wallet.
 *
 * Disconnected: renders the dapp-kit ConnectModal trigger so users can
 * authenticate inline without leaving the dashboard.
 *
 * Connected: renders a truncated address + live SUI balance with a
 * gradient web3-avatar keyed to the address. Dropdown items let users
 * jump to the dashboard, copy their address, or disconnect.
 *
 * All state and side-effects live in dedicated hooks (see CLAUDE.md
 * "Architecture — Strict Logic / UI Separation").
 */
export function NavUser() {
  const { isMobile } = useSidebar();
  const {
    isConnected,
    isConnecting,
    address,
    displayAddress,
    walletName,
    isModalOpen,
    setModalOpen,
    disconnect,
  } = useWalletConnection();
  const { formatted, isLoading: isBalanceLoading } = useSuiBalance({ address });
  const { copy, copied } = useCopyToClipboard({
    successToast: 'Address copied',
  });
  const { theme, setTheme } = useTheme();

  const themeSubmenu = (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <PaletteIcon />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={theme ?? 'system'}
          onValueChange={(value) => setTheme(value)}
        >
          <DropdownMenuRadioItem value="light">
            <SunIcon />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  if (!isConnected || !address || !displayAddress) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                disabled={isConnecting}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground justify-start gap-3"
              >
                <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center">
                  <WalletIcon className="size-4" aria-hidden="true" />
                </span>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {isConnecting ? 'Connecting…' : 'Guest'}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    Not connected
                  </span>
                </div>
                <EllipsisVerticalIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setModalOpen(true);
                }}
              >
                <WalletIcon />
                Connect wallet
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {themeSubmenu}
            </DropdownMenuContent>
          </DropdownMenu>
          <ConnectModal
            open={isModalOpen}
            onOpenChange={setModalOpen}
            trigger={<span className="hidden" aria-hidden="true" />}
          />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const balanceLabel = isBalanceLoading
    ? 'Loading balance…'
    : (formatted ?? '— SUI');

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar
                address={address}
                className="size-8 shrink-0 overflow-hidden"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-mono text-xs font-medium">
                  {displayAddress}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {balanceLabel}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar
                  address={address}
                  className="size-8 shrink-0 overflow-hidden"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-mono text-xs font-medium">
                    {displayAddress}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {walletName
                      ? `${walletName} · ${balanceLabel}`
                      : balanceLabel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <LayoutDashboardIcon />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void copy(address);
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied' : 'Copy address'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {themeSubmenu}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={disconnect}
              className="text-destructive focus:text-destructive"
            >
              <LogOutIcon />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
