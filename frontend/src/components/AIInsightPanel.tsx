import type { Decision } from '@/types';

interface Props {
  decision: Decision | null;
}

export default function AIInsightPanel({ decision }: Props) {
  if (!decision?.insight) return null;

  const accentColor =
    decision.action === 'BUY'  ? 'var(--color-buy)'  :
    decision.action === 'SELL' ? 'var(--color-sell)' :
    'var(--color-hold)';
  const accentBg =
    decision.action === 'BUY'  ? 'var(--color-buy-bg)'  :
    decision.action === 'SELL' ? 'var(--color-sell-bg)' :
    'var(--color-hold-bg)';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>AI インサイト</span>
        <span style={{ ...styles.badge, background: accentBg, color: accentColor }}>
          {decision.action}
        </span>
      </div>
      <p style={styles.text}>{decision.insight}</p>
      <span style={styles.ts}>{new Date(decision.ts).toLocaleTimeString('ja-JP')}</span>
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
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' },
  badge: { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 },
  text: {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.75,
    margin: 0,
  },
  ts: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-hint)' },
};
