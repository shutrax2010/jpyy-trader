import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import '@/styles/tokens.css';
import { useWalletStore } from '@/store/walletStore';

function WalletAutoConnect() {
  const autoConnect = useWalletStore(s => s.autoConnect);
  useEffect(() => {
    autoConnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <WalletAutoConnect />
      <Component {...pageProps} />
    </>
  );
}
