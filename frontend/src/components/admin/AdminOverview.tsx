import { useTradingStore } from '@/store/tradingStore';

export default function AdminOverview() {
  const state = useTradingStore((s) => s.state);
  if (!state) return null;

  const { pool, balances } = state;

  const cards = [
    { label: 'JPYY 総発行量', value: '¥ 1,000,000', sub: '+¥50,000 今日' },
    { label: 'AMMプール', value: '健全', sub: `JPYY: ${pool.jpyyReserve.toLocaleString()} / YTT: ${pool.yttReserve}` },
    { label: 'YTT 現在価格', value: `¥ ${pool.price.toFixed(2)}`, sub: '↑ リアルタイム' },
    {
      label: 'エージェント残高',
      value: `JPYY: ¥${balances.jpyy.toLocaleString()}`,
      sub: `YTT: ${balances.ytt.toFixed(2)}`,
    },
  ];

  return (
    <div>
      <h1 style={styles.heading}>概要</h1>
      <div style={styles.grid}>
        {cards.map((c) => (
          <div key={c.label} style={styles.card}>
            <div style={styles.cardLabel}>{c.label}</div>
            <div style={styles.cardValue}>{c.value}</div>
            <div style={styles.cardSub}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  card: {
    background: 'var(--admin-bg-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: 12,
    padding: 20,
  },
  cardLabel: { fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: 'var(--admin-text-secondary)', letterSpacing: '0.06em', marginBottom: 8 },
  cardValue: { fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 4 },
  cardSub: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--admin-text-secondary)' },
};
