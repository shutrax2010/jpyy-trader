import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PricePoint } from '@/types';

interface Props {
  priceHistory: PricePoint[];
  currentPrice: number;
}

export default function PriceChart({ priceHistory, currentPrice }: Props) {
  const min = Math.min(...priceHistory.map((p) => p.price));
  const max = Math.max(...priceHistory.map((p) => p.price));
  const pad = (max - min) * 0.15 || 5;

  const prev = priceHistory[priceHistory.length - 2]?.price ?? currentPrice;
  const change = ((currentPrice - prev) / prev) * 100;
  const changeStr = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <span style={styles.title}>YTT 価格チャート</span>
          <span style={styles.sub}>（¥建て）</span>
        </div>
        <div style={styles.priceBlock}>
          <span style={styles.price}>¥{currentPrice.toFixed(2)}</span>
          <span style={{ ...styles.change, color: change >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
            {changeStr}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={priceHistory} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-hint)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-hint)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `¥${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}
            formatter={(v: number) => [`¥${v.toFixed(2)}`, 'YTT価格']}
          />
          <Line
            type="monotone" dataKey="price"
            stroke="var(--color-yellow-dark)" strokeWidth={2}
            dot={false} activeDot={{ r: 4, fill: 'var(--color-yellow-dark)' }}
          />
        </LineChart>
      </ResponsiveContainer>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' },
  sub: { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 4 },
  priceBlock: { textAlign: 'right' },
  price: { fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block' },
  change: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 },
};
