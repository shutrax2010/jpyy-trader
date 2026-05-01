import type { AgentMode, AgentBalances, PoolState, PricePoint, Decision, TxResult } from '@jpyy/shared';
import { config } from '../config';

export interface AdminLog {
  id: string;
  action: string;
  params: Record<string, unknown>;
  status: 'success' | 'failed';
  error?: string;
  ts: string;
}

class AppState {
  // エージェント制御
  running        = false;
  mode: AgentMode = config.DEFAULT_MODE;
  intervalSec     = config.DEFAULT_INTERVAL;
  tradeAmount     = config.DEFAULT_AMOUNT;
  agentAddress: string | null = null;

  // ブロックチェーン状態
  balances: AgentBalances = { pol: 1.0, jpyy: 12400, ytt: 120.5 };
  pool: PoolState          = { jpyyReserve: 10000, yttReserve: 100, price: 100.0 };

  // 履歴
  priceHistory: PricePoint[]  = [];
  lastDecision: Decision | null = null;
  txHistory: TxResult[]        = [];
  lastError: string | null     = null;
  adminLogs: AdminLog[]        = [];

  setRunning(v: boolean)           { this.running = v; }
  setLastError(e: string | null)   { this.lastError = e; }
  setLastDecision(d: Decision)     { this.lastDecision = d; }
  setBalances(b: AgentBalances)    { this.balances = { ...b }; }
  setPool(p: PoolState)            { this.pool = { ...p }; }
  setAgentAddress(a: string|null)  { this.agentAddress = a; }

  pushPrice(p: PricePoint) {
    this.priceHistory.push(p);
    if (this.priceHistory.length > 100) this.priceHistory.shift();
  }

  pushTx(tx: TxResult) {
    this.txHistory.unshift(tx);
    if (this.txHistory.length > 50) this.txHistory.pop();
  }

  pushAdminLog(log: Omit<AdminLog, 'id' | 'ts'>) {
    this.adminLogs.unshift({
      ...log,
      id: Math.random().toString(36).slice(2),
      ts: new Date().toISOString(),
    });
    if (this.adminLogs.length > 100) this.adminLogs.pop();
  }
}

export default new AppState();
