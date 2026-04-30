import type { AgentBalances, PoolState } from '@/types';

interface Props {
  address: string;
  balances: AgentBalances;
  pool: PoolState;
  onRefresh: () => void;
}

export default function HoldingsPanel({ address, balances, pool, onRefresh }: Props) {
  const yttValueJpy = balances.ytt * pool.price;
  const total = balances.jpyy + yttValueJpy;
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const explorerUrl = `https://amoy.polygonscan.com/address/${address}`;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>HOLDINGS（エージェント）</span>
        <button style={styles.refreshBtn} onClick={onRefresh} title="残高を更新">↻</button>
      </div>

      <Row label="アドレス">
        <a href={explorerUrl} target="_blank" rel="noreferrer" style={styles.address}>
          {shortAddr}
        </a>
      </Row>
      <Divider />
      <Row label="POL">
        <span style={styles.mono}>{balances.pol.toFixed(4)}</span>
      </Row>
      <Divider />
      <Row label="JPYY">
        <div>
          <span style={styles.monoLarge}>¥ {balances.jpyy.toLocaleString()}</span>
          <div style={styles.sub}>≈ {balances.jpyy.toLocaleString()} 円</div>
        </div>
      </Row>
      <Divider />
      <Row label="YTT">
        <div>
          <span style={styles.monoLarge}>{balances.ytt.toFixed(2)} YTT</span>
          <div style={styles.sub}>≈ ¥ {yttValueJpy.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </Row>
      <Divider />
      <Row label="合計資産">
        <span style={styles.monoTotal}>≈ ¥ {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--color-border)' }} />;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    padding: 'var(--space-card)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.08em',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    color: 'var(--color-text-secondary)',
    padding: '2px 4px',
  },
  address: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  mono: {
    fontFamily: 'var(--font-mono)',
    fontSize: 15,
    color: 'var(--color-text-primary)',
  },
  monoLarge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  monoTotal: {
    fontFamily: 'var(--font-mono)',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--color-text-hint)',
    marginTop: 2,
  },
};
