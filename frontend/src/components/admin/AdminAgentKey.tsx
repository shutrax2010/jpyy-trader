import { useState } from 'react';
import { ethers } from 'ethers';
import { useTradingStore } from '@/store/tradingStore';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminAgentKey() {
  const { state } = useTradingStore();
  const admin = useAdmin();
  const currentAddress = state?.agent.address ?? null;

  const [privateKey, setPrivateKey] = useState('');
  const [preview, setPreview]       = useState('');
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState('');
  const [error, setError]           = useState('');

  function handleKeyChange(val: string) {
    setPrivateKey(val);
    setStatus(''); setError('');
    if (!val) { setPreview(''); setPreviewError(''); return; }
    try {
      const wallet = new ethers.Wallet(val);
      setPreview(wallet.address);
      setPreviewError('');
    } catch {
      setPreview('');
      setPreviewError('無効な秘密鍵です');
    }
  }

  async function handleSet() {
    setLoading(true); setError(''); setStatus('');
    try {
      const res = await admin.setAgentKey(privateKey) as { address: string };
      setStatus(`✓ エージェントアドレス: ${res.address}`);
      setPrivateKey('');
      setPreview('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '設定に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true); setError(''); setStatus('');
    try {
      await admin.clearAgentKey();
      setStatus('✓ エージェントキーをクリアしました');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'クリアに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={styles.heading}>エージェント設定</h1>
      <div style={styles.card}>
        <h2 style={styles.subheading}>エージェントウォレット</h2>

        {/* 現在の設定状態 */}
        <div style={styles.statusBox}>
          <span style={styles.statusLabel}>現在の設定</span>
          {currentAddress
            ? <span style={styles.addressText}>{currentAddress}</span>
            : <span style={styles.notSet}>未設定</span>
          }
        </div>

        {/* 秘密鍵入力 */}
        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>秘密鍵（0x...）</label>
          <input
            style={styles.input}
            type="password"
            value={privateKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="0x..."
            autoComplete="off"
          />
          {preview && (
            <div style={styles.preview}>
              アドレス確認: <span style={styles.previewAddr}>{preview}</span>
            </div>
          )}
          {previewError && <div style={styles.previewError}>{previewError}</div>}
        </div>

        {error  && <p style={styles.error}>{error}</p>}
        {status && <p style={styles.success}>{status}</p>}

        <div style={styles.btnRow}>
          <button
            style={{ ...styles.btnPrimary, opacity: loading || !preview ? 0.6 : 1 }}
            onClick={handleSet}
            disabled={!preview || loading}
          >
            {loading ? '設定中…' : '設定する'}
          </button>
          {currentAddress && (
            <button
              style={{ ...styles.btnDanger, opacity: loading ? 0.6 : 1 }}
              onClick={handleClear}
              disabled={loading}
            >
              クリア
            </button>
          )}
        </div>

        <p style={styles.note}>
          ※ 秘密鍵はサーバーのメモリにのみ保持され、ディスクには保存されません。<br />
          　サーバー再起動時にクリアされます。
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 24 },
  card: { background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: 24, maxWidth: 520 },
  subheading: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 20 },
  statusBox: {
    display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20,
    padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--admin-border)', borderRadius: 8,
  },
  statusLabel: { fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--admin-text-secondary)' },
  addressText: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-text-primary)', wordBreak: 'break-all' },
  notSet: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)' },
  label: { display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6 },
  input: {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border)',
    borderRadius: 6, outline: 'none', fontFamily: 'var(--font-mono)',
    fontSize: 13, color: 'var(--admin-text-primary)',
  },
  preview: {
    marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 11,
    color: 'var(--admin-text-secondary)',
  },
  previewAddr: { fontFamily: 'var(--font-mono)', color: '#4ADE80' },
  previewError: { marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#F87171' },
  success: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#4ADE80', marginBottom: 12 },
  error: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#F87171', marginBottom: 12 },
  btnRow: { display: 'flex', gap: 10, marginBottom: 16 },
  btnPrimary: {
    flex: 1, padding: '11px 0', background: 'var(--admin-accent)', color: '#fff',
    border: 'none', borderRadius: 8, fontFamily: 'var(--font-sans)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnDanger: {
    padding: '11px 20px', background: 'rgba(248,113,113,0.12)', color: '#F87171',
    border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8,
    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  note: {
    fontFamily: 'var(--font-sans)', fontSize: 11,
    color: 'var(--admin-text-secondary)', lineHeight: 1.8,
    borderTop: '1px solid var(--admin-border)', paddingTop: 14, marginBottom: 0,
  },
};
