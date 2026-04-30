import Link from 'next/link';

interface Props {
  loading: boolean;
  error: string | null;
  onConnect: () => void;
}

export default function WalletConnectionScreen({ loading, error, onConnect }: Props) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* ロゴ */}
        <div style={styles.logo}>
          JPYY<span style={styles.dot}>●</span>TRADER
        </div>
        <div style={styles.network}>AMOY TESTNET</div>

        <p style={styles.description}>
          接続したウォレットが AIエージェントとして<br />
          JPYY / YTT の売買を行います
        </p>

        <div style={styles.divider} />

        {/* エージェントウォレット接続 */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>エージェントウォレットを接続してください</p>
          <button
            style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
            onClick={onConnect}
            disabled={loading}
          >
            <MetaMaskIcon />
            {loading ? '接続中…' : 'MetaMask で接続'}
          </button>
          {error && <p style={styles.error}>{error}</p>}
        </div>

        <div style={styles.requirements}>
          <p style={styles.req}>・Polygon Amoy Testnet への切り替えが必要です</p>
          <p style={styles.req}>・JPYY 残高が必要です（管理者から配布）</p>
        </div>

        <div style={styles.divider} />

        <Link href="/admin" style={styles.adminLink}>管理ダッシュボードへ →</Link>
      </div>
    </div>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
      <path d="M36.3 3L22.2 13.3l2.6-6.1L36.3 3z" fill="#E2761B" />
      <path d="M3.7 3l14 10.4-2.5-6.2L3.7 3z" fill="#E4761B" />
      <path d="M31.2 27.5l-3.7 5.7 7.9 2.2 2.3-7.7-6.5-.2z" fill="#E4761B" />
      <path d="M2.3 27.7l2.2 7.7 7.9-2.2-3.7-5.7-6.4.2z" fill="#E4761B" />
      <path d="M12 17.6l-2.2 3.3 7.8.4-.3-8.4L12 17.6z" fill="#E4761B" />
      <path d="M28 17.6l-5.4-4.8-.2 8.4 7.8-.4L28 17.6z" fill="#E4761B" />
      <path d="M12.4 33.2l4.7-2.3-4-3.1-.7 5.4z" fill="#E4761B" />
      <path d="M22.9 30.9l4.7 2.3-.8-5.4-4 3.1z" fill="#E4761B" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg-page)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(26,26,20,0.08)',
    padding: '40px 48px',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
  },
  logo: {
    fontFamily: 'var(--font-sans)',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.5px',
    marginBottom: 8,
  },
  dot: {
    color: 'var(--color-yellow)',
    margin: '0 2px',
  },
  network: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    background: 'var(--color-bg-accent)',
    color: 'var(--color-yellow-dark)',
    padding: '3px 10px',
    borderRadius: 4,
    marginBottom: 20,
  },
  description: {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  divider: {
    width: '100%',
    borderTop: '1px solid var(--color-border)',
    marginBottom: 24,
  },
  section: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.04em',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 0',
    background: 'var(--color-yellow)',
    color: 'var(--color-text-primary)',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.15s',
  },
  error: {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    color: 'var(--color-sell)',
    textAlign: 'center',
  },
  requirements: {
    width: '100%',
    marginBottom: 20,
  },
  req: {
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    color: 'var(--color-text-hint)',
    lineHeight: 1.9,
  },
  adminLink: {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    color: 'var(--color-text-hint)',
    textDecoration: 'none',
  },
};
