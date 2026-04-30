import { useAdminWallet } from '@/hooks/useAdminWallet';
import type { ReactNode } from 'react';

export default function AdminWalletGuard({ children }: { children: ReactNode }) {
  const { isConfigured } = useAdminWallet();

  if (!isConfigured) {
    return (
      <div style={styles.wrap}>
        <p style={styles.title}>管理ウォレットが設定されていません</p>
        <p style={styles.hint}>
          <code style={styles.code}>.env.local</code> に{' '}
          <code style={styles.code}>NEXT_PUBLIC_ADMIN_ADDRESS</code> を設定してください
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    gap: 12,
    textAlign: 'center',
    fontFamily: 'var(--font-sans)',
  },
  title: { fontSize: 14, color: '#F87171', margin: 0 },
  hint: { fontSize: 13, color: 'var(--admin-text-secondary)', margin: 0 },
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    background: 'rgba(255,255,255,0.08)',
    padding: '1px 6px',
    borderRadius: 3,
  },
};
