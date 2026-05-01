# AIエージェント 機能設計書

**対象システム**: JPYY TRADER — AIトークン売買デモアプリ  
**バージョン**: 1.3  
**作成日**: 2026-04-29  
**更新日**: 2026-05-01

---

## 変更履歴

| Ver | 日付 | 変更内容 |
|-----|------|---------|
| 1.0 | 2026-04-29 | 初版 |
| 1.1 | 2026-04-29 | WebSocket廃止→ポーリング対応 |
| 1.2 | 2026-04-30 | エージェントウォレットをMetaMask接続方式に変更、ダミーClaudeClient追加 |
| 1.3 | 2026-05-01 | エージェントウォレット方式をOption A（管理画面インメモリ秘密鍵設定）に変更。バックエンド自律署名。Approve自動化。 |

---

## 1. AIエージェントの概要

AIエージェントは Claude API を呼び出し、AMMプールの状態を分析して  
`BUY（YTT購入）` / `SELL（YTT売却）` / `HOLD（様子見）` を自律的に判断し、  
Polygon Amoy Testnet 上のスマートコントラクトにトランザクションを送信する。

### 動作サイクル

```
定期実行ループ（30〜300秒間隔、ユーザー設定）

  1. プール状態を取得（ContractClient → AppState）
  2. 価格履歴を計算（MarketAnalyzer）
  3. Claude API へ分析を依頼（ClaudeClient）
  4. レスポンス（BUY/SELL/HOLD）をパース
  5. BUY/SELL の場合はトランザクションを送信（TradeExecutor）
  6. 結果を AppState に保存（フロントはポーリングで取得）
  7. 待機 → 次のサイクルへ
```

---

## 2. 必要な準備

### 2.1 環境変数

| 変数 | 説明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API キー（未設定ならルールベースのダミー動作） |
| `RPC_URL` | Polygon Amoy RPC |
| `JPYY_ADDRESS` / `YTT_ADDRESS` / `AMM_ADDRESS` | デプロイ済みコントラクト |
| `DEFAULT_INTERVAL` / `DEFAULT_AMOUNT` / `DEFAULT_MODE` | エージェントデフォルト設定 |

> エージェントウォレットの秘密鍵は `POST /admin/agent-key` で管理画面から設定する（Option A）。`.env` には書かない。

### 2.2 必要なトークン残高（エージェントウォレット）

| トークン | 用途 | 最低推奨残高 |
|---------|------|------------|
| POL | ガス代 | 0.5 POL 以上 |
| JPYY | BUY時の支払い | 取引量 × 想定実行回数分 |
| YTT | SELL時の支払い | 想定SELL量分 |

### 2.3 コントラクト承認（Approve）

秘密鍵設定時（`POST /admin/agent-key`）にバックエンドが自動実行する。手動操作は不要。

```typescript
// ContractClient.setAgentSigner() 内で自動実行
// allowance が不足している場合のみ MaxUint256 で approve
await _ensureAgentApproval();  // JPYY と YTT の両方をチェック
```

スワップ直前にも再チェックするため、二重に安全。

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
{"action":"BUY"|"SELL"|"HOLD","reason":"判断理由（日本語、50文字以内）","confidence":0〜100}
```

### 3.2 モード別追加指示

#### 積極モード（aggressive）
- 価格変化率が **±3%** を超えた場合は積極的に売買
- HOLDは横ばい（±1%未満）の場合のみ
- 迷った場合はBUYまたはSELLを選択

#### 慎重モード（conservative）
- 価格変化率が **±8%** を超え、かつ明確なトレンドがある場合のみ売買
- 不確実な状況ではHOLDを優先
- 確信度が70%未満の場合はHOLD

#### ランダムモード（random）
- 価格分析を行わず、BUY/SELL を 50/50 でランダム選択
- JPYY残高不足時はSELL、YTT残高不足時はBUY、両方不足時はHOLD
- デモ・動作確認用

### 3.3 ユーザープロンプトに含まれる情報

毎回のサイクルで以下を含むプロンプトをバックエンドが生成する：

- AMMプール状態（JPYY残高・YTT残高・現在価格）
- 直近10件の価格履歴（古い順）
- 前回比変化率・直近平均比変化率・価格トレンド（上昇/下落/横ばい）
- エージェントの保有残高（JPYY・YTT）
- 設定取引量
- 取引可否条件（残高不足でBUY/SELL不可の場合に明示）

### 3.4 レスポンス例

```json
{ "action": "BUY",  "reason": "価格が直近平均比-5.2%と割安。上昇反転の兆候あり。", "confidence": 78 }
{ "action": "HOLD", "reason": "変化率+2.1%は慎重モード閾値8%未満のため様子見。",  "confidence": 85 }
```

---

## 4. 実装設計

### 4.1 ディレクトリ構成

```
backend/src/
├── agent/
│   ├── AgentLoop.ts        # メインループ管理（start/stop/runOnce）
│   ├── MarketAnalyzer.ts   # AppStateから価格・変化率・トレンドを計算
│   ├── ClaudeClient.ts     # Claude API 呼び出し（またはダミー判断）
│   └── TradeExecutor.ts    # ContractClientを使ったスワップ実行
├── contracts/
│   ├── ContractClient.ts   # ethers.js ラッパー（admin/agentSigner管理）
│   ├── ChainSync.ts        # 15秒ごとにチェーンからAppStateを同期
│   └── abis/               # JPYY.json / YTT.json / AMM.json
├── routes/
│   ├── state.ts            # GET /api/state
│   ├── agent.ts            # POST /agent/start|stop, PATCH /agent/config
│   └── admin.ts            # POST /admin/agent-key, mint, liquidity, price-adjust 等
├── store/AppState.ts       # オンメモリ状態管理（DBなし）
├── config.ts               # 環境変数・ダミーモード判定
└── server.ts               # Fastify サーバー起動
```

### 4.2 AgentLoop（メインループ）

1サイクルの処理順序：
1. `ContractClient.addRandomDrift()` でダミー価格変動を生成（ダミーモードのみ）
2. `MarketAnalyzer.fetch()` で現在の市場状態を取得
3. `AppState.pushPrice()` で価格履歴に追記
4. `ClaudeClient.decide()` でBUY/SELL/HOLD判断を取得
5. `AppState.setLastDecision()` で判断を保存
6. BUY/SELL の場合は `TradeExecutor.execute()` を実行
7. `AppState.setBalances()` で残高を更新

ループの制御：`AppState.running` フラグで判断。`stop()` 呼び出し後に現在のサイクルが終わり次第終了。

### 4.3 MarketAnalyzer（市場分析）

AppStateのキャッシュから計算するため、非同期処理なし（同期）。

| 計算値 | 算出方法 |
|-------|---------|
| 現在価格 | `jpyyReserve / yttReserve` |
| 前回比変化率 | `(current - prev) / prev × 100` |
| 直近平均比変化率 | `(current - avg) / avg × 100`（直近10件平均） |
| トレンド | 前回比+1%超→「上昇」、-1%未満→「下落」、その他→「横ばい」 |

### 4.4 ClaudeClient（API呼び出しとダミー）

| モード | 動作 |
|-------|------|
| `random` | 残高チェックのみ行い、BUY/SELLをランダム選択 |
| API利用可能 | `claude-haiku-4-5-20251001` でJSON判断を取得 |
| API利用不可 | 以下のルールベースで判断 |

**ダミー判断のしきい値**:

| モード | BUY条件（直近平均比） | SELL条件 | 最低信頼度 |
|-------|---------------------|---------|----------|
| aggressive | -3% 以下 | +3% 以上 | 60% |
| conservative | -8% 以下 | +8% 以上 | 70% |

±1.5% のランダムノイズを加算してデモの動きを演出。

### 4.5 TradeExecutor（スワップ実行）

- `agentSigner` で `ContractClient.swapJpyyForYtt()` / `swapYttForJpyy()` を呼び出す
- スリッページ許容: 期待出力の **95%**
- ダミーモードまたは `agentSigner` 未設定時はオンメモリ擬似実行（チェーン送信なし）
- `amountOut` の計算: SELL時は `yttIn = amountJpyy / currentPrice`

---

## 5. 型定義

→ `shared/src/index.ts` を参照。フロントエンド・バックエンド共通。

主な型：`AgentMode`、`TradeAction`、`Decision`、`TxResult`、`AgentBalances`、`PoolState`、`AppState`

---

## 6. エラーハンドリング方針

| 状況 | 対応 |
|------|------|
| Claude API タイムアウト | フォールバックしてダミー判断を使用 |
| JSON パース失敗 | HOLD にフォールバック |
| トランザクション失敗 | リトライなし。`AppState.lastError` に記録してスキップ |
| ガス不足（POL残高不足） | TX失敗として記録 |
| JPYY残高不足（BUY時） | トレードをスキップして次のサイクルへ |
| YTT残高不足（SELL時） | トレードをスキップして次のサイクルへ |

---

## 7. セキュリティ考慮事項

- エージェント秘密鍵は `.env` に書かない（Option A: バックエンドメモリのみ）
- `POST /admin/agent-key` のログレベルは `warn` に設定（リクエストボディをログ出力しない）
- `approve` は `MaxUint256` で設定（デモ用途のため）
- Amoy Testnet のため実資産リスクはないが、本番ウォレットの秘密鍵は使用しない

---

## 8. 実装ロードマップ（完了済み）

| ステップ | 内容 | 状態 |
|---------|------|------|
| 1 | スマートコントラクト作成・デプロイ | ✅ |
| 2 | ContractClient（ethers.js ラッパー） | ✅ |
| 3 | MarketAnalyzer（価格取得・計算） | ✅ |
| 4 | ClaudeClient（API呼び出し・ダミー） | ✅ |
| 5 | TradeExecutor（スワップ実行） | ✅ |
| 6 | AgentLoop（定期実行ループ） | ✅ |
| 7 | GET /api/state（ポーリングエンドポイント） | ✅ |
| 8 | 管理API（agent-key / mint / setReserves） | ✅ |
| 9 | フロントエンド実装 | ✅ |

---

*最終更新: 2026-05-01（v1.3）*
