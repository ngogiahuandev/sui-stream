'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletCards } from 'lucide-react';
import { ConnectWalletButton } from '@/components/layout/ConnectWalletButton';
import { ErrorScreen } from '@/components/common/ErrorScreen';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useWalletConnection } from '@/hooks/useWalletConnection';

const DASHBOARD_PATH = '/dashboard';

export function WalletRequiredView() {
  const { isConnected, isConnecting } = useWalletConnection();
  const router = useRouter();

  // If the user connects a wallet from this screen, send them to the
  // dashboard they were originally trying to reach.
  useEffect(() => {
    if (isConnected) {
      router.replace(DASHBOARD_PATH);
    }
  }, [isConnected, router]);

  if (isConnecting) {
    return (
      <LoadingScreen
        title="Checking wallet…"
        description="Reconnecting to your last-used Sui wallet."
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <ErrorScreen
        variant="inline"
        eyebrow="Wallet required"
        title="Connect a Sui wallet to continue"
        description="The dashboard is gated to wallet holders. Connect any Sui Wallet Standard wallet (Sui Wallet, Suiet, Ethos, Slush, …) to access your clips."
        icon={WalletCards}
        secondaryAction={{ label: 'Back to home', href: '/' }}
      />
      <ConnectWalletButton />
    </div>
  );
}
