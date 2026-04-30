import type { PoolState } from '@/types';

interface Props {
  pool: PoolState;
}

export default function PoolStatusPanel({ pool }: Props) {
  const ratio = pool.yttReserve > 0 ? pool.jpyyReserve / pool.yttReserve : 0;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>AMMプール状態</span>
        <span style={styles.healthy}>● 健全</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>JPYY残高</span>
        <span style={styles.mono}>¥ {pool.jpyyReserve.toLocaleString()}</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.row}>
        <span style={styles.label}>YTT残高</span>
        <span style={styles.mono}>{pool.yttReserve.toFixed(2)} YTT</span>
      </div>
      <div style={styles.divider} />
      <div style={styles.row}>
        <span style={styles.label}>現在価格</span>
        <span style={{ ...styles.mono, color: 'var(--color-text-primary)', fontWeight: 600 }}>
          ¥ {pool.price.toFixed(2)}
        </span>
      </div>
      <div style={styles.divider} />
      <div style={styles.row}>
        <span style={styles.label}>k定数</span>
        <span style={styles.mono}>
          {(pool.jpyyReserve * pool.yttReserve).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    padding: 'var(--space-card)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' },
  healthy: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-buy)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' },
  divider: { borderTop: '1px solid var(--color-border)' },
  label: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-secondary)' },
  mono: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' },
};
