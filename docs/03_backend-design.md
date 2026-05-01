# バックエンド設計書

**対象システム**: JPYY TRADER
**バージョン**: 2.0
**作成日**: 2026-04-29
**更新日**: 2026-05-01

---

## 変更履歴

| Ver | 日付 | 変更内容 |
|-----|------|---------|
| 1.0 | 2026-04-29 | 初版 |
| 1.1 | 2026-04-29 | ウォレット2本化に合わせて更新 |
| 1.2 | 2026-04-29 | WebSocket廃止→ポーリング方式に変更 |
| 1.3 | 2026-04-30 | ダミーモード追加、エージェントウォレット登録ルート追加 |
| 2.0 | 2026-05-01 | Option A（インメモリ秘密鍵）に変更。`/admin/agent-key` 追加。バックエンドが自律署名。 |

---

## 1. ウォレット構成（Option A: インメモリ秘密鍵方式）

| キー | 用途 | 保管場所 |
|-----|------|---------|
| `ADMIN_PRIVATE_KEY` | mint・流動性追加・価格設定などの管理操作 | `backend/.env`（ディスク） |
| エージェント秘密鍵 | スワップ署名（BUY/SELL）・Approve | バックエンドのプロセスメモリのみ（再起動で消失） |

エージェントウォレットの秘密鍵は `POST /admin/agent-key` で受け取り、`ContractClient._agentSigner` に保持する。アドレスは秘密鍵から導出して `AppState.agentAddress` に設定する。

---

## 2. 全体構成

### 技術スタック

| 要素 | 採用技術 |
|------|---------|
| ランタイム | Node.js 20 + TypeScript |
| HTTPサーバー | Fastify |
| ブロックチェーン | ethers.js v6 |
| AI | @anthropic-ai/sdk |
| 状態管理 | オンメモリ（DBなし・デモ用途） |

### ディレクトリ構成

```
backend/src/
├── server.ts
├── config.ts
├── agent/
│   ├── AgentLoop.ts
│   ├── MarketAnalyzer.ts
│   ├── ClaudeClient.ts
│   └── TradeExecutor.ts
├── contracts/
│   ├── ContractClient.ts
│   ├── ChainSync.ts
│   └── abis/
├── routes/
│   ├── state.ts
│   ├── agent.ts
│   └── admin.ts
└── store/AppState.ts
```

---

## 3. config.ts（設定）

| 設定値 | 型 | 説明 |
|-------|-----|------|
| `ANTHROPIC_API_KEY` | string | Claude APIキー |
| `RPC_URL` | string | Amoy RPC（デフォルト: Polygon公式） |
| `ADMIN_PRIVATE_KEY` | string | 管理者ウォレット秘密鍵 |
| `JPYY_ADDRESS` / `YTT_ADDRESS` / `AMM_ADDRESS` | string | コントラクトアドレス |
| `DEFAULT_INTERVAL` / `DEFAULT_AMOUNT` / `DEFAULT_MODE` | number/string | エージェントデフォルト値 |
| `isDummy` (getter) | boolean | `ADMIN_PRIVATE_KEY` または `AMM_ADDRESS` が未設定なら `true` |

**ダミーモード判定ロジック**:  
`isDummy = !ADMIN_PRIVATE_KEY || !AMM_ADDRESS`  
→ `.env` に両方が揃っていれば本番モード、どちらかが空ならダミーモード。

---

## 4. ダミーモード（`config.isDummy === true`）

ブロックチェーン接続・Claude API なしでフロントエンドの動作確認が可能。

| クラス | ダミー実装の内容 |
|-------|---------------|
| `ContractClient` | x*y=k 式をオンメモリで計算。`addRandomDrift()` で ±2% のランダム価格変動を生成。 |
| `ClaudeClient` | ルールベース判定（積極±3%・慎重±8%）でBUY/SELL/HOLDを返す。 |
| `TradeExecutor` | フェイクTXハッシュ（64文字ランダム16進数）を生成してオンメモリ状態を更新。 |

起動ログ: `Mode: 🟡 DUMMY (blockchain & AI simulated)`

---

## 5. ContractClient（Option A 対応）

シングルトンパターン。`_adminSigner` は起動時に初期化。`_agentSigner` は `POST /admin/agent-key` 受信後に設定。

### agentSigner 管理（主要メソッド）

```typescript
// 秘密鍵からWalletを生成→アドレスをAppStateに設定→Approveを自動実行
static setAgentSigner(privateKey: string): string

// メモリから削除→AppState.agentAddressをnullに
static clearAgentSigner(): void

// agentSignerが設定されているかチェック
static hasAgentSigner(): boolean
```

### adminSigner と agentSigner の役割分担

| 操作 | 使用Signer |
|------|-----------|
| mint / addLiquidity / setReserves | `_adminSigner` |
| swapJpyyForYtt / swapYttForJpyy | `_agentSigner` |
| JPYY/YTT Approve（エージェント分） | `_agentSigner`（鍵設定時と初回スワップ前に自動） |
| syncFromChain（残高読み取り） | provider（署名不要） |

### スワップ時の動作分岐

```typescript
// agentSigner未設定またはダミーモード → オンメモリ擬似実行（チェーン送信なし）
if (config.isDummy || !_agentSigner) {
  // AppStateを直接更新して返す
}
// agentSigner設定済み → 実際のチェーンにTXを送信
await _ensureAgentApproval(jpyyIn, 0);
const tx = await _amm!.connect(_agentSigner).swapJpyyForYtt(p(jpyyIn), minYtt);
```

---

## 6. ChainSync

15秒ごとに `ContractClient.syncFromChain()` を呼び出してプール状態・エージェント残高を更新する。

- ダミーモードでは動作しない（`config.isDummy` チェック）
- `AppState.agentAddress` が設定されている場合のみ残高を取得

---

## 7. HTTP APIルート

### routes/state.ts

| メソッド | パス | 処理 |
|---------|------|------|
| GET | `/api/state` | AppState の現在値をシリアライズして返す（フロントポーリング用） |

### routes/agent.ts

| メソッド | パス | 処理 |
|---------|------|------|
| GET | `/agent/status` | 状態取得 |
| POST | `/agent/start` | エージェント起動 |
| POST | `/agent/stop` | エージェント停止 |
| PATCH | `/agent/config` | モード・間隔・取引量の変更 |

> `/agent/connect`・`/agent/disconnect` は廃止。エージェントアドレスは `POST /admin/agent-key` で設定する。

### routes/admin.ts

| メソッド | パス | 処理 | 使用Signer |
|---------|------|------|-----------|
| POST | `/admin/agent-key` | エージェント秘密鍵をメモリに設定。稼働中は400。 | — |
| DELETE | `/admin/agent-key` | エージェント秘密鍵をクリア。稼働中は400。 | — |
| POST | `/admin/mint` | JPYY発行。`txHash` をレスポンスに含む。 | adminSigner |
| POST | `/admin/distribute` | 複数アドレスへJPYY配布 | adminSigner |
| POST | `/admin/liquidity` | 流動性追加 | adminSigner |
| POST | `/admin/price` | リザーブ直接設定 | adminSigner |
| POST | `/admin/price-adjust` | k維持で価格を±5%/±20%調整 | adminSigner |
| GET  | `/admin/logs` | 操作ログ取得 | — |

**重要**: 全 `ContractClient.*` の呼び出しは `await` すること（非同期操作がunhandled rejectionになりサーバーがクラッシュする）。

**agent-key エンドポイントの仕様**:

| | `/admin/agent-key` POST | `/admin/agent-key` DELETE |
|--|----------------------|--------------------------|
| リクエスト | `{ "privateKey": "0x..." }` | なし |
| 成功レスポンス | `{ "ok": true, "address": "0x..." }` | `{ "ok": true }` |
| エラー（稼働中） | `400 { "error": "エージェントが稼働中です。先に停止してください。" }` | 同左 |
| ログレベル | `warn`（リクエストボディを出力しない） | — |

---

## 8. AppState

オンメモリのシングルトン。DBなし。サーバー再起動でリセット。

主なフィールド：
- `agentAddress`: string | null（agentSignerから導出）
- `running`: boolean
- `mode`: AgentMode
- `intervalSec` / `tradeAmount`: 設定値
- `pool`: PoolState（jpyyReserve, yttReserve, price）
- `balances`: AgentBalances（pol, jpyy, ytt）
- `priceHistory`: 直近の価格履歴（最大100件）
- `lastDecision`: Decision | null
- `txHistory`: TxResult[]（最大100件）
- `adminLogs`: 管理操作の履歴
- `lastError`: string | null

---

## 9. server.ts（起動順序）

1. Fastify インスタンス生成（logLevel: `warn`）
2. CORS 設定（`origin: true`）
3. ルート登録（`stateRoutes` / `agentRoutes` prefix `/agent` / `adminRoutes` prefix `/admin`）
4. ヘルスチェックエンドポイント（`GET /health`）
5. `app.listen({ port, host: '0.0.0.0' })`
6. `chainSync.start()`（本番モードのみ）

---

## 10. エラーハンドリング一覧

| 発生箇所 | エラー種別 | 対応 |
|---------|-----------|------|
| ContractClient 初期化 | 秘密鍵不正 | ルートで400返却 |
| MarketAnalyzer.fetch | RPC読み取り失敗 | エラーログ出力してスキップ |
| ClaudeClient.decide | APIタイムアウト / JSONパース失敗 | ダミー判断にフォールバック |
| TradeExecutor | JPYY/YTT残高不足 | スキップして次サイクルへ |
| TradeExecutor | TXリバート | `failed` として `AppState.txHistory` に記録 |
| admin routes | コントラクトリバート | `500` + エラーメッセージ返却 |

---

## 11. 設計レビュー（Option A: インメモリ秘密鍵方式）

| # | 問題 | 重大度 | 対策 |
|---|------|--------|------|
| 1 | 秘密鍵が HTTP 平文でPOSTされる | 🔴 本番/🟡 ローカル | ローカルのみ使用。本番はHTTPSまたはOption Bへ。 |
| 2 | 秘密鍵がNode.jsプロセスメモリに保持 | 🟡 | testnetのため許容範囲。 |
| 3 | サーバー再起動で秘密鍵が失効 | 🟡 | デモ毎に再設定が必要。UIに明示。 |
| 4 | 誤った秘密鍵を設定した場合の検証 | 🟡 | フロントが `new ethers.Wallet(key)` でアドレスをプレビュー。バックエンドも例外をキャッチして400返却。 |
| 5 | エージェント稼働中に秘密鍵をクリアされる | 🟡 | `running === true` の場合は400を返してブロック。 |
| 6 | Approve未実行だと初回スワップが失敗 | 🟡 | `setAgentSigner()` 内で自動実行。スワップ直前にも念のためチェック。 |
| 7 | ログに秘密鍵が出力されるリスク | 🔴 | `/admin/agent-key` ルートの `logLevel: 'warn'` で対処。 |

---

*最終更新: 2026-05-01（v2.0）*
