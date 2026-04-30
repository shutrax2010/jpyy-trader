# AIトークン売買デモアプリ 画面仕様書

**バージョン**: 1.5
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

---

## 1. ウォレット構成（2本化）

| ウォレット | 用途 | フロントエンドでの扱い |
|-----------|------|----------------------|
| **管理者ウォレット** | コントラクトowner・JPYY発行配布・AMM操作 | 管理画面でMetaMask接続 |
| **エージェントウォレット** | AI自律売買・JPYY/YTT残高保有 | アドレスのみ環境変数で受け取り、残高を読み取り表示 |

> ユーザーウォレット接続（MetaMask）は不要。トレード画面はエージェントの動作を閲覧するダッシュボード。

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
| アクセント（薄） | `#FFF3A8` | ペールイエロー |
| Buy | `#1A9E6A` | エメラルドグリーン |
| Buy 背景 | `#E8F8F2` | ペールグリーン |
| Sell | `#D94040` | クリムゾン |
| Sell 背景 | `#FAEAEA` | ペールレッド |
| Hold | `#8A8878` | ニュートラルグレー |
| Hold 背景 | `#F0EFE8` | ペールグレー |
| 積極モード | `#E85D24` | オレンジ |
| 慎重モード | `#3B7DD8` | ブルー |
| 管理画面背景 | `#1A1A14` | チャコール |
| 管理画面カード | `#242420` | ダークカード |
| 管理アクセント | `#9B7BE8` | パープル |

---

## 3. 画面一覧

| 画面名 | URL | 対象 |
|--------|-----|------|
| トレードダッシュボード | `/` | エージェントウォレット接続者 |
| 管理ダッシュボード | `/admin` | デモ担当者（管理者ウォレット） |

---

## 4. トレードダッシュボード（`/`）

### 4.1 レイアウト

トレード画面を開くと、最初にウォレット接続画面を表示する。

```
┌──────────────────────────────────────────┐
│  JPYY●TRADER                             │
│                                          │
│  エージェントウォレットを接続してください  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  🦊 MetaMask で接続               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  接続したウォレットが AIエージェントとして  │
│  JPYY/YTT の売買を行います。             │
│                                          │
│  ・Polygon Amoy Testnet に切り替えが必要  │
│  ・JPYY残高が必要です（管理者から配布）   │
└──────────────────────────────────────────┘
```

**接続フローの詳細**:

1. ユーザーが「MetaMask で接続」ボタンを押す
2. MetaMask が起動し、アカウント選択・承認を求める
3. ネットワークが Amoy Testnet でない場合、自動で切替を要求する
4. 接続完了 → アドレスをバックエンドに登録 → ダッシュボードを表示する

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

- エージェントウォレットのアドレスと残高は環境変数 `NEXT_PUBLIC_AGENT_ADDRESS` から取得して表示

### 4.2 ヘッダー

| 要素 | 内容 | スタイル |
|------|------|---------|
| ロゴ | `JPYY●TRADER` | `DM Sans` 18px weight 600、●=`#F5C800` |
| エージェント状態 | `● RUNNING` / `● STOPPED` | 緑/グレー点、`DM Mono` 11px |
| AIモードバッジ | `積極モード` / `慎重モード` | オレンジ/ブルーバッジ |
| ネットワーク | `AMOY TESTNET` | `#FFFBE6`背景、`#C9A000`テキスト |
| 管理画面リンク | `管理 →` | 右端テキストリンク、`/admin`へ |


### 4.3 左カラム — AIエージェント制御パネル

**カード背景**: `#FFFBE6`
**上部アクセントライン**: 積極=`3px solid #E85D24` / 慎重=`3px solid #3B7DD8`

| 要素 | 仕様 |
|------|------|
| 現在の判断バッジ | `BUY YTT` / `SELL YTT` / `HOLD` |
| 判断理由 | Claudeが返したテキスト、3行まで |
| AIモード切替 | `積極モード` / `慎重モード` 2択トグル |
| 実行間隔 | スライダー（30〜300秒） |
| 取引量 | テキストボックス（`¥` プレフィックス、数値入力） |
| スタート/ストップ | フル幅トグルボタン |

**取引量バリデーション**:
- `¥100` 未満 → エラー
- `¥50,000` 超 → エラー
- エージェントのJPYY残高超 → `"残高を超えています（残高: ¥XX,XXX）"` エラー

### 4.4 左カラム — エージェント残高パネル（HOLDINGS）

**カード背景**: `#FFFFFF`

旧「ウォレット接続後に表示」→ **常時表示**（読み取り専用）

```
HOLDINGS（エージェント）              [↻]
─────────────────────────────────────
アドレス   0x1A2B...9fCd
           （接続中 · Amoy Testnet）
─────────────────────────────────────
POL        0.9842
─────────────────────────────────────
JPYY       ¥ 12,400
           ≈ 12,400 円
─────────────────────────────────────
YTT        120.00 YTT
           ≈ ¥ 14,400
─────────────────────────────────────
合計資産   ≈ ¥ 26,800
```

| 要素 | スタイル |
|------|---------|
| アドレス | `DM Mono` 12px、副テキスト色、MetaMask 接続中のアドレスを表示、クリックで Polygonscan へ |
| POL残高 | `DM Mono` 15px |
| JPYY残高 | `¥` プレフィックス + `DM Mono` 22px weight 600 |
| YTT残高 | `DM Mono` 22px weight 600 + ¥換算を副表示 |
| 合計資産 | `DM Mono` 15px weight 600 |
| 更新ボタン | 右上、ポーリングとは別に手動リフレッシュ可 |

### 4.5 右カラム（変更なし）

- 価格チャート（YTT/JPYY、¥建て）
- AMMプール状態パネル
- AI判断パネル（モードバッジ付き）
- トランザクション履歴（方向: `JPYY→YTT` / `YTT→JPYY`）

---

## 5. 管理ダッシュボード（`/admin`）

### 5.1 接続方式

管理画面は **MetaMask 接続不要**。管理操作はすべてバックエンドが `.env` のアドレスを使って署名・送信する。

**アクセス制御**:
- MetaMask 接続は不要
- 誤操作防止のため、全操作に確認ダイアログを表示する
- 本番運用時はベーシック認証などを追加することを推奨（デモでは不要）

### 5.2 サイドバーメニュー

| メニュー | 内容 |
|---------|------|
| 概要 | 全体サマリー |
| JPYY管理 | mint・エージェントへの配布 |
| AMM管理 | 流動性追加・価格リバランス |
| YTT価格設定 | setReservesで価格直接変更 |
| 操作ログ | 全管理操作の履歴 |

### 5.3 JPYY管理ページ（変更点）

**発行先の選択肢を整理**:

旧: 「管理者ウォレット」/「カスタムアドレス」
新: 「エージェントウォレット（自動入力）」/「カスタムアドレス」

```
JPYY 新規発行（mint）
────────────────────────────────────
発行量     ¥ [__________]
発行先     [エージェントウォレット ▼]
           0x1A2B...9fCd（自動入力）

現在の総発行量: ¥ 1,000,000
発行後:         ¥ 1,050,000 (+5.0%)

[  発行する（mint）  ]
```

**配布パネルの変更**:

旧: 「配布先アドレスを複数指定」
新: エージェントウォレットへの配布を主目的とし、カスタムアドレス入力は補助機能として残す

### 5.4 概要ページのサマリーカード（変更点）

旧: 「配布済みウォレット一覧」
新: 「エージェント残高」カードに変更

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ JPYY総発行量 │ │ AMMプール    │ │ YTT現在価格  │ │ エージェント │
│ ¥ 1,000,000 │ │ 健全         │ │ ¥ 120.00    │ │ JPYY: ¥12,400│
│ +¥50,000今日│ │ JPYY:10,000 │ │ ↑ +2.04%   │ │ YTT:  120.00 │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 6. ポーリング API（GET /api/state）

WebSocket は使用しない。フロントエンドは **5 秒ごとに `GET /api/state`** を呼び出して全画面を更新する。

### レスポンス構造

```typescript
{
  agent: {
    running:   boolean;          // エージェント稼働状態
    mode:      'aggressive' | 'conservative';
    interval:  number;           // 実行間隔（秒）
    nextRunIn: number;           // 次回実行までの秒数（バックエンドで計算）
    tradeAmount: number;         // 取引量（JPYY）
  };
  balances: {
    pol:  number;                // エージェントのPOL残高
    jpyy: number;                // エージェントのJPYY残高
    ytt:  number;                // エージェントのYTT残高
  };
  pool: {
    jpyyReserve: number;
    yttReserve:  number;
    price:       number;         // YTT現在価格（¥/YTT）
  };
  priceHistory:  PricePoint[];   // 最新20件（古い順）
  lastDecision:  Decision | null;
  txHistory:     TxResult[];     // 最新20件（新しい順）
  lastError:     string | null;  // 直近エラー（なければ null）
}
```

### ポーリング間隔の根拠

エージェントの最短実行間隔は 30 秒のため、5 秒ポーリングで十分なリアルタイム性を確保できる。

### エージェントウォレットの登録・解除

```typescript
// POST /agent/connect
// フロントエンドがMetaMask接続後にアドレスを通知
{ "address": "0x1A2B...9fCd" }

// POST /agent/disconnect
// MetaMask切断時・画面離脱時に通知
{}
```

### トランザクション署名フロー（エージェント）

エージェントのTX署名はフロントエンドの MetaMask を経由する。

```
バックエンド               フロントエンド（MetaMask）
    │                           │
    │ ← POST /agent/swap ──────│  AIがBUYを判断
    │                           │
    │   TX データを構築          │
    │ ─ 署名リクエスト ────────→│
    │                           │  MetaMaskがポップアップ
    │                           │  （ユーザーが確認・承認）
    │ ← 署名済みTX ────────────│
    │                           │
    │   Polygon Amoyに送信      │
    │ ─ tx_submitted ─────────→│  WebSocketで配信
    │ ─ tx_confirmed ─────────→│  確定後に配信
```

> MetaMask のポップアップが毎回表示されると UX が悪いため、`eth_signTransaction` を使ってバックエンドが送信する構成を基本とする。フロントエンドは接続時に「自動署名を許可しますか？」の確認を取る。

### WebSocket イベント（変更点）

`agent_info` イベントを `wallet_connected` / `wallet_disconnected` に変更する。

| イベント名 | ペイロード | 用途 |
|-----------|-----------|------|
| `wallet_connected` | `{ address, network }` | 接続完了をフロントに通知 |
| `wallet_disconnected` | `{}` | 切断時にフロントのUI更新 |
| その他 | v1.4 と同じ | 変更なし |

---

## 7. 環境変数

### バックエンド（`.env`）

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Polygon Amoy
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002

# 管理者ウォレット（.envで管理・MetaMask不要）
ADMIN_PRIVATE_KEY=0x...

# エージェントウォレット（秘密鍵はここに書かない）
# → フロントエンドのMetaMask接続で取得する

# コントラクト
JPYY_ADDRESS=0x...
YTT_ADDRESS=0x...
AMM_ADDRESS=0x...

# エージェント設定
AGENT_AUTO_START=false        # 接続後に手動でSTARTするためfalse推奨
DEFAULT_INTERVAL=60
DEFAULT_AMOUNT=1000
DEFAULT_MODE=aggressive

PORT=3001
```

### フロントエンド（`.env.local`）

```env
# コントラクトアドレス
NEXT_PUBLIC_JPYY_ADDRESS=0x...
NEXT_PUBLIC_YTT_ADDRESS=0x...
NEXT_PUBLIC_AMM_ADDRESS=0x...

# RPC（読み取り用）
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology

# バックエンドURL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 8. コンポーネント構成（React）

```
src/
├── pages/
│   ├── TradeDashboard.tsx
│   └── admin/
│       ├── AdminLayout.tsx
│       ├── AdminOverview.tsx
│       ├── AdminJpyy.tsx          # 発行先をエージェントアドレスに変更
│       ├── AdminAmm.tsx
│       ├── AdminYttPrice.tsx
│       └── AdminLog.tsx
├── components/
│   ├── WalletConnectScreen.tsx    # 新規: 起動時のMetaMask接続画面
│   ├── Header.tsx                 # 接続アドレス表示・切断ボタン追加
│   ├── AgentControlPanel.tsx      # 未接続時にSTARTを無効化
│   ├── HoldingsPanel.tsx          # 接続ウォレットの残高を表示
│   ├── PriceChart.tsx
│   ├── PoolStatusPanel.tsx
│   ├── AIDecisionPanel.tsx
│   ├── TxHistoryTable.tsx
│   └── admin/
│       ├── AdminWalletGuard.tsx
│       ├── JpyyMintPanel.tsx      # 発行先をエージェント優先に変更
│       ├── AmmLiquidityPanel.tsx
│       ├── PriceRebalancePanel.tsx
│       └── AiSimulator.tsx
├── hooks/
│   ├── usePolling.ts              # GET /api/state の5秒ポーリング
│   ├── useAdminWallet.ts               # wagmi useAccount / useConnect
│   └── useAgent.ts
├── store/
│   └── tradingStore.ts
└── styles/
│   └── tokens.css
└── App.tsx                        # 未接続時は WalletConnectScreen を表示
```

---

## 9. CSS デザイントークン（v1.3から変更なし）

```css
:root {
  --color-bg-page:        #FAFAF7;
  --color-bg-card:        #FFFFFF;
  --color-bg-accent:      #FFFBE6;
  --color-border:         #E8E6DC;
  --color-text-primary:   #1A1A14;
  --color-text-secondary: #8A8878;
  --color-text-hint:      #B8B6A8;
  --color-yellow:         #F5C800;
  --color-yellow-dark:    #C9A000;
  --color-yellow-light:   #FFF3A8;
  --color-buy:            #1A9E6A;
  --color-buy-bg:         #E8F8F2;
  --color-sell:           #D94040;
  --color-sell-bg:        #FAEAEA;
  --color-hold:           #8A8878;
  --color-hold-bg:        #F0EFE8;
  --color-aggressive:     #E85D24;
  --color-aggressive-bg:  #FEF0E8;
  --color-conservative:   #3B7DD8;
  --color-conservative-bg:#E8F0FE;
  --admin-bg-page:        #1A1A14;
  --admin-bg-sidebar:     #111108;
  --admin-bg-card:        #242420;
  --admin-border:         #3A3A34;
  --admin-text-primary:   #E8E6DC;
  --admin-accent:         #9B7BE8;
  --font-sans:    'DM Sans', sans-serif;
  --font-mono:    'DM Mono', monospace;
  --space-card:   24px;
  --space-inner:  20px;
  --radius-card:  12px;
  --shadow-card:  0 2px 12px rgba(26,26,20,0.06);
}
```

---

*最終更新: 2026-04-29（v1.5 WebSocket廃止）*
