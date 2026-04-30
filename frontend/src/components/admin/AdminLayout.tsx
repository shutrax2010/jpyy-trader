import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useAdminWallet } from '@/hooks/useAdminWallet';

const NAV = [
  { href: '/admin', label: '概要' },
  { href: '/admin/jpyy', label: 'JPYY管理' },
  { href: '/admin/amm', label: 'AMM管理' },
  { href: '/admin/price', label: 'YTT価格設定' },
  { href: '/admin/log', label: '操作ログ' },
];

function short(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  const { user, connectUser, disconnectUser } = useWalletStore();
  const adminWallet = useAdminWallet();

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          JPYY<span style={styles.dot}>●</span>ADMIN
        </div>

        <nav style={styles.nav}>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                ...styles.navItem,
                background: pathname === href ? 'rgba(155,123,232,0.15)' : 'transparent',
                color: pathname === href ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                borderLeft: pathname === href ? '3px solid var(--admin-accent)' : '3px solid transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ウォレット情報 */}
        <div style={styles.walletSection}>
          <div style={styles.walletHeading}>WALLET</div>

          {/* 管理ウォレット（環境変数・読み取り専用） */}
          <div style={w.row}>
            <div style={w.label}>管理ウォレット</div>
            {adminWallet.address ? (
              <div style={w.addrRow}>
                <span style={w.addr}>{short(adminWallet.address)}</span>
                <span style={w.envBadge}>ENV</span>
              </div>
            ) : (
              <span style={w.unconfigured}>未設定</span>
            )}
          </div>

          {/* ユーザーウォレット（MetaMask接続） */}
          <div style={w.row}>
            <div style={w.label}>ユーザーウォレット</div>
            {user.address ? (
              <div style={w.addrRow}>
                <span style={w.addr}>{short(user.address)}</span>
                <button style={w.disconnectBtn} onClick={disconnectUser}>切断</button>
              </div>
            ) : (
              <div style={w.connectArea}>
                {user.error && <span style={w.error}>{user.error}</span>}
                <button
                  style={{ ...w.connectBtn, opacity: user.loading ? 0.6 : 1 }}
                  onClick={connectUser}
                  disabled={user.loading}
                >
                  {user.loading ? '接続中…' : 'MetaMask で接続'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.sidebarFooter}>
          <Link href="/" style={styles.backLink}>← トレード画面へ</Link>
        </div>
      </aside>

      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', minHeight: '100vh', background: 'var(--admin-bg-page)' },
  sidebar: {
    width: 220,
    flexShrink: 0,
    background: 'var(--admin-bg-sidebar)',
    borderRight: '1px solid var(--admin-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },
  logo: {
    fontFamily: 'var(--font-sans)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--admin-text-primary)',
    padding: '0 20px 24px',
    borderBottom: '1px solid var(--admin-border)',
    marginBottom: 16,
  },
  dot: { color: 'var(--admin-accent)', margin: '0 1px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' },
  navItem: {
    display: 'block',
    padding: '10px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    borderRadius: '0 6px 6px 0',
    transition: 'background 0.15s',
  },
  walletSection: {
    padding: '16px',
    borderTop: '1px solid var(--admin-border)',
    borderBottom: '1px solid var(--admin-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  walletHeading: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--admin-text-secondary)',
    letterSpacing: '0.08em',
  },
  sidebarFooter: { padding: '16px 20px' },
  backLink: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', textDecoration: 'none' },
  content: { flex: 1, padding: 32, overflowY: 'auto' },
};

const w: Record<string, React.CSSProperties> = {
  row: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: {
    fontFamily: 'var(--font-sans)',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--admin-text-secondary)',
    letterSpacing: '0.04em',
  },
  addrRow: { display: 'flex', alignItems: 'center', gap: 6 },
  addr: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--admin-text-primary)',
    background: 'rgba(255,255,255,0.06)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  envBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--admin-accent)',
    letterSpacing: '0.06em',
  },
  unconfigured: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#F87171',
  },
  connectArea: { display: 'flex', flexDirection: 'column', gap: 4 },
  connectBtn: {
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--admin-accent)',
    background: 'transparent',
    border: '1px solid var(--admin-accent)',
    borderRadius: 4,
    padding: '5px 8px',
    cursor: 'pointer',
    width: '100%',
  },
  disconnectBtn: {
    fontFamily: 'var(--font-sans)',
    fontSize: 10,
    color: 'var(--admin-text-secondary)',
    background: 'transparent',
    border: '1px solid var(--admin-border)',
    borderRadius: 4,
    padding: '2px 6px',
    cursor: 'pointer',
  },
  error: {
    fontFamily: 'var(--font-sans)',
    fontSize: 10,
    color: '#F87171',
  },
};
