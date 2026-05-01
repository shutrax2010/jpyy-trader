import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { useAdmin } from '@/hooks/useAdmin';

type Direction = 'up' | 'down' | 'bigUp' | 'bigDown';

const ADJUST_BUTTONS: { direction: Direction; label: string; sub: string; color: string }[] = [
  { direction: 'bigUp',   label: '大きく上昇', sub: '+20%', color: '#16A34A' },
  { direction: 'up',      label: '上昇',       sub: '+5%',  color: '#4ADE80' },
  { direction: 'down',    label: '下落',       sub: '-5%',  color: '#F87171' },
  { direction: 'bigDown', label: '大きく下落', sub: '-20%', color: '#DC2626' },
];

export default function AdminYttPrice() {
  const pool = useTradingStore((s) => s.state?.pool);
  const admin = useAdmin();

  const [adjustBusy, setAdjustBusy]   = useState(false);
  const [adjustStatus, setAdjustStatus] = useState('');
  const [adjustError, setAdjustError]   = useState('');

  const [targetPrice, setTargetPrice] = useState('');
  const [yttReserve, setYttReserve]   = useState('100');
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [error, setError]             = useState('');

  async function handleAdjust(direction: Direction) {
    setAdjustBusy(true); setAdjustError(''); setAdjustStatus('');
    try {
      await admin.adjustPrice(direction);
      const label = ADJUST_BUTTONS.find(b => b.direction === direction)!.label;
      setAdjustStatus(`✓ 価格を${label}させました`);
    } catch (e) {
      setAdjustError(e instanceof Error ? e.message : '価格操作に失敗しました');
    } finally {
      setAdjustBusy(false);
    }
  }

  const newJpyy = targetPrice && yttReserve
    ? (Number(targetPrice) * Number(yttReserve)).toLocaleString()
    : null;

  async function handleSet() {
    setLoading(true); setError(''); setStatus('');
    try {
      await admin.setPrice(Number(targetPrice), Number(yttReserve));
      setStatus(`✓ 価格を ¥${Number(targetPrice).toFixed(2)} に設定しました`);
      setTargetPrice('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '価格設定に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={styles.heading}>YTT 価格設定</h1>

      {pool && (
        <div style={styles.current}>
          現在: <b>¥{pool.price.toFixed(2)}</b>（JPYY={pool.jpyyReserve.toLocaleString()} / YTT={pool.yttReserve}）
        </div>
      )}

      {/* ワンクリック価格操作 */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <h2 style={styles.subheading}>ワンクリック価格操作</h2>
        <p style={styles.note}>k を維持したまま目標価格のリザーブを計算して設定します。</p>
        <div style={styles.btnRow}>
          {ADJUST_BUTTONS.map(({ direction, label, sub, color }) => (
            <button
              key={direction}
              style={{ ...styles.adjustBtn, background: color, opacity: adjustBusy ? 0.6 : 1 }}
              onClick={() => handleAdjust(direction)}
              disabled={adjustBusy}
            >
              <span style={styles.adjustLabel}>{label}</span>
              <span style={styles.adjustSub}>{sub}</span>
            </button>
          ))}
        </div>
        {adjustError  && <p style={styles.error}>{adjustError}</p>}
        {adjustStatus && <p style={styles.success}>{adjustStatus}</p>}
      </div>

      <div style={styles.card}>
        <h2 style={styles.subheading}>setReserves で価格を直接変更</h2>
        <p style={styles.note}>※ デモ専用機能。k定数が変化します。</p>

        <div style={styles.row}>
          <Field label="目標価格（¥/YTT）">
            <input style={styles.input} type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="150" />
          </Field>
          <Field label="YTT残高（固定）">
            <input style={styles.input} type="number" value={yttReserve} onChange={(e) => setYttReserve(e.target.value)} />
          </Field>
        </div>

        {newJpyy && (
          <p style={styles.preview}>設定後 JPYY残高: ¥{newJpyy}</p>
        )}

        {error  && <p style={styles.error}>{error}</p>}
        {status && <p style={styles.success}>{status}</p>}
        <button style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} onClick={handleSet} disabled={!targetPrice || loading}>
          {loading ? '設定中…' : '価格を設定'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btnRow: { display: 'flex', gap: 8, marginBottom: 12 },
  adjustBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.15s' },
  adjustLabel: { fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff' },
  adjustSub: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 24 },
  current: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 20 },
  card: { background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: 24, maxWidth: 480 },
  subheading: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 8 },
  note: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 16 },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  input: { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border)', borderRadius: 6, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--admin-text-primary)' },
  preview: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 12 },
  success: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#4ADE80', marginBottom: 12 },
  error: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#F87171', marginBottom: 12 },
  btn: { width: '100%', padding: '11px 0', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
