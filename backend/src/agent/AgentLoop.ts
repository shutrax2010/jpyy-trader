import { MarketAnalyzer } from './MarketAnalyzer';
import { AiClient }       from './AiClient';
import { TradeExecutor }  from './TradeExecutor';
import { ContractClient } from '../contracts/ContractClient';
import AppState from '../store/AppState';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

class AgentLoop {
  private lastRunAt = 0;
  private loopPromise: Promise<void> | null = null;

  // ── 制御 ─────────────────────────────────────────────────

  start(): void {
    if (AppState.running) return;
    AppState.setRunning(true);
    this.loopPromise = this._run();
  }

  stop(): void {
    AppState.setRunning(false);
  }

  getNextRunIn(): number {
    if (!AppState.running) return 0;
    const elapsed = Math.floor((Date.now() - this.lastRunAt) / 1000);
    return Math.max(0, AppState.intervalSec - elapsed);
  }

  // ── メインループ ──────────────────────────────────────────

  private async _run(): Promise<void> {
    while (AppState.running) {
      this.lastRunAt = Date.now();
      try {
        await this._runOnce();
      } catch (e) {
        AppState.setLastError(e instanceof Error ? e.message : String(e));
        console.error('[AgentLoop] error:', e);
      }
      if (!AppState.running) break;
      await sleep(AppState.intervalSec * 1000);
    }
  }

  private async _runOnce(): Promise<void> {
    // 1. 市場データ取得（ドリフト付き）
    const market = MarketAnalyzer.fetch();

    // 2. 価格履歴に追記
    AppState.pushPrice({
      price:     market.currentPrice,
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
    });

    // 3. Claude（ダミー）で判断
    const decision = await AiClient.decide(market, AppState.mode);
    AppState.setLastDecision(decision);
    console.log(`[Agent] ${decision.action} ${decision.confidence}% — ${decision.reason}`);

    // 4. BUY/SELL の場合はトレード実行
    if (decision.action !== 'HOLD') {
      try {
        const tx = await TradeExecutor.execute(
          decision.action,
          AppState.tradeAmount,
          market.currentPrice
        );
        AppState.pushTx(tx);
        console.log(`[Agent] TX confirmed: ${tx.hash.slice(0, 10)}...`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        AppState.pushTx({
          hash:    fakeTxHash(),
          action:  decision.action as 'BUY' | 'SELL',
          amountIn: AppState.tradeAmount,
          tokenIn: decision.action === 'BUY' ? 'JPYY' : 'YTT',
          status:  'failed',
          ts:      new Date().toISOString(),
        });
        AppState.setLastError(msg);
        console.error('[Agent] TX failed:', msg);
      }
    }

    // 5. 残高を最新化（ContractClientから再取得）
    AppState.setBalances(ContractClient.getAgentBalances());
    AppState.setLastError(null);
  }
}

function fakeTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export const agentLoop = new AgentLoop();
