'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useWalletConnection } from '@/hooks/useWalletConnection';

export const HOME_PATH = '/';

interface DashboardGuardProps {
  children: ReactNode;
}

/**
 * Client-side wallet guard for dashboard routes.
 *
 * - While the WalletProvider is auto-connecting, renders a LoadingScreen.
 * - Once resolved and still disconnected, redirects to `/wallet-required`.
 * - Otherwise renders the children (the dashboard shell + page content).
 *
 * Wallet state lives in the browser (wallet extensions + localStorage) so a
 * client guard is appropriate for the MVP. A server-side check would require
 * signed cookies and is out of scope.
 */
export function DashboardGuard({ children }: DashboardGuardProps) {
  const { isConnected, isConnecting } = useWalletConnection();
  const router = useRouter();

  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.replace(HOME_PATH);
    }
  }, [isConnected, isConnecting, router]);

  if (isConnecting) {
    return (
      <LoadingScreen
        title="Checking wallet…"
        description="Reconnecting to your last-used Sui wallet."
      />
    );
  }

  if (!isConnected) {
    // useEffect above is firing the redirect; render a blank loading state
    // so we don't flash the sidebar during navigation.
    return <LoadingScreen title="Redirecting…" />;
  }

  return <>{children}</>;
}
