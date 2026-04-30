import { create } from 'zustand';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

interface WalletEntry {
  address: string | null;
  loading: boolean;
  error: string | null;
}

interface WalletStore {
  user: WalletEntry;
  connectUser: () => Promise<void>;
  disconnectUser: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEip1193(): any {
  if (!window.ethereum) throw new Error('MetaMask がインストールされていません');
  return window.ethereum;
}

export const useWalletStore = create<WalletStore>((set) => ({
  user: { address: null, loading: false, error: null },

  connectUser: async () => {
    set((s) => ({ user: { ...s.user, loading: true, error: null } }));
    try {
      const provider = new BrowserProvider(getEip1193());
      await provider.send('eth_requestAccounts', []);
      const address = await (await provider.getSigner()).getAddress();
      set({ user: { address, loading: false, error: null } });
    } catch (e) {
      set({ user: { address: null, loading: false, error: e instanceof Error ? e.message : '接続に失敗しました' } });
    }
  },

  disconnectUser: () => set({ user: { address: null, loading: false, error: null } }),
}));
