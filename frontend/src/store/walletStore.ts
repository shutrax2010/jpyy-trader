import { create } from 'zustand';
import { BrowserProvider, formatEther } from 'ethers';

declare global {
  interface Window { ethereum?: unknown; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEip1193(): any {
  if (!window.ethereum) throw new Error('MetaMask がインストールされていません');
  return window.ethereum;
}

const AMOY_CHAIN_ID  = 80002;
// 管理ウォレットアドレス（小文字）
const ADMIN_ADDR = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? '').toLowerCase();

function isAdminWallet(address: string): boolean {
  return !!ADMIN_ADDR && address.toLowerCase() === ADMIN_ADDR;
}

interface WalletState {
  address:      string | null;
  loading:      boolean;
  error:        string | null;
  chainId:      number | null;
  polBalance:   string | null;
  wrongNetwork: boolean;
}

interface WalletStore {
  user: WalletState;
  connectUser:    () => Promise<void>;
  disconnectUser: () => Promise<void>;
  autoConnect:    () => Promise<void>;
  fetchPolBalance:() => Promise<void>;
  switchToAmoy:   () => Promise<void>;
}

const BLANK: WalletState = {
  address: null, loading: false, error: null,
  chainId: null, polBalance: null, wrongNetwork: false,
};

let listenersAttached = false;

export const useWalletStore = create<WalletStore>((set, get) => {

  function setupListeners() {
    if (listenersAttached || typeof window === 'undefined') return;
    listenersAttached = true;
    const eth = getEip1193();

    eth.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0 || isAdminWallet(accounts[0])) {
        get().disconnectUser();
      } else {
        set(s => ({ user: { ...s.user, address: accounts[0], polBalance: null } }));
        get().fetchPolBalance();
      }
    });

    eth.on('chainChanged', (hexId: string) => {
      const id = parseInt(hexId, 16);
      set(s => ({ user: { ...s.user, chainId: id, wrongNetwork: id !== AMOY_CHAIN_ID, polBalance: null } }));
      get().fetchPolBalance();
    });
  }

  async function applyConnection(address: string, chainId: number) {
    set({ user: {
      address, loading: false, error: null,
      chainId, polBalance: null,
      wrongNetwork: chainId !== AMOY_CHAIN_ID,
    }});
    setupListeners();
    get().fetchPolBalance();
  }

  return {
    user: { ...BLANK },

    /** ボタン押下による手動接続（MetaMask ポップアップあり） */
    connectUser: async () => {
      set(s => ({ user: { ...s.user, loading: true, error: null } }));
      try {
        const provider = new BrowserProvider(getEip1193());
        await provider.send('eth_requestAccounts', []);
        const address = await (await provider.getSigner()).getAddress();

        // 管理ウォレットでの接続は拒否
        if (isAdminWallet(address)) {
          set({ user: {
            ...BLANK,
            error: `${address.slice(0, 6)}…${address.slice(-4)} は管理ウォレットです。エージェント専用のウォレットアカウントで接続してください。`,
          }});
          return;
        }

        const network = await provider.getNetwork();
        await applyConnection(address, Number(network.chainId));
      } catch (e) {
        set({ user: { ...BLANK, error: e instanceof Error ? e.message : '接続に失敗しました' } });
      }
    },

    disconnectUser: async () => {
      // MetaMask の接続許可を取り消す（対応していない場合はローカルのみクリア）
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          await getEip1193().request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
        } catch {
          // 未対応バージョンの MetaMask では無視
        }
      }
      set({ user: { ...BLANK } });
    },

    /** ページロード時の自動復元（ポップアップなし） */
    autoConnect: async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      try {
        const accounts: string[] = await getEip1193().request({ method: 'eth_accounts' });
        if (accounts.length === 0) return;

        // 管理ウォレットは自動接続しない → 接続画面を表示したまま
        if (isAdminWallet(accounts[0])) return;

        const provider = new BrowserProvider(getEip1193());
        const signer   = await provider.getSigner();
        const address  = await signer.getAddress();
        const network  = await provider.getNetwork();
        await applyConnection(address, Number(network.chainId));
      } catch {
        // 自動復元失敗はサイレントに無視（手動接続を促す）
      }
    },

    fetchPolBalance: async () => {
      const { address } = get().user;
      if (!address || typeof window === 'undefined' || !window.ethereum) return;
      try {
        const provider = new BrowserProvider(getEip1193());
        const rawBal   = await provider.getBalance(address);
        set(s => ({ user: { ...s.user, polBalance: Number(formatEther(rawBal)).toFixed(4) } }));
      } catch {
        // 残高取得失敗は無視（接続自体は維持）
      }
    },

    switchToAmoy: async () => {
      try {
        await getEip1193().request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }],
        });
      } catch (e: unknown) {
        if ((e as { code?: number }).code === 4902) {
          await getEip1193().request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x13882',
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
              rpcUrls: ['https://rpc-amoy.polygon.technology'],
              blockExplorerUrls: ['https://amoy.polygonscan.com'],
            }],
          });
        }
      }
    },
  };
});
