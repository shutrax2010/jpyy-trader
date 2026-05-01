import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import type { AgentMode, Decision, TradeAction } from '@jpyy/shared';
import type { MarketState } from './MarketAnalyzer';

const THRESHOLDS: Record<AgentMode, { buy: number; sell: number; minConfidence: number }> = {
  aggressive:   { buy: -3,  sell: 3,  minConfidence: 60 },
  conservative: { buy: -8,  sell: 8,  minConfidence: 70 },
};

const BUY_REASONS  = [
  '価格が割安水準。反発上昇を期待。',
  '直近平均を大きく下回っており割安と判断。',
  '売られ過ぎ。押し目買いのタイミング。',
  'プール比率からYTTが割安と判断。',
];
const SELL_REASONS = [
  '価格が割高水準。利益確定を推奨。',
  '直近平均を上回る水準で高値圏と判断。',
  '買われ過ぎ。利確タイミング。',
  'YTTが相対的に割高になっており売却推奨。',
];
const HOLD_REASONS = [
  '変化率が閾値未満のため様子見。',
  '価格がレンジ内で推移中。次のサイクルを待機。',
  '方向性が不明瞭のためHOLDを選択。',
  'トレンドが確認できないため静観。',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isApiKeyConfigured(): boolean {
  return !!config.GEMINI_API_KEY;
}

export class AiClient {
  static async decide(state: MarketState, mode: AgentMode): Promise<Decision> {
    if (mode === 'random') return AiClient._decideRandom(state);
    if (isApiKeyConfigured()) {
      try {
        return await AiClient._decideWithApi(state, mode);
      } catch (e) {
        console.error('[AiClient] API error, falling back to dummy:', e instanceof Error ? e.message : e);
      }
    }
    return AiClient._decideDummy(state, mode);
  }

  private static async _decideWithApi(state: MarketState, mode: AgentMode): Promise<Decision> {
    const th = THRESHOLDS[mode];
    const absThreshold = Math.abs(th.buy);
    const modeLabel = mode === 'aggressive'
      ? `積極モード（閾値±${absThreshold}%）`
      : `慎重モード（閾値±${absThreshold}%）`;

    const prompt = `あなたはJPYY/YTTトークンペアの自動売買AIエージェントです。
市場データを分析してBUY/SELL/HOLDを判断してください。

現在価格: ${state.currentPrice.toFixed(4)} JPYY/YTT
前回比: ${state.priceChangePercent.toFixed(2)}%
直近平均比: ${state.priceChangeFromAvg.toFixed(2)}%
トレンド: ${state.trend}
プール: JPYY=${state.jpyyReserve.toFixed(0)}, YTT=${state.yttReserve.toFixed(4)}
残高: JPYY=${state.agentJpyy.toFixed(0)}, YTT=${state.agentYtt.toFixed(4)}
取引サイズ: ${state.tradeAmount} JPYY
モード: ${modeLabel}

条件: JPYY残高(${state.agentJpyy.toFixed(0)}) < 取引サイズ(${state.tradeAmount})ならBUY不可。YTT≈0ならSELL不可。
JSON形式のみで回答: {"action":"BUY","reason":"理由（50字以内）","confidence":75}`;

    const genai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error(`Unexpected response: ${text}`);
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      action:     parsed.action as TradeAction,
      reason:     String(parsed.reason).slice(0, 100),
      confidence: Math.min(95, Math.max(50, Number(parsed.confidence))),
      ts:         new Date().toISOString(),
    };
  }

  private static async _decideRandom(state: MarketState): Promise<Decision> {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

    const canBuy  = state.agentJpyy >= state.tradeAmount;
    const canSell = state.agentYtt  > 0.01;

    let action: TradeAction;
    let reason: string;

    if (!canBuy && !canSell) {
      action = 'HOLD';
      reason = 'JPYY・YTT残高ともに不足のためHOLD。';
    } else if (!canBuy) {
      action = 'SELL';
      reason = `ランダム売買（JPYY残高不足）。${pick(SELL_REASONS)}`;
    } else if (!canSell) {
      action = 'BUY';
      reason = `ランダム売買（YTT残高なし）。${pick(BUY_REASONS)}`;
    } else {
      action = Math.random() < 0.5 ? 'BUY' : 'SELL';
      reason = action === 'BUY'
        ? `ランダム売買（BUY）。${pick(BUY_REASONS)}`
        : `ランダム売買（SELL）。${pick(SELL_REASONS)}`;
    }

    return {
      action,
      reason,
      confidence: 50 + Math.floor(Math.random() * 30),
      ts: new Date().toISOString(),
    };
  }

  private static async _decideDummy(state: MarketState, mode: AgentMode): Promise<Decision> {
    await new Promise(r => setTimeout(r, 300 + Math.random() * 700));

    const th = THRESHOLDS[mode];
    const noise = (Math.random() - 0.5) * 1.5;
    const eff   = state.priceChangeFromAvg + noise;

    let action: TradeAction;
    let reason: string;
    let confidence: number;

    const canBuy  = state.agentJpyy >= state.tradeAmount;
    const canSell = state.agentYtt  > 0.01;

    if (eff < th.buy && canBuy) {
      action     = 'BUY';
      reason     = `価格が平均比${eff.toFixed(1)}%と割安。${pick(BUY_REASONS)}`;
      confidence = Math.min(95, th.minConfidence + Math.abs(eff) * 3);
    } else if (eff > th.sell && canSell) {
      action     = 'SELL';
      reason     = `価格が平均比+${eff.toFixed(1)}%と割高。${pick(SELL_REASONS)}`;
      confidence = Math.min(95, th.minConfidence + Math.abs(eff) * 3);
    } else {
      action     = 'HOLD';
      const why  = !canBuy  ? 'JPYY残高不足のため' :
                   !canSell ? 'YTT残高がないため'  : '';
      reason     = why ? `${why}HOLD。` : `変化率${eff.toFixed(1)}%（閾値±${Math.abs(th.buy)}%）。${pick(HOLD_REASONS)}`;
      confidence = 60 + Math.floor(Math.random() * 30);
    }

    return {
      action,
      reason,
      confidence: Math.round(confidence),
      ts: new Date().toISOString(),
    };
  }
}
