import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';

export default function AdminAmm() {
  const pool = useTradingStore((s) => s.state?.pool);
  const [jpyy, setJpyy] = useState('');
  const [ytt, setYtt] = useState('');
  const [status, setStatus] = useState('');

  function handleAdd() {
    setStatus(`✓ 流動性追加: JPYY ${Number(jpyy).toLocaleString()} / YTT ${ytt}（モック）`);
    setJpyy(''); setYtt('');
  }

  return (
    <div>
      <h1 style={styles.heading}>AMM 管理</h1>
      {pool && (
        <div style={styles.poolInfo}>
          <span style={styles.infoItem}>現在のJPYY残高: <b>¥{pool.jpyyReserve.toLocaleString()}</b></span>
          <span style={styles.infoItem}>現在のYTT残高: <b>{pool.yttReserve} YTT</b></span>
          <span style={styles.infoItem}>現在価格: <b>¥{pool.price.toFixed(2)}</b></span>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.subheading}>流動性追加</h2>
        <div style={styles.row}>
          <Field label="JPYY追加量">
            <input style={styles.input} type="number" value={jpyy} onChange={(e) => setJpyy(e.target.value)} placeholder="5000" />
          </Field>
          <Field label="YTT追加量">
            <input style={styles.input} type="number" value={ytt} onChange={(e) => setYtt(e.target.value)} placeholder="50" />
          </Field>
        </div>
        {status && <p style={styles.success}>{status}</p>}
        <button style={styles.btn} onClick={handleAdd} disabled={!jpyy || !ytt}>流動性を追加</button>
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
  poolInfo: { display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' },
  infoItem: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--admin-text-secondary)' },
  card: { background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: 24, maxWidth: 480 },
  subheading: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 20 },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  input: { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border)', borderRadius: 6, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--admin-text-primary)' },
  success: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#4ADE80', marginBottom: 12 },
  btn: { width: '100%', padding: '11px 0', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
