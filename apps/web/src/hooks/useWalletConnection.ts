'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
} from '@mysten/dapp-kit';
import { toast } from 'sonner';

export interface WalletConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  displayAddress: string | null;
  walletName: string | null;
  isModalOpen: boolean;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  setModalOpen: (open: boolean) => void;
  disconnect: () => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function useWalletConnection(): WalletConnectionState {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const account = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const currentWallet = useCurrentWallet();
  const { mutate: disconnectMutate } = useDisconnectWallet();

  const openConnectModal = useCallback(() => setIsModalOpen(true), []);
  const closeConnectModal = useCallback(() => setIsModalOpen(false), []);

  const disconnect = useCallback(() => {
    disconnectMutate(undefined, {
      onSuccess: () => {
        toast.success('Wallet disconnected');
      },
      onError: (error) => {
        console.error('[wallet] disconnect failed', error);
        toast.error('Could not disconnect wallet');
      },
    });
  }, [disconnectMutate]);

  const address = account?.address ?? null;
  const displayAddress = useMemo(
    () => (address ? truncateAddress(address) : null),
    [address]
  );
  const walletName =
    currentWallet.isConnected && currentWallet.currentWallet
      ? currentWallet.currentWallet.name
      : null;

  return {
    isConnected: connectionStatus === 'connected' && Boolean(account),
    isConnecting: connectionStatus === 'connecting',
    address,
    displayAddress,
    walletName,
    isModalOpen,
    openConnectModal,
    closeConnectModal,
    setModalOpen: setIsModalOpen,
    disconnect,
  };
}
