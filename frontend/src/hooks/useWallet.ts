import { useWalletStore } from '@/store/walletStore';

export interface WalletState {
  address: string | null;
  loading: boolean;
  error: string | null;
}

export function useWallet() {
  const { user, connectUser, disconnectUser } = useWalletStore();
  return {
    address: user.address,
    loading: user.loading,
    error: user.error,
    connect: connectUser,
    disconnect: disconnectUser,
  };
}
