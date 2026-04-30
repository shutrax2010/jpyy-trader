# AIエージェント 機能設計書

**対象システム**: JPYY TRADER — AIトークン売買デモアプリ  
**バージョン**: 1.1  
**作成日**: 2026-04-29  
**更新日**: 2026-04-29（WebSocket廃止→ポーリング対応）

---

## 1. AIエージェントの概要

### 役割

AIエージェントは Claude API を呼び出し、AMMプールの状態を分析して  
`BUY（YTT購入）` / `SELL（YTT売却）` / `HOLD（様子見）` を自律的に判断し、  
Polygon Amoy Testnet 上のスマートコントラクトにトランザクションを送信する。

### 動作サイクル

```
┌─────────────────────────────────────────────────────┐
│  定期実行ループ（30〜300秒間隔、ユーザー設定）          │
│                                                     │
│  1. プール状態を取得（コントラクト読み取り）           │
│  2. 価格履歴を計算                                   │
│  3. Claude API へ分析を依頼（プロンプト送信）         │
│  4. レスポンス（BUY/SELL/HOLD）をパース              │
│  5. BUY/SELL の場合はトランザクションを送信           │
│  6. 結果を AppState に保存（フロントはポーリングで取得）│
│  7. 待機 → 次のサイクルへ                           │
└─────────────────────────────────────────────────────┘
```

---

## 2. 必要な準備

### 2.1 環境変数

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Polygon Amoy Testnet
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002

# エージェント用ウォレット（秘密鍵）
AGENT_PRIVATE_KEY=0x...         # トランザクション署名用
AGENT_ADDRESS=0x...             # 対応するアドレス

# コントラクトアドレス（デプロイ後に設定）
JPYY_ADDRESS=0x...              # JPYYトークン (ERC-20)
YTT_ADDRESS=0x...               # YTTトークン (ERC-20)
AMM_ADDRESS=0x...               # AMMコントラクト

# エージェント設定（デフォルト値）
DEFAULT_INTERVAL_SEC=60         # 実行間隔（秒）
DEFAULT_TRADE_AMOUNT=1000       # 取引量（JPYY単位）
DEFAULT_MODE=aggressive         # aggressive | conservative
```

### 2.2 必要なトークン残高（エージェントウォレット）

| トークン | 用途 | 最低推奨残高 |
|---------|------|------------|
| POL | ガス代 | 0.5 POL 以上（Amoy faucetから取得） |
| JPYY | BUY時の支払い | 取引量 × 想定実行回数分（管理画面から配布） |
| YTT | SELL時の支払い | 想定SELL量分 |

### 2.3 コントラクト承認（Approve）

エージェント起動前に、AMMコントラクトへの使用承認が必要。

```typescript
// 初回セットアップ時に1度だけ実行
await jpyyToken.approve(AMM_ADDRESS, MaxUint256);  // JPYY の無制限承認
await yttToken.approve(AMM_ADDRESS, MaxUint256);   // YTT の無制限承認
```

### 2.4 依存パッケージ

```json
{
  "dependencies": {
    "ethers": "^6.x",           // コントラクト操作
    "@anthropic-ai/sdk": "^0.x",// Claude API
    "dotenv": "^16.x"           // 環境変数
  }
}
```

---

## 3. プロンプト設計

### 3.1 システムプロンプト（共通部分）

```
あなたはJPYY/YTTトークンペアのAMMを分析するトレーディングAIです。

【役割】
AMMプールの状態と価格推移を分析し、次の売買行動を1つ選んでください。
- BUY  : JPYYを支払ってYTTを購入する（YTTが割安と判断した場合）
- SELL : YTTを支払ってJPYYを受け取る（YTTが割高と判断した場合）
- HOLD : 売買しない（状況が不明瞭または変動が小さい場合）

【トークン定義】
- JPYY: 1JPYY = 1円の基本通貨（ステーブル）
- YTT: 価格が変動する投資トークン

【AMMの仕組み】
価格はAMMプールの JPYY残高 / YTT残高 で決まります。
YTTを買うとYTT残高が減り価格が上がります。
YTTを売るとYTT残高が増え価格が下がります。

【出力形式】
必ず以下のJSON形式のみで返答してください。説明文は不要です。
{
  "action": "BUY" | "SELL" | "HOLD",
  "reason": "判断理由（日本語、50文字以内）",
  "confidence": 0〜100の整数
}
```

### 3.2 モード別追加指示

#### 積極モード（aggressive）

```
【取引方針: 積極モード】
- 価格変化率が ±3% を超えた場合は積極的に売買を実行してください。
- HOLDは価格がほぼ横ばい（±1%未満）の場合のみ選択してください。
- 短期的な価格変動も積極的に捉え、リターンの最大化を優先してください。
- 迷った場合はBUYまたはSELLを選んでください。
```

#### 慎重モード（conservative）

```
【取引方針: 慎重モード】
- 価格変化率が ±8% を超え、かつ明確なトレンドがある場合のみ売買してください。
- 不確実な状況や短期的な変動ではHOLDを優先してください。
- 資産の安全な保全を最優先とし、確信度が70%未満の場合はHOLDにしてください。
- リスクより安定性を重視してください。
```

### 3.3 ユーザープロンプト（毎回生成）

```typescript
function buildUserPrompt(state: MarketState): string {
  return `
【現在のプール状態】
- JPYY残高: ¥${state.jpyyReserve.toLocaleString()}
- YTT残高: ${state.yttReserve.toFixed(4)} YTT
- YTT現在価格: ¥${state.currentPrice.toFixed(2)} / YTT

【価格推移（直近10件、古い順）】
${state.priceHistory.map((p, i) =>
  `  ${i + 1}. ¥${p.price.toFixed(2)}  (${p.timestamp})`
).join('\n')}

【変化率】
- 前回比: ${state.priceChangePercent >= 0 ? '+' : ''}${state.priceChangePercent.toFixed(2)}%
- 10件平均比: ${state.priceChangeFromAvg >= 0 ? '+' : ''}${state.priceChangeFromAvg.toFixed(2)}%
- 価格トレンド: ${state.trend}  ← "上昇" | "下落" | "横ばい"

【エージェントの保有状況】
- JPYY残高: ¥${state.agentJpyy.toLocaleString()}
- YTT残高: ${state.agentYtt.toFixed(4)} YTT
- 設定取引量: ¥${state.tradeAmount.toLocaleString()}

売買判断をJSONで返してください。
  `.trim();
}
```

### 3.4 レスポンス例

```json
// BUYの場合
{
  "action": "BUY",
  "reason": "価格が直近平均比-5.2%と割安。上昇反転の兆候あり。",
  "confidence": 78
}

// HOLDの場合（慎重モード）
{
  "action": "HOLD",
  "reason": "変化率+2.1%は慎重モード閾値8%未満のため様子見。",
  "confidence": 85
}
```

---

## 4. 実装設計

### 4.1 ディレクトリ構成

```
backend/
├── agent/
│   ├── AgentLoop.ts        # メインループ管理
│   ├── MarketAnalyzer.ts   # プール状態の取得・計算
│   ├── ClaudeClient.ts     # Claude API 呼び出し
│   └── TradeExecutor.ts    # トランザクション送信
├── contracts/
│   ├── abis/
│   │   ├── JPYY.json
│   │   ├── YTT.json
│   │   └── AMM.json
│   └── ContractClient.ts   # ethers.js ラッパー
├── routes/
│   ├── agent.ts            # エージェント制御 API
│   ├── admin.ts            # 管理者 API
│   └── state.ts            # GET /api/state（ポーリング用）
├── store/
│   └── AppState.ts         # オンメモリ状態管理
├── config.ts               # 設定・環境変数
└── server.ts               # HTTP サーバー（Fastify）
```

### 4.2 AgentLoop.ts（メインループ）

```typescript
class AgentLoop {
  private running = false;
  private intervalSec: number;
  private mode: 'aggressive' | 'conservative';
  private tradeAmountJpyy: number;
  private lastRunAt: number = 0;

  async start() {
    this.running = true;
    AppState.setRunning(true);
    while (this.running) {
      try {
        await this.runOnce();
      } catch (e) {
        console.error('Agent loop error:', e);
        AppState.setLastError(e instanceof Error ? e.message : String(e));
      }
      this.lastRunAt = Date.now();
      await sleep(this.intervalSec * 1000);
    }
  }

  private async runOnce() {
    // 1. 市場データ取得
    const state = await MarketAnalyzer.fetch();
    AppState.pushPrice({ price: state.currentPrice, timestamp: new Date().toLocaleTimeString('ja-JP') });

    // 2. Claude API 呼び出し
    const decision = await ClaudeClient.decide(state, this.mode);
    AppState.setLastDecision(decision);

    // 3. トレード実行
    if (decision.action !== 'HOLD') {
      const tx = await TradeExecutor.execute(decision.action, this.tradeAmountJpyy);
      AppState.pushTx(tx);
    }

    // 4. 残高を更新
    const balances = await ContractClient.getAgentBalances();
    AppState.setBalances(balances);

    AppState.setLastError(null);
  }

  getNextRunIn(): number {
    if (!this.running) return 0;
    const elapsed = Math.floor((Date.now() - this.lastRunAt) / 1000);
    return Math.max(0, this.intervalSec - elapsed);
  }

  stop()  { this.running = false; AppState.setRunning(false); }
  setInterval(sec: number) { this.intervalSec = sec; }
  setMode(mode: 'aggressive' | 'conservative') { this.mode = mode; }
  setTradeAmount(jpyy: number) { this.tradeAmountJpyy = jpyy; }
}
```

### 4.3 MarketAnalyzer.ts（市場分析）

```typescript
class MarketAnalyzer {
  // 計算式: YTT価格 = JPYY残高 / YTT残高
  static calcPrice(jpyyReserve: bigint, yttReserve: bigint): number {
    return Number(jpyyReserve) / Number(yttReserve);
  }

  // 直近N件の価格履歴から変化率・トレンドを計算
  static analyze(history: PricePoint[]): MarketState {
    const current = history.at(-1)!.price;
    const prev    = history.at(-2)?.price ?? current;
    const avg     = history.reduce((s, p) => s + p.price, 0) / history.length;

    const changePercent    = ((current - prev) / prev) * 100;
    const changeFromAvg    = ((current - avg) / avg) * 100;

    const trend =
      changePercent > 1  ? '上昇' :
      changePercent < -1 ? '下落' : '横ばい';

    return { current, prev, avg, changePercent, changeFromAvg, trend };
  }
}
```

### 4.4 ClaudeClient.ts（API呼び出し）

```typescript
class ClaudeClient {
  private static client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  static async decide(state: MarketState, mode: AgentMode): Promise<Decision> {
    const systemPrompt = buildSystemPrompt(mode);  // 共通 + モード別指示
    const userPrompt   = buildUserPrompt(state);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseDecision(text);
  }

  private static parseDecision(text: string): Decision {
    try {
      // JSON部分を抽出してパース
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON not found');
      const parsed = JSON.parse(match[0]);

      const action = ['BUY', 'SELL', 'HOLD'].includes(parsed.action)
        ? parsed.action : 'HOLD';  // フォールバック

      return {
        action,
        reason:     parsed.reason     ?? '判断理由なし',
        confidence: parsed.confidence ?? 50,
        ts: new Date().toISOString(),
      };
    } catch {
      // パース失敗時は安全のためHOLD
      return { action: 'HOLD', reason: 'レスポンスのパースに失敗', confidence: 0, ts: new Date().toISOString() };
    }
  }
}
```

### 4.5 TradeExecutor.ts（トランザクション送信）

```typescript
class TradeExecutor {
  static async execute(action: 'BUY' | 'SELL', amountJpyy: number): Promise<TxResult> {
    const amm = ContractClient.getAmm();

    // スリッページ許容: 期待出力の95%（5%スリッページ）
    const slippageTolerance = 0.95;

    if (action === 'BUY') {
      // JPYY → YTT
      const jpyyIn      = parseUnits(amountJpyy.toString(), 18);
      const yttExpected = await amm.getAmountOut(jpyyIn, 'JPYY');
      const yttMin      = yttExpected * BigInt(Math.floor(slippageTolerance * 1000)) / 1000n;

      const tx = await amm.swapJpyyForYtt(jpyyIn, yttMin);
      const receipt = await tx.wait();
      return { hash: receipt.hash, action, amountIn: amountJpyy, tokenIn: 'JPYY', status: 'confirmed' };

    } else {
      // YTT → JPYY（YTT換算額 = amountJpyy ÷ 現在価格）
      const currentPrice = await MarketAnalyzer.getCurrentPrice();
      const yttIn        = parseUnits((amountJpyy / currentPrice).toFixed(6), 18);
      const jpyyExpected = await amm.getAmountOut(yttIn, 'YTT');
      const jpyyMin      = jpyyExpected * BigInt(Math.floor(slippageTolerance * 1000)) / 1000n;

      const tx = await amm.swapYttForJpyy(yttIn, jpyyMin);
      const receipt = await tx.wait();
      return { hash: receipt.hash, action, amountIn: amountJpyy, tokenIn: 'YTT', status: 'confirmed' };
    }
  }
}
```

---

## 5. 型定義

```typescript
type AgentMode = 'aggressive' | 'conservative';

interface PricePoint {
  price: number;       // ¥/YTT
  timestamp: string;   // HH:MM:SS
}

interface MarketState {
  // プール状態
  jpyyReserve:       number;
  yttReserve:        number;
  currentPrice:      number;
  // 価格分析
  priceHistory:      PricePoint[];
  priceChangePercent: number;   // 前回比 %
  priceChangeFromAvg: number;   // 10件平均比 %
  trend:             '上昇' | '下落' | '横ばい';
  // エージェント残高
  agentJpyy:         number;
  agentYtt:          number;
  tradeAmount:       number;
}

interface Decision {
  action:     'BUY' | 'SELL' | 'HOLD';
  reason:     string;
  confidence: number;   // 0〜100
  ts:         string;
}

interface TxResult {
  hash:      string;
  action:    'BUY' | 'SELL';
  amountIn:  number;
  tokenIn:   'JPYY' | 'YTT';
  amountOut?: number;
  tokenOut?:  'JPYY' | 'YTT';
  status:    'confirmed' | 'failed';
  ts:        string;
}
```

---

## 6. エラーハンドリング方針

| 状況 | 対応 |
|------|------|
| Claude API タイムアウト | 最大3回リトライ（1秒間隔）→ 失敗時は HOLD として記録 |
| JSON パース失敗 | HOLD にフォールバック、エラーログを記録 |
| トランザクション失敗 | リトライなし、`AppState.lastError` に記録してスキップ |
| ガス不足（POL残高不足） | エージェントを停止、`AppState.lastError` にアラートを記録 |
| JPYY残高不足（BUY時） | トレードをスキップして次のサイクルへ |
| YTT残高不足（SELL時） | トレードをスキップして次のサイクルへ |
| RPC接続エラー | 3回リトライ後に停止、`AppState.lastError` に記録 |

---

## 7. セキュリティ考慮事項

- **秘密鍵は必ず環境変数から読み込む**。コードにハードコードしない。
- エージェントウォレットの保有残高は**デモ用の最小限**にとどめる。
- `approve` は `MaxUint256` ではなく、**上限付き承認**（例: 100,000 JPYY）も検討。
- 管理画面の `/admin` はデモ環境ではアクセス制限なしでよいが、本番運用時は認証を追加。
- Amoy Testnet のため、実資産リスクはない。

---

## 8. 実装ロードマップ

| ステップ | 内容 | 優先度 |
|---------|------|--------|
| 1 | スマートコントラクト作成・デプロイ（JPYY, YTT, AMM） | ★★★ |
| 2 | ContractClient.ts（ethers.js でコントラクト読み書き） | ★★★ |
| 3 | MarketAnalyzer.ts（価格取得・計算） | ★★★ |
| 4 | ClaudeClient.ts（API呼び出し・パース） | ★★★ |
| 5 | TradeExecutor.ts（スワップ実行） | ★★★ |
| 6 | AgentLoop.ts（定期実行ループ） | ★★★ |
| 7 | `routes/state.ts`（GET /api/state ポーリングエンドポイント） | ★★☆ |
| 8 | 管理API（mint / distribute / setReserves） | ★★☆ |
| 9 | フロントエンド実装 | ★★☆ |
| 10 | 統合テスト・デモ動作確認 | ★☆☆ |

---

*最終更新: 2026-04-29（v1.1 WebSocket廃止）*
