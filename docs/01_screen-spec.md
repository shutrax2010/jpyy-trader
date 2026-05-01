# AIトークン売買デモアプリ 画面仕様書

**バージョン**: 1.7
**対象ネットワーク**: Polygon Amoy Testnet
**トークン**: JPYY（基本通貨、1JPYY=1円） / YTT
**フロントエンド**: NEXT JS + ポーリング（5秒間隔）

---

## 変更履歴

| Ver | 日付 | 変更内容 |
|-----|------|---------|
| 1.0 | 2026-04-29 | 初版 |
| 1.1 | 2026-04-29 | デザインをオフホワイト×イエローに変更 |
| 1.2 | 2026-04-29 | トークン名変更（YTT1→JPYY / YTT2→YTT）、JPYY円建て表示、YTT価格変更、AIモード追加 |
| 1.3 | 2026-04-29 | QuickSwap廃止、取引量テキスト入力化、MATICラベル→POL、管理画面追加 |
| 1.4 | 2026-04-29 | ウォレット2本化（管理者・エージェント）に合わせて全画面を更新 |
| 1.5 | 2026-04-29 | WebSocket廃止→ポーリング（GET /api/state 5秒間隔）に変更 |
| 1.6 | 2026-04-30 | ウォレット接続方式を実装に合わせて更新 |
| 1.7 | 2026-05-01 | エージェントウォレット方式をOption A（管理画面でインメモリ秘密鍵設定）に変更。トレードダッシュボードのMetaMask接続を廃止し、APIポーリングのみに統一。管理画面に「エージェント設定」ページを追加。 |

---

## 1. ウォレット構成（2本化）

| ウォレット | 用途 | フロントエンドでの扱い |
|-----------|------|----------------------|
| **管理者ウォレット** | コントラクトowner・JPYY発行配布・AMM操作 | バックエンドの `ADMIN_PRIVATE_KEY` で署名。フロントエンドでは `NEXT_PUBLIC_ADMIN_ADDRESS` をサイドバーに表示するのみ。 |
| **エージェントウォレット** | AI自律売買・JPYY/YTT残高保有・スワップ署名 | 管理画面の「エージェント設定」から秘密鍵を入力→バックエンドがメモリに保持。MetaMask不要。 |

> **秘密鍵の保持方針（Option A）**: バックエンドのプロセスメモリのみ。ディスク（`.env`含む）には書き込まない。サーバー再起動で失効する。ローカル・テストネット専用の設計。

---

## 2. デザインコンセプト

### カラーパレット

| 用途 | カラーコード | 説明 |
|------|------------|------|
| 背景（ページ全体） | `#FAFAF7` | 温かみのあるオフホワイト |
| 背景（カード） | `#FFFFFF` | 純白 |
| 背景（強調パネル） | `#FFFBE6` | 薄黄色（AIパネル） |
| ボーダー | `#E8E6DC` | ウォームグレー |
| テキスト（主） | `#1A1A14` | ほぼ黒 |
| テキスト（副） | `#8A8878` | ウォームグレー |
| テキスト（ヒント） | `#B8B6A8` | ライトグレー |
| アクセント（メイン） | `#F5C800` | サンイエロー |
| アクセント（濃） | `#C9A000` | ダークゴールド |
| Buy | `#1A9E6A` | エメラルドグリーン |
| Sell | `#D94040` | クリムゾン |
| Hold | `#8A8878` | ニュートラルグレー |
| 積極モード | `#E85D24` | オレンジ |
| 慎重モード | `#3B7DD8` | ブルー |
| 管理画面背景 | `#1A1A14` | チャコール |
| 管理アクセント | `#9B7BE8` | パープル |

---

## 3. 画面一覧

| 画面名 | URL | 対象 |
|--------|-----|------|
| トレードダッシュボード | `/` | エージェントウォレット設定後に閲覧可能 |
| 管理ダッシュボード | `/admin` | デモ担当者 |

---

## 4. トレードダッシュボード（`/`）

### 4.1 レイアウト

トレード画面はウォレット接続なしで直接アクセスできる。エージェントウォレットの設定状態は `GET /api/state` ポーリングから取得して表示する。

**エージェント未設定時の表示**:

```
┌──────────────────────────────────────────┐
│  JPYY●TRADER                             │
│                                          │
│  ⚠ エージェントウォレット未設定            │
│                                          │
│  管理画面 → エージェント設定 から          │
│  秘密鍵を設定してください。                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  管理画面を開く →                  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**エージェント設定済み時**: 通常のダッシュボードを表示する。

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: ロゴ / エージェント状態 / AIモード / ネットワーク  │
├──────────────┬──────────────────────────────────────────┤
│  左カラム    │  右カラム                                  │
│  (300px)     │                                          │
│              │  ┌──────────────────────────────────┐   │
│  AIエージェ  │  │  YTT価格チャート（¥建て）         │   │
│  ント制御    │  └──────────────────────────────────┘   │
│              │                                          │
│  エージェント│  ┌────────────┐  ┌────────────────────┐ │
│  残高        │  │ AMMプール  │  │   AI判断パネル     │ │
│  （HOLDINGS）│  │ 状態       │  │                    │ │
│              │  └────────────┘  └────────────────────┘ │
│              │                                          │
│              │  ┌──────────────────────────────────┐   │
│              │  │  トランザクション履歴              │   │
│              │  └──────────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────┘
```

### 4.2 ヘッダー

| 要素 | 内容 | 備考 |
|------|------|------|
| ロゴ | `JPYY●TRADER` | `DM Sans` 18px weight 600、●=`#F5C800` |
| エージェント状態 | `● RUNNING` / `● STOPPED` | 緑/グレー点、`DM Mono` 11px |
| AIモードバッジ | `積極モード` / `慎重モード` / `ランダム` | 各色バッジ |
| ネットワーク | `AMOY TESTNET` バッジ（固定表示） | MetaMask不要のため静的 |
| エージェントアドレス | `0x1234…5678`（`agent.address` から表示） | 右端 |
| 管理画面リンク | `管理 →`（`/admin`） | 右端 |

### 4.3 左カラム — AIエージェント制御パネル

**カード背景**: `#FFFBE6`
**上部アクセントライン**: 積極=`3px solid #E85D24` / 慎重=`3px solid #3B7DD8` / ランダム=`3px solid #C9A000`

| 要素 | 仕様 |
|------|------|
| 現在の判断バッジ | `BUY YTT` / `SELL YTT` / `HOLD` |
| 判断理由 | Claudeが返したテキスト、3行まで |
| AIモード切替 | `積極モード` / `慎重モード` / `ランダム` 3択トグル |
| 実行間隔 | スライダー（30〜300秒） |
| 取引量 | テキストボックス（`¥` プレフィックス、数値入力） |
| スタート/ストップ | フル幅トグルボタン |

**取引量バリデーション**:
- `¥100` 未満 → エラー
- `¥50,000` 超 → エラー
- エージェントのJPYY残高超 → `"残高を超えています（残高: ¥XX,XXX）"` エラー

### 4.4 左カラム — エージェント残高パネル（HOLDINGS）

```
HOLDINGS（エージェント）              [↻]
─────────────────────────────────────
アドレス   0x1A2B...9fCd  → Polygonscan リンク
─────────────────────────────────────
POL        0.9842          ← balances.pol（APIから）
─────────────────────────────────────
JPYY       ¥ 12,400
           ≈ 12,400 円
─────────────────────────────────────
YTT        120.00 YTT
           ≈ ¥ 14,400
─────────────────────────────────────
合計資産   ≈ ¥ 26,800
```

全残高は `GET /api/state` の `balances` から取得（MetaMask不要）。

### 4.5 右カラム

- 価格チャート（YTT/JPYY、¥建て、recharts折れ線）
- AMMプール状態パネル
- AI判断パネル（モードバッジ付き）
- トランザクション履歴（方向: `JPYY→YTT` / `YTT→JPYY`）

---

## 5. 管理ダッシュボード（`/admin`）

### 5.1 接続方式

MetaMask 接続不要。管理操作はすべてバックエンドが `ADMIN_PRIVATE_KEY` を使って署名・送信する。

**アクセス制御**: 現在は制限なし（デモ用途）。本番運用時はベーシック認証等を追加推奨。

### 5.2 サイドバーメニュー

| メニュー | 内容 |
|---------|------|
| 概要 | 全体サマリー |
| エージェント設定 | エージェントウォレット秘密鍵の設定・クリア |
| JPYY管理 | mint・エージェントへの配布 |
| AMM管理 | 流動性追加・価格リバランス |
| YTT価格設定 | setReservesで価格直接変更 |
| 操作ログ | 全管理操作の履歴 |

### 5.3 エージェント設定ページ

```
エージェントウォレット設定
────────────────────────────────────────
現在の状態
  🟢 設定済み — 0x1A2B...9fCd
  🔴 未設定

────────────────────────────────────────
秘密鍵 (0x...)  [type="password"]
  ↓ 入力後にアドレスをプレビュー（ethers.jsでフロント側が導出）
  設定先アドレス: 0x1A2B...9fCd

  [ この秘密鍵をエージェントに設定 ]  → POST /admin/agent-key
  [ クリア ]                          → DELETE /admin/agent-key

⚠ 秘密鍵はサーバーのメモリにのみ保持。再起動で失効。
```

| 操作 | 処理 |
|------|------|
| 秘密鍵を入力 | フロントエンドが `new ethers.Wallet(key)` でアドレスをプレビュー表示 |
| 「設定する」クリック | `POST /admin/agent-key { privateKey }` を送信。成功時はアドレスを表示 |
| 「クリア」クリック | `DELETE /admin/agent-key` を送信。稼働中の場合は400エラーを表示 |

### 5.4 JPYY管理ページ

```
JPYY 新規発行（mint）
────────────────────────────────────
発行先（エージェントウォレット）
  0x1A2B...9fCd  ← GET /api/state の agent.address を自動表示

発行量     ¥ [__________]

[  発行する（mint）  ]

✓ 発行完了  0xabc123...def456 ↗  ← Polyscan リンク
```

### 5.5 概要ページのサマリーカード

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ JPYY総発行量 │ │ AMMプール    │ │ YTT現在価格  │ │ エージェント │
│ ¥ 1,000,000 │ │ 健全         │ │ ¥ 120.00    │ │ JPYY: ¥12,400│
│ +¥50,000今日│ │ JPYY:10,000 │ │ ↑ +2.04%   │ │ YTT:  120.00 │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 6. ポーリング API（GET /api/state）

フロントエンドは **5 秒ごとに `GET /api/state`** を呼び出して全画面を更新する（WebSocket不使用）。

### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `agent.address` | `string` | エージェントウォレットアドレス（未設定時は空文字） |
| `agent.running` | `boolean` | エージェント稼働状態 |
| `agent.mode` | `'aggressive' \| 'conservative' \| 'random'` | AIモード |
| `agent.interval` | `number` | 実行間隔（秒） |
| `agent.nextRunIn` | `number` | 次回実行までの秒数 |
| `agent.tradeAmount` | `number` | 取引量（JPYY） |
| `balances.pol` | `number` | エージェントのPOL残高 |
| `balances.jpyy` | `number` | エージェントのJPYY残高 |
| `balances.ytt` | `number` | エージェントのYTT残高 |
| `pool.jpyyReserve` | `number` | AMMプールJPYY残高 |
| `pool.yttReserve` | `number` | AMMプールYTT残高 |
| `pool.price` | `number` | YTT現在価格（¥/YTT） |
| `priceHistory` | `PricePoint[]` | 最新20件の価格履歴（古い順） |
| `lastDecision` | `Decision \| null` | 最新のAI判断 |
| `txHistory` | `TxResult[]` | 最新20件のトランザクション |
| `lastError` | `string \| null` | 直近エラー |

### エージェントウォレットの設定・クリア

| エンドポイント | リクエスト | レスポンス |
|--------------|-----------|-----------|
| `POST /admin/agent-key` | `{ "privateKey": "0x..." }` | `{ "ok": true, "address": "0x..." }` |
| `DELETE /admin/agent-key` | なし | `{ "ok": true }` |

稼働中は両エンドポイントとも `400` を返す。

### トランザクション署名フロー（エージェント）

```
バックエンド（AgentLoop）
    │  AIがBUY/SELLを判断
    ├─ _ensureAgentApproval() ─→ JPYY/YTT のallowance確認・必要なら approve
    ├─ ContractClient.swap*() ─→ in-memoryのagentSignerで署名・送信
    └─ syncFromChain()        ─→ 残高・プール状態を更新
```

---

## 7. 環境変数

### バックエンド（`backend/.env`）

```env
ANTHROPIC_API_KEY=sk-ant-...
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002
ADMIN_PRIVATE_KEY=0x...
JPYY_ADDRESS=0x...
YTT_ADDRESS=0x...
AMM_ADDRESS=0x...
DEFAULT_INTERVAL=60
DEFAULT_AMOUNT=1000
DEFAULT_MODE=aggressive
PORT=3001
```

> `ADMIN_PRIVATE_KEY` または `AMM_ADDRESS` が未設定の場合、バックエンドはダミーモード（オンメモリ擬似実装）で動作する。

### フロントエンド（`frontend/.env.local`）

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_ADDRESS=0x...
```

---

## 8. コンポーネント構成

```
src/
├── pages/
│   ├── index.tsx                # トレードダッシュボード（エージェント未設定時は案内画面）
│   ├── api/                     # モックAPIフォールバック（NEXT_PUBLIC_API_URL未設定時に使用）
│   └── admin/                   # 管理画面（5ページ）
├── components/
│   ├── WalletConnectionScreen.tsx  # エージェント未設定時の案内画面
│   ├── Header.tsx                  # ロゴ・状態・ネットワークバッジ
│   ├── AgentControlPanel.tsx       # エージェント制御（3モードトグル）
│   ├── HoldingsPanel.tsx           # 残高（すべてAPIから取得）
│   ├── PriceChart.tsx              # recharts 折れ線グラフ
│   ├── PoolStatusPanel.tsx         # AMMプール状態
│   ├── AIDecisionPanel.tsx         # AI最新判断
│   ├── TxHistoryTable.tsx          # TX履歴
│   └── admin/
│       ├── AdminLayout.tsx         # サイドバー付きレイアウト
│       ├── AdminAgentKey.tsx       # エージェント秘密鍵設定フォーム
│       ├── AdminJpyy.tsx           # JPYY発行（Polyscanリンク付き）
│       ├── AdminAmm.tsx            # 流動性追加
│       ├── AdminYttPrice.tsx       # 価格設定
│       └── AdminLog.tsx            # 操作ログ
├── hooks/
│   ├── usePolling.ts              # 5秒ごとに GET /api/state → Zustand更新
│   ├── useAgent.ts                # エージェント制御API
│   └── useAdmin.ts                # 管理API（agent-key含む）
├── store/
│   └── tradingStore.ts            # Zustand
└── styles/
    └── tokens.css                 # CSSカスタムプロパティ（デザイントークン）
```

---

## 9. CSS デザイントークン（`styles/tokens.css`）

```css
:root {
  /* 背景 */
  --color-bg-page:        #FAFAF7;
  --color-bg-card:        #FFFFFF;
  --color-bg-accent:      #FFFBE6;
  --color-border:         #E8E6DC;

  /* テキスト */
  --color-text-primary:   #1A1A14;
  --color-text-secondary: #8A8878;
  --color-text-hint:      #B8B6A8;

  /* アクセント */
  --color-yellow:         #F5C800;
  --color-yellow-dark:    #C9A000;

  /* BUY / SELL / HOLD */
  --color-buy:            #1A9E6A;  --color-buy-bg:  #E8F8F2;
  --color-sell:           #D94040;  --color-sell-bg: #FAEAEA;
  --color-hold:           #8A8878;  --color-hold-bg: #F0EFE8;

  /* モード */
  --color-aggressive:     #E85D24;  --color-aggressive-bg:  #FEF0E8;
  --color-conservative:   #3B7DD8;  --color-conservative-bg:#E8F0FE;

  /* 管理画面（ダーク） */
  --admin-bg-page:        #1A1A14;
  --admin-bg-sidebar:     #111108;
  --admin-bg-card:        #242420;
  --admin-border:         #3A3A34;
  --admin-text-primary:   #E8E6DC;
  --admin-accent:         #9B7BE8;

  /* タイポグラフィ */
  --font-sans:    'DM Sans', sans-serif;
  --font-mono:    'DM Mono', monospace;

  /* スペーシング */
  --space-card:   24px;
  --radius-card:  12px;
  --shadow-card:  0 2px 12px rgba(26,26,20,0.06);
}
```

---

*最終更新: 2026-05-01（v1.7）*
