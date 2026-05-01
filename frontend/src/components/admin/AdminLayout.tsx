import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/admin', label: '概要' },
  { href: '/admin/jpyy', label: 'JPYY管理' },
  { href: '/admin/amm', label: 'AMM管理' },
  { href: '/admin/price', label: 'YTT価格設定' },
  { href: '/admin/log', label: '操作ログ' },
  { href: '/admin/agent', label: 'エージェント設定' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS;

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

        {/* 管理ウォレット情報（読み取り専用） */}
        {adminAddress && (
          <div style={styles.walletSection}>
            <div style={styles.walletLabel}>管理ウォレット</div>
            <div style={styles.walletAddr}>
              {adminAddress.slice(0, 6)}…{adminAddress.slice(-4)}
            </div>
          </div>
        )}

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
    padding: '14px 20px',
    borderTop: '1px solid var(--admin-border)',
    borderBottom: '1px solid var(--admin-border)',
  },
  walletLabel: {
    fontFamily: 'var(--font-sans)',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--admin-text-secondary)',
    letterSpacing: '0.06em',
    marginBottom: 6,
  },
  walletAddr: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--admin-text-primary)',
    background: 'rgba(255,255,255,0.06)',
    padding: '3px 8px',
    borderRadius: 4,
    display: 'inline-block',
  },
  sidebarFooter: { padding: '16px 20px' },
  backLink: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--admin-text-secondary)', textDecoration: 'none' },
  content: { flex: 1, padding: 32, overflowY: 'auto' },
};
