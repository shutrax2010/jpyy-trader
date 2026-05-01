export type AgentMode = 'aggressive' | 'conservative' | 'random';
export type TradeAction = 'BUY' | 'SELL' | 'HOLD';

export interface PricePoint {
  price: number;
  timestamp: string;
}

export interface Decision {
  action: TradeAction;
  reason: string;
  confidence: number;
  ts: string;
}

export interface TxResult {
  hash: string;
  action: 'BUY' | 'SELL';
  amountIn: number;
  tokenIn: 'JPYY' | 'YTT';
  amountOut?: number;
  tokenOut?: 'JPYY' | 'YTT';
  status: 'confirmed' | 'failed';
  ts: string;
}

export interface AgentBalances {
  pol: number;
  jpyy: number;
  ytt: number;
}

export interface PoolState {
  jpyyReserve: number;
  yttReserve: number;
  price: number;
}

export interface AgentInfo {
  address: string;
  running: boolean;
  mode: AgentMode;
  interval: number;
  tradeAmount: number;
  nextRunIn: number;
}

export interface AppState {
  agent: AgentInfo;
  balances: AgentBalances;
  pool: PoolState;
  priceHistory: PricePoint[];
  lastDecision: Decision | null;
  txHistory: TxResult[];
  lastError: string | null;
}
