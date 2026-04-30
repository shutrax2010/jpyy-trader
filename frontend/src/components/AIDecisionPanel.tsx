import type { Decision, AgentMode } from '@/types';

interface Props {
  decision: Decision | null;
  mode: AgentMode;
  nextRunIn: number;
}

export default function AIDecisionPanel({ decision, mode, nextRunIn }: Props) {
  const action = decision?.action ?? 'HOLD';

  const actionColor =
    action === 'BUY' ? 'var(--color-buy)' :
    action === 'SELL' ? 'var(--color-sell)' :
    'var(--color-hold)';
  const actionBg =
    action === 'BUY' ? 'var(--color-buy-bg)' :
    action === 'SELL' ? 'var(--color-sell-bg)' :
    'var(--color-hold-bg)';

  const modeColor = mode === 'aggressive' ? 'var(--color-aggressive)' : 'var(--color-conservative)';
  const modeBg = mode === 'aggressive' ? 'var(--color-aggressive-bg)' : 'var(--color-conservative-bg)';

  const mm = Math.floor(nextRunIn / 60);
  const ss = String(nextRunIn % 60).padStart(2, '0');
  const countdown = mm > 0 ? `${mm}:${ss}` : `0:${ss}`;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>AI 判断</span>
        <span style={{ ...styles.modeBadge, background: modeBg, color: modeColor }}>
          {mode === 'aggressive' ? '積極モード' : '慎重モード'}
        </span>
      </div>

      {decision ? (
        <>
          <div style={{ ...styles.actionBadge, background: actionBg, color: actionColor }}>
            {action === 'BUY' ? 'BUY YTT' : action === 'SELL' ? 'SELL YTT' : 'HOLD'}
          </div>

          <div style={styles.confidence}>
            <span style={styles.confLabel}>確信度</span>
            <div style={styles.confBar}>
              <div style={{ ...styles.confFill, width: `${decision.confidence}%`, background: actionColor }} />
            </div>
            <span style={{ ...styles.confValue, color: actionColor }}>{decision.confidence}%</span>
          </div>

          <p style={styles.reason}>{decision.reason}</p>

          <div style={styles.footer}>
            <span style={styles.ts}>{new Date(decision.ts).toLocaleTimeString('ja-JP')}</span>
            <span style={styles.next}>次回実行 {countdown}</span>
          </div>
        </>
      ) : (
        <p style={styles.empty}>エージェント待機中…</p>
      )}
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
    gap: 12,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' },
  modeBadge: { fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 },
  actionBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600,
    padding: '10px 14px', borderRadius: 8, display: 'inline-block', width: 'fit-content',
  },
  confidence: { display: 'flex', alignItems: 'center', gap: 8 },
  confLabel: { fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' },
  confBar: { flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
  confValue: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  reason: { fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 },
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: 4 },
  ts: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-hint)' },
  next: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-hint)' },
  empty: { fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-hint)', textAlign: 'center', padding: '20px 0' },
};
