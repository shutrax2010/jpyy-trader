import Head from 'next/head';
import { usePolling } from '@/hooks/usePolling';
import { useAgent } from '@/hooks/useAgent';
import { useWallet } from '@/hooks/useWallet';
import { useTradingStore } from '@/store/tradingStore';
import Header from '@/components/Header';
import AgentControlPanel from '@/components/AgentControlPanel';
import HoldingsPanel from '@/components/HoldingsPanel';
import PriceChart from '@/components/PriceChart';
import PoolStatusPanel from '@/components/PoolStatusPanel';
import AIDecisionPanel from '@/components/AIDecisionPanel';
import TxHistoryTable from '@/components/TxHistoryTable';
import WalletConnectionScreen from '@/components/WalletConnectionScreen';
import type { AgentMode } from '@/types';

export default function TradeDashboard() {
  const wallet = useWallet();
  const { refetch } = usePolling();
  const { start, stop, updateConfig } = useAgent();
  const { state, isLoading } = useTradingStore();

  if (!wallet.address) {
    return (
      <WalletConnectionScreen
        loading={wallet.loading}
        error={wallet.error}
        onConnect={wallet.connect}
      />
    );
  }

  if (isLoading || !state) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingText}>読み込み中…</span>
      </div>
    );
  }

  async function handleStart() {
    await start();
    setTimeout(refetch, 300);
  }

  async function handleStop() {
    await stop();
    setTimeout(refetch, 300);
  }

  async function handleConfigChange(mode: AgentMode, interval: number, tradeAmount: number) {
    await updateConfig(mode, interval, tradeAmount);
  }

  return (
    <>
      <Head>
        <title>JPYY TRADER</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.page}>
        <Header
          running={state.agent.running}
          mode={state.agent.mode}
          walletAddress={wallet.address}
          onDisconnect={wallet.disconnect}
        />

        <main style={styles.main}>
          {/* 左カラム */}
          <aside style={styles.left}>
            <AgentControlPanel
              running={state.agent.running}
              mode={state.agent.mode}
              interval={state.agent.interval}
              tradeAmount={state.agent.tradeAmount}
              jpyyBalance={state.balances.jpyy}
              lastDecision={state.lastDecision}
              onStart={handleStart}
              onStop={handleStop}
              onConfigChange={handleConfigChange}
            />
            <HoldingsPanel
              address={state.agent.address}
              balances={state.balances}
              pool={state.pool}
              onRefresh={refetch}
            />
          </aside>

          {/* 右カラム */}
          <div style={styles.right}>
            {state.lastError && (
              <div style={styles.errorBanner}>⚠ {state.lastError}</div>
            )}

            <PriceChart
              priceHistory={state.priceHistory}
              currentPrice={state.pool.price}
            />

            <div style={styles.row2}>
              <PoolStatusPanel pool={state.pool} />
              <AIDecisionPanel
                decision={state.lastDecision}
                mode={state.agent.mode}
                nextRunIn={state.agent.nextRunIn}
              />
            </div>

            <TxHistoryTable txHistory={state.txHistory} />
          </div>
        </main>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--color-bg-page)' },
  loading: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-bg-page)',
  },
  loadingText: { fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text-hint)' },
  main: {
    display: 'flex',
    gap: 20,
    padding: 20,
    alignItems: 'flex-start',
    maxWidth: 1280,
    margin: '0 auto',
  },
  left: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  errorBanner: {
    background: 'var(--color-sell-bg)',
    color: 'var(--color-sell)',
    border: '1px solid var(--color-sell)',
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
  },
};
