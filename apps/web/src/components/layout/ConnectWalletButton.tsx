'use client';

import Link from 'next/link';
import { ChevronDown, LayoutDashboard, LogOut, Wallet } from 'lucide-react';
import { ConnectModal } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CopyButton } from '@/components/common/CopyButton';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { cn } from '@/lib/utils';

interface ConnectWalletButtonProps {
  className?: string;
}

export function ConnectWalletButton({ className }: ConnectWalletButtonProps) {
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

  if (isConnected && address && displayAddress) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn('gap-1.5 px-3 font-semibold shadow-sm', className)}
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-emerald-500"
            />
            <span className="font-mono text-xs">{displayAddress}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-normal">
              {walletName ?? 'Connected wallet'}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span
                className="truncate font-mono text-xs"
                title={address}
              >
                {displayAddress}
              </span>
              <CopyButton
                value={address}
                label="Copy address"
                successToast="Address copied"
              />
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={disconnect}
            className="text-destructive focus:text-destructive"
          >
            <LogOut aria-hidden="true" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <ConnectModal
      open={isModalOpen}
      onOpenChange={setModalOpen}
      trigger={
        <Button
          type="button"
          variant="outline"
          disabled={isConnecting}
          className={cn('gap-1.5 px-4 font-semibold shadow-sm', className)}
        >
          <Wallet aria-hidden="true" />
          <span>{isConnecting ? 'Connecting…' : 'Connect Wallet'}</span>
        </Button>
      }
    />
  );
}
