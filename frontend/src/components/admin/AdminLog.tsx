const MOCK_LOGS = [
  { ts: new Date(Date.now() - 120_000).toISOString(), action: 'mint', detail: 'JPYY 50,000 → エージェント', by: '0xAdmin' },
  { ts: new Date(Date.now() - 3600_000).toISOString(), action: 'setReserves', detail: 'JPYY=12000 / YTT=100', by: '0xAdmin' },
  { ts: new Date(Date.now() - 7200_000).toISOString(), action: 'addLiquidity', detail: 'JPYY=5000 / YTT=50', by: '0xAdmin' },
];

export default function AdminLog() {
  return (
    <div>
      <h1 style={styles.heading}>操作ログ</h1>
      <div style={styles.table}>
        <div style={styles.theadRow}>
          <span style={{ ...styles.cell, flex: 1.5 }}>日時</span>
          <span style={styles.cell}>アクション</span>
          <span style={{ ...styles.cell, flex: 2 }}>詳細</span>
          <span style={styles.cell}>実行者</span>
        </div>
        {MOCK_LOGS.map((log, i) => (
          <div key={i} style={styles.row}>
            <span style={{ ...styles.cell, flex: 1.5, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {new Date(log.ts).toLocaleString('ja-JP')}
            </span>
            <span style={{ ...styles.cell, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-accent)' }}>
              {log.action}
            </span>
            <span style={{ ...styles.cell, flex: 2 }}>{log.detail}</span>
            <span style={{ ...styles.cell, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
              {log.by}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 24 },
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
