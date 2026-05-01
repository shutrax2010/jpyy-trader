import Link from 'next/link';

export default function WalletConnectionScreen() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          JPYY<span style={styles.dot}>●</span>TRADER
        </div>
        <div style={styles.network}>AMOY TESTNET</div>

        <p style={styles.description}>
          エージェントウォレットが設定されていません。<br />
          管理ダッシュボードから秘密鍵を設定してください。
        </p>

        <Link href="/admin/agent" style={styles.adminLink}>
          管理ダッシュボードで設定する →
        </Link>
      </div>
    </div>
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
  dot: { color: 'var(--color-yellow)', margin: '0 2px' },
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
  adminLink: {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-yellow-dark)',
    textDecoration: 'none',
  },
};
