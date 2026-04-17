'use client';

import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConnectWalletButtonProps {
  className?: string;
}

/**
 * Presentational Connect Wallet button.
 *
 * Wallet connection logic will be wired through a dedicated `useWallet` hook
 * (see CLAUDE.md "Architecture — Strict Logic / UI Separation"). For the
 * MVP landing page this is intentionally a no-op trigger.
 */
export function ConnectWalletButton({ className }: ConnectWalletButtonProps) {
  return (
    <Button
      type="button"
      variant={'outline'}
      className={cn('gap-1.5 px-4 font-semibold shadow-sm', className)}
    >
      <Wallet aria-hidden="true" />
      <span>Connect Wallet</span>
    </Button>
  );
}
