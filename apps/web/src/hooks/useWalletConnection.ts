'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
} from '@mysten/dapp-kit';
import { toast } from 'sonner';

export interface WalletConnectionState {
  /** True when a wallet is fully connected and an account is selected. */
  isConnected: boolean;
  /** True while the provider is establishing a connection (resume or initial). */
  isConnecting: boolean;
  /** The connected Sui address (0x…) or null. */
  address: string | null;
  /** Short human-readable address like 0x1234…abcd or null. */
  displayAddress: string | null;
  /** The connected wallet's display name, if any. */
  walletName: string | null;
  /** Whether the connect modal is currently open. */
  isModalOpen: boolean;
  /** Open the connect-wallet modal. */
  openConnectModal: () => void;
  /** Close the connect-wallet modal. */
  closeConnectModal: () => void;
  /** Imperatively set modal visibility (for <ConnectModal open=…>). */
  setModalOpen: (open: boolean) => void;
  /** Disconnect the currently connected wallet. */
  disconnect: () => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Encapsulates all wallet-connection state and side effects so that UI
 * components can remain presentational (see CLAUDE.md "Architecture — Strict
 * Logic / UI Separation").
 */
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
