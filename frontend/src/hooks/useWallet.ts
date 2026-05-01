import { useWalletStore } from '@/store/walletStore';

export function useWallet() {
  const { user, connectUser, disconnectUser, autoConnect, fetchPolBalance, switchToAmoy } = useWalletStore();
  return {
    address:        user.address,
    loading:        user.loading,
    error:          user.error,
    chainId:        user.chainId,
    polBalance:     user.polBalance,
    wrongNetwork:   user.wrongNetwork,
    connect:        connectUser,
    disconnect:     disconnectUser,
    autoConnect,
    refreshBalance: fetchPolBalance,
    switchToAmoy,
  };
}
