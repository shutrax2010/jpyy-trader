import type { NextApiRequest, NextApiResponse } from 'next';
import type { AppState, PricePoint, TxResult } from '@/types';

// 起動時に価格履歴を生成（サーバー再起動まで固定）
const BASE_PRICE = 108;
const priceHistory: PricePoint[] = Array.from({ length: 20 }, (_, i) => {
  const noise = (Math.random() - 0.5) * 12;
  const price = parseFloat((BASE_PRICE + noise).toFixed(2));
  const d = new Date(Date.now() - (20 - i) * 60_000);
  const timestamp = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { price, timestamp };
});

const txHistory: TxResult[] = [
  {
    hash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    action: 'BUY',
    amountIn: 1000,
    tokenIn: 'JPYY',
    amountOut: 9.18,
    tokenOut: 'YTT',
    status: 'confirmed',
    ts: new Date(Date.now() - 65_000).toISOString(),
  },
  {
    hash: '0x111222333444555666777888999aaabbbcccdddeeefffaaabbbcccdddeeefffaa',
    action: 'SELL',
    amountIn: 5.0,
    tokenIn: 'YTT',
    amountOut: 543,
    tokenOut: 'JPYY',
    status: 'confirmed',
    ts: new Date(Date.now() - 185_000).toISOString(),
  },
  {
    hash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    action: 'BUY',
    amountIn: 1000,
    tokenIn: 'JPYY',
    amountOut: 9.32,
    tokenOut: 'YTT',
    status: 'confirmed',
    ts: new Date(Date.now() - 305_000).toISOString(),
  },
];

let startedAt = Date.now();
let running = true;
const INTERVAL = 60;

export default function handler(_req: NextApiRequest, res: NextApiResponse<AppState>) {
  const currentPrice = priceHistory[priceHistory.length - 1].price;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000) % INTERVAL;
  const nextRunIn = INTERVAL - elapsed;

  const data: AppState = {
    agent: {
      address: process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? '0x1A2B3C4D5E6F7890aBcDeF1234567890aBcDeF12',
      running,
      mode: 'aggressive',
      interval: INTERVAL,
      tradeAmount: 1000,
      nextRunIn,
    },
    balances: {
      pol: 0.9842,
      jpyy: 12400,
      ytt: 120.5,
    },
    pool: {
      jpyyReserve: 10000,
      yttReserve: 100,
      price: currentPrice,
    },
    priceHistory: priceHistory.slice(-20),
    lastDecision: {
      action: 'BUY',
      reason: '価格が直近平均比-4.8%と割安。上昇反転の兆候あり。',
      confidence: 76,
      ts: new Date(Date.now() - 65_000).toISOString(),
    },
    txHistory,
    lastError: null,
  };

  res.status(200).json(data);
}
