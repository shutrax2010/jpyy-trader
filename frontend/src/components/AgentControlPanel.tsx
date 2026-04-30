import { useState } from 'react';
import type { AgentMode, Decision } from '@/types';

interface Props {
  running: boolean;
  mode: AgentMode;
  interval: number;
  tradeAmount: number;
  jpyyBalance: number;
  lastDecision: Decision | null;
  onStart: () => void;
  onStop: () => void;
  onConfigChange: (mode: AgentMode, interval: number, tradeAmount: number) => void;
}

export default function AgentControlPanel({
  running, mode, interval, tradeAmount, jpyyBalance,
  lastDecision, onStart, onStop, onConfigChange,
}: Props) {
  const [localMode, setLocalMode] = useState<AgentMode>(mode);
  const [localInterval, setLocalInterval] = useState(interval);
  const [localAmount, setLocalAmount] = useState(String(tradeAmount));
  const [amountError, setAmountError] = useState('');

  const accentColor = localMode === 'aggressive' ? 'var(--color-aggressive)' : 'var(--color-conservative)';

  function validateAmount(value: string): string {
    const n = Number(value);
    if (isNaN(n) || n < 100) return '¥100 以上を入力してください';
    if (n > 50000) return '¥50,000 以下を入力してください';
    if (n > jpyyBalance) return `残高を超えています（残高: ¥${jpyyBalance.toLocaleString()}）`;
    return '';
  }

  function handleAmountChange(value: string) {
    setLocalAmount(value);
    setAmountError(validateAmount(value));
  }

  function handleToggle() {
    const err = validateAmount(localAmount);
    if (err) { setAmountError(err); return; }
    onConfigChange(localMode, localInterval, Number(localAmount));
    running ? onStop() : onStart();
  }

  const action = lastDecision?.action ?? 'HOLD';
  const actionColor =
    action === 'BUY' ? 'var(--color-buy)' :
    action === 'SELL' ? 'var(--color-sell)' :
    'var(--color-hold)';
  const actionBg =
    action === 'BUY' ? 'var(--color-buy-bg)' :
    action === 'SELL' ? 'var(--color-sell-bg)' :
    'var(--color-hold-bg)';

  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${accentColor}` }}>
      {lastDecision && (
        <div style={styles.decisionSection}>
          <span style={{ ...styles.actionBadge, background: actionBg, color: actionColor }}>
            {action === 'BUY' ? 'BUY YTT' : action === 'SELL' ? 'SELL YTT' : 'HOLD'}
          </span>
          <p style={styles.reason}>{lastDecision.reason}</p>
        </div>
      )}

      <div style={styles.field}>
        <label style={styles.label}>AIモード</label>
        <div style={styles.toggle}>
          {(['aggressive', 'conservative'] as AgentMode[]).map((m) => (
            <button
              key={m}
              style={{
                ...styles.toggleBtn,
                background: localMode === m ? accentColor : 'transparent',
                color: localMode === m ? '#fff' : 'var(--color-text-secondary)',
              }}
              onClick={() => setLocalMode(m)}
            >
              {m === 'aggressive' ? '積極モード' : '慎重モード'}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>実行間隔　<span style={styles.value}>{localInterval}秒</span></label>
        <input
          type="range" min={30} max={300} step={10}
          value={localInterval}
          onChange={(e) => setLocalInterval(Number(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.sliderLabels}>
          <span>30秒</span><span>300秒</span>
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>取引量</label>
        <div style={styles.amountInput}>
          <span style={styles.prefix}>¥</span>
          <input
            type="number" value={localAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            style={{ ...styles.input, borderColor: amountError ? 'var(--color-sell)' : 'var(--color-border)' }}
            placeholder="1000"
          />
        </div>
        {amountError && <p style={styles.error}>{amountError}</p>}
      </div>

      <button
        style={{
          ...styles.startStopBtn,
          background: running ? 'var(--color-sell-bg)' : accentColor,
          color: running ? 'var(--color-sell)' : '#fff',
          border: running ? `1px solid var(--color-sell)` : 'none',
        }}
        onClick={handleToggle}
      >
        {running ? '■ ストップ' : '▶ スタート'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--color-bg-accent)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    padding: 'var(--space-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  decisionSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  actionBadge: {
    display: 'inline-block',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 6,
    width: 'fit-content',
  },
  reason: {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' },
  value: { fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text-primary)' },
  toggle: { display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)' },
  toggleBtn: {
    flex: 1, padding: '7px 0',
    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
  },
  slider: { width: '100%', cursor: 'pointer', accentColor: 'var(--color-yellow)' },
  sliderLabels: {
    display: 'flex', justifyContent: 'space-between',
    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-hint)',
  },
  amountInput: { display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' },
  prefix: {
    padding: '8px 10px', background: 'var(--color-bg-page)',
    fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)',
    borderRight: '1px solid var(--color-border)',
  },
  input: {
    flex: 1, padding: '8px 10px', border: 'none', outline: 'none',
    fontFamily: 'var(--font-mono)', fontSize: 14, background: 'transparent',
  },
  error: { fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-sell)' },
  startStopBtn: {
    padding: '12px 0', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
    width: '100%', transition: 'opacity 0.15s',
  },
};
