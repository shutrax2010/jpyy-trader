import Link from 'next/link';
import type { AgentMode } from '@/types';

interface Props {
  running: boolean;
  mode: AgentMode;
  agentAddress: string;
}

export default function Header({ running, mode, agentAddress }: Props) {
  const shortAddr = agentAddress.slice(0, 6) + '…' + agentAddress.slice(-4);

  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        JPYY<span style={styles.dot}>●</span>TRADER
      </div>

      <div style={styles.center}>
        <span style={{ ...styles.statusDot, background: running ? '#1A9E6A' : '#B8B6A8' }} />
        <span style={styles.statusText}>{running ? 'RUNNING' : 'STOPPED'}</span>

        <span style={{
          ...styles.modeBadge,
          background: mode === 'aggressive' ? 'var(--color-aggressive-bg)' : 'var(--color-conservative-bg)',
          color: mode === 'aggressive' ? 'var(--color-aggressive)' : 'var(--color-conservative)',
        }}>
          {mode === 'aggressive' ? '積極モード' : '慎重モード'}
        </span>

        <span style={styles.network}>AMOY TESTNET</span>
      </div>

      <div style={styles.right}>
        <span style={styles.address}>{shortAddr}</span>
        <Link href="/admin" style={styles.adminLink}>管理 →</Link>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 56,
    background: 'var(--color-bg-card)',
    borderBottom: '1px solid var(--color-border)',
  },
  logo: {
    fontFamily: 'var(--font-sans)',
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.3px',
  },
  dot: { color: 'var(--color-yellow)', margin: '0 1px' },
  center: { display: 'flex', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  statusText: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
    color: 'var(--color-text-secondary)', letterSpacing: '0.05em',
  },
  modeBadge: {
    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
    padding: '3px 8px', borderRadius: 4,
  },
  network: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    background: 'var(--color-bg-accent)', color: 'var(--color-yellow-dark)',
    padding: '3px 8px', borderRadius: 4,
  },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  address: {
    fontFamily: 'var(--font-mono)', fontSize: 12,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-accent)',
    padding: '3px 8px', borderRadius: 4,
  },
  adminLink: {
    fontFamily: 'var(--font-sans)', fontSize: 13,
    color: 'var(--color-text-secondary)', textDecoration: 'none',
  },
};
