import type { TxResult } from '@/types';

interface Props {
  txHistory: TxResult[];
}

export default function TxHistoryTable({ txHistory }: Props) {
  const explorerBase = 'https://amoy.polygonscan.com/tx/';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>トランザクション履歴</span>
        <span style={styles.count}>{txHistory.length}件</span>
      </div>

      {txHistory.length === 0 ? (
        <p style={styles.empty}>まだ取引はありません</p>
      ) : (
        <div style={styles.list}>
          {txHistory.map((tx) => {
            const isBuy = tx.action === 'BUY';
            const direction = isBuy ? 'JPYY → YTT' : 'YTT → JPYY';
            const color = isBuy ? 'var(--color-buy)' : 'var(--color-sell)';
            const bg = isBuy ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)';
            const shortHash = `${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}`;

            return (
              <div key={tx.hash} style={styles.row}>
                <div style={styles.rowLeft}>
                  <span style={{ ...styles.badge, background: bg, color }}>{tx.action}</span>
                  <div>
                    <div style={styles.direction}>{direction}</div>
                    <div style={styles.amount}>
                      ¥{tx.amountIn.toLocaleString()}
                      {tx.amountOut != null && (
                        <span style={styles.amountSub}>
                          → {tx.amountOut.toFixed(4)} {tx.tokenOut}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={styles.rowRight}>
                  <a
                    href={`${explorerBase}${tx.hash}`}
                    target="_blank" rel="noreferrer"
                    style={styles.hash}
                  >
                    {shortHash} ↗
                  </a>
                  <div style={styles.time}>
                    {new Date(tx.ts).toLocaleTimeString('ja-JP')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' },
  count: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-hint)' },
  empty: { fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-hint)', textAlign: 'center', padding: '20px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: 0 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--color-border)',
  },
  rowLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  badge: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap',
  },
  direction: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500 },
  amount: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 },
  amountSub: { color: 'var(--color-text-hint)', marginLeft: 4 },
  rowRight: { textAlign: 'right' },
  hash: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-yellow-dark)', textDecoration: 'none', display: 'block' },
  time: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-hint)', marginTop: 2 },
};
