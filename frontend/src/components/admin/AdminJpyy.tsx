import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminJpyy() {
  const { state } = useTradingStore();
  const address = state?.agent.address ?? null;
  const admin = useAdmin();

  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState<string | null>(null);
  const [error, setError]     = useState('');

  async function handleMint() {
    if (!address) { setError('エージェントウォレットが未設定です'); return; }
    setLoading(true); setError(''); setTxHash(null);
    try {
      const res = await admin.mint(Number(amount), address) as { txHash?: string };
      setTxHash(res.txHash ?? null);
      setAmount('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '発行に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={styles.heading}>JPYY 管理</h1>
      <div style={styles.card}>
        <h2 style={styles.subheading}>JPYY 新規発行（mint）</h2>

        <div style={styles.recipient}>
          <span style={styles.recipientLabel}>発行先（エージェントウォレット）</span>
          {address
            ? <span style={styles.recipientAddress}>{address}</span>
            : <span style={styles.recipientEmpty}>エージェント未設定 — エージェント設定ページで秘密鍵を設定してください</span>
          }
        </div>

        <Field label="発行量">
          <div style={styles.inputWrap}>
            <span style={styles.prefix}>¥</span>
            <input
              style={styles.input} type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="50000"
            />
          </div>
        </Field>

        {error && <p style={styles.error}>{error}</p>}
        {txHash && (
          <div style={styles.txBox}>
            <span style={styles.txLabel}>✓ 発行完了</span>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              style={styles.txLink}
            >
              {txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
            </a>
          </div>
        )}

        <button
          style={{ ...styles.btn, opacity: loading || !address ? 0.6 : 1 }}
          onClick={handleMint}
          disabled={!amount || !address || loading}
        >
          {loading ? '発行中…' : '発行する（mint）'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 24 },
  card: { background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: 24, maxWidth: 480 },
  subheading: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 20 },
  recipient: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--admin-border)', borderRadius: 8 },
  recipientLabel: { fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--admin-text-secondary)' },
  recipientAddress: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-text-primary)', wordBreak: 'break-all' },
  recipientEmpty: { fontFamily: 'var(--font-sans)', fontSize: 12, color: '#F87171' },
  inputWrap: { display: 'flex', border: '1px solid var(--admin-border)', borderRadius: 6, overflow: 'hidden' },
  prefix: { padding: '9px 12px', background: 'rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--admin-text-secondary)', borderRight: '1px solid var(--admin-border)' },
  input: { flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--admin-text-primary)', width: '100%' },
  error: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#F87171', marginBottom: 12 },
  txBox: {
    display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12,
    padding: '10px 12px', background: 'rgba(74,222,128,0.06)',
    border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6,
  },
  txLabel: { fontFamily: 'var(--font-sans)', fontSize: 12, color: '#4ADE80' },
  txLink: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--admin-text-secondary)', textDecoration: 'none', wordBreak: 'break-all' as const,
  },
  btn: { width: '100%', padding: '11px 0', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
