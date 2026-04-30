import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';

export default function AdminYttPrice() {
  const pool = useTradingStore((s) => s.state?.pool);
  const [targetPrice, setTargetPrice] = useState('');
  const [yttReserve, setYttReserve] = useState('100');
  const [status, setStatus] = useState('');

  const newJpyy = targetPrice && yttReserve
    ? (Number(targetPrice) * Number(yttReserve)).toLocaleString()
    : null;

  function handleSet() {
    setStatus(`✓ 価格を ¥${Number(targetPrice).toFixed(2)} に設定（setReserves モック）`);
    setTargetPrice('');
  }

  return (
    <div>
      <h1 style={styles.heading}>YTT 価格設定</h1>

      {pool && (
        <div style={styles.current}>
          現在: <b>¥{pool.price.toFixed(2)}</b>（JPYY={pool.jpyyReserve.toLocaleString()} / YTT={pool.yttReserve}）
        </div>
      )}

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

        {status && <p style={styles.success}>{status}</p>}
        <button style={styles.btn} onClick={handleSet} disabled={!targetPrice}>価格を設定</button>
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
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 24 },
  current: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 20 },
  card: { background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: 24, maxWidth: 480 },
  subheading: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 8 },
  note: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 16 },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  input: { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border)', borderRadius: 6, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--admin-text-primary)' },
  preview: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 12 },
  success: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#4ADE80', marginBottom: 12 },
  btn: { width: '100%', padding: '11px 0', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
