import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';

interface AdminLog {
  id: string;
  action: string;
  params: Record<string, unknown>;
  status: 'success' | 'failed';
  error?: string;
  ts: string;
}

function formatParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${typeof v === 'number' ? Number(v).toLocaleString() : String(v)}`)
    .join(' / ');
}

export default function AdminLog() {
  const admin = useAdmin();
  const [logs, setLogs]       = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function fetchLogs() {
    setLoading(true); setError('');
    try {
      const data = await admin.getLogs() as { logs: AdminLog[] };
      setLogs(data.logs.slice().reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 style={styles.heading}>操作ログ</h1>
        <button style={styles.refreshBtn} onClick={fetchLogs} disabled={loading}>
          {loading ? '読込中…' : '更新'}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.table}>
        <div style={styles.theadRow}>
          <span style={{ ...styles.cell, flex: 1.5 }}>日時</span>
          <span style={styles.cell}>アクション</span>
          <span style={{ ...styles.cell, flex: 2 }}>パラメータ</span>
          <span style={styles.cell}>ステータス</span>
        </div>
        {logs.length === 0 && !loading && (
          <div style={{ padding: '20px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
            ログがありません
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} style={styles.row}>
            <span style={{ ...styles.cell, flex: 1.5, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {new Date(log.ts).toLocaleString('ja-JP')}
            </span>
            <span style={{ ...styles.cell, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-accent)' }}>
              {log.action}
            </span>
            <span style={{ ...styles.cell, flex: 2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {formatParams(log.params)}
            </span>
            <span style={{ ...styles.cell, fontFamily: 'var(--font-sans)', fontSize: 12, color: log.status === 'success' ? '#4ADE80' : '#F87171' }}>
              {log.status === 'success' ? '✓' : `✗ ${log.error ?? ''}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', margin: 0 },
  refreshBtn: { padding: '6px 14px', background: 'transparent', border: '1px solid var(--admin-border)', borderRadius: 6, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', cursor: 'pointer' },
  error: { fontFamily: 'var(--font-sans)', fontSize: 13, color: '#F87171', marginBottom: 12 },
  table: { background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border)', borderRadius: 12, overflow: 'hidden' },
  theadRow: {
    display: 'flex', padding: '12px 20px',
    borderBottom: '1px solid var(--admin-border)',
    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
    color: 'var(--admin-text-secondary)', letterSpacing: '0.06em',
  },
  row: {
    display: 'flex', padding: '14px 20px',
    borderBottom: '1px solid var(--admin-border)',
    fontFamily: 'var(--font-sans)', fontSize: 13,
    color: 'var(--admin-text-primary)',
  },
  cell: { flex: 1 },
};
