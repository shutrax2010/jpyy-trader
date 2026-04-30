import { useState } from 'react';

const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? '';

export default function AdminJpyy() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<'agent' | 'custom'>('agent');
  const [customAddr, setCustomAddr] = useState('');
  const [status, setStatus] = useState('');

  function handleMint() {
    const to = recipient === 'agent' ? AGENT_ADDRESS : customAddr;
    setStatus(`✓ ${Number(amount).toLocaleString()} JPYY を ${to.slice(0, 6)}… に発行（モック）`);
    setAmount('');
  }

  return (
    <div>
      <h1 style={styles.heading}>JPYY 管理</h1>
      <div style={styles.card}>
        <h2 style={styles.subheading}>JPYY 新規発行（mint）</h2>

        <Field label="発行量">
          <div style={styles.inputWrap}>
            <span style={styles.prefix}>¥</span>
            <input style={styles.input} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
          </div>
        </Field>

        <Field label="発行先">
          <div style={styles.radioGroup}>
            {(['agent', 'custom'] as const).map((v) => (
              <label key={v} style={styles.radio}>
                <input type="radio" value={v} checked={recipient === v} onChange={() => setRecipient(v)} />
                {v === 'agent' ? `エージェントウォレット（${AGENT_ADDRESS.slice(0, 6)}…）` : 'カスタムアドレス'}
              </label>
            ))}
          </div>
          {recipient === 'custom' && (
            <input style={{ ...styles.input, marginTop: 8 }} value={customAddr} onChange={(e) => setCustomAddr(e.target.value)} placeholder="0x..." />
          )}
        </Field>

        {status && <p style={styles.success}>{status}</p>}

        <button style={styles.btn} onClick={handleMint} disabled={!amount}>発行する（mint）</button>
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
  inputWrap: { display: 'flex', border: '1px solid var(--admin-border)', borderRadius: 6, overflow: 'hidden' },
  prefix: { padding: '9px 12px', background: 'rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--admin-text-secondary)', borderRight: '1px solid var(--admin-border)' },
  input: { flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--admin-text-primary)' },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  radio: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--admin-text-primary)', cursor: 'pointer' },
  success: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#4ADE80', marginBottom: 12 },
  btn: { width: '100%', padding: '11px 0', background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
