import { ContractClient } from '../contracts/ContractClient';
import AppState from '../store/AppState';
import type { PricePoint } from '@jpyy/shared';

export interface MarketState {
  jpyyReserve:        number;
  yttReserve:         number;
  currentPrice:       number;
  priceHistory:       PricePoint[];
  priceChangePercent: number;   // 前回比 %
  priceChangeFromAvg: number;   // 直近平均比 %
  trend:              '上昇' | '下落' | '横ばい';
  agentJpyy:          number;
  agentYtt:           number;
  tradeAmount:        number;
}

export class MarketAnalyzer {
  // 1サイクルぶんの市場データを取得して返す
  static fetch(): MarketState {
    // 他のトレーダーのアクティビティをシミュレート
    ContractClient.addRandomDrift();

    const { jpyy, ytt } = ContractClient.getReserves();
    const currentPrice   = AppState.pool.price;
    const history        = AppState.priceHistory;

    const prev = history.length >= 2
      ? history[history.length - 2].price
      : currentPrice;

    const avg = history.length > 0
      ? history.slice(-10).reduce((s, p) => s + p.price, 0) / Math.min(10, history.length)
      : currentPrice;

    const priceChangePercent = prev !== 0 ? ((currentPrice - prev) / prev) * 100 : 0;
    const priceChangeFromAvg = avg  !== 0 ? ((currentPrice - avg)  / avg)  * 100 : 0;

    const trend: MarketState['trend'] =
      priceChangePercent >  1 ? '上昇' :
      priceChangePercent < -1 ? '下落' : '横ばい';

    return {
      jpyyReserve: jpyy,
      yttReserve:  ytt,
      currentPrice,
      priceHistory:       [...history],
      priceChangePercent,
      priceChangeFromAvg,
      trend,
      agentJpyy:   AppState.balances.jpyy,
      agentYtt:    AppState.balances.ytt,
      tradeAmount: AppState.tradeAmount,
    };
  }
}
