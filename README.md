# JPYY TRADER — ドキュメント一覧

**プロジェクト**: JPYY TRADER（AIトークン売買デモアプリ）
**最終更新**: 2026-04-29

---

## ドキュメント構成

```
docs/
├── CLAUDE.md                  Claude Code 用プロジェクト概要（自動読み込み）
├── README.md                  このファイル（ドキュメント一覧）
│
├── 01_screen-spec.md          画面仕様書
├── 02_ai-agent-design.md      AIエージェント機能設計書
├── 03_backend-design.md       バックエンド設計書
├── 04_contract-design.md      スマートコントラクト設計書
├── 05_contract-dev-setup.md   コントラクト開発環境構築手順
└── 06_local-test-env.md       ローカルテスト環境構築手順
```

---

## 各ドキュメントの概要

### 01_screen-spec.md — 画面仕様書（v1.4）

トレードダッシュボード（`/`）と管理ダッシュボード（`/admin`）の画面設計。

- デザインコンセプト: オフホワイト × サンイエロー
- フォント: DM Sans（UI）/ DM Mono（数値）
- ウォレット構成（2本化）に対応した最新版
- 主な画面: AIエージェント制御パネル / HOLDINGS / 価格チャート / AMMプール / AI判断パネル / TX履歴 / 管理画面（JPYY管理・AMM管理・操作ログ）
- CSS デザイントークン一覧を含む

### 02_ai-agent-design.md — AIエージェント機能設計書（v1.0）

Claude API を使った自律売買エージェントの設計。

- 必要な準備（環境変数・残高・Approve設定）
- プロンプト設計（システムプロンプト・モード別指示・ユーザープロンプト）
- 実装方針（AgentLoop / MarketAnalyzer / ClaudeClient / TradeExecutor）
- 型定義・エラーハンドリング方針・実装ロードマップ

### 03_backend-design.md — バックエンド設計書（v1.1）

Node.js + TypeScript のバックエンド全体設計。

- 技術スタック（Fastify / ws / ethers.js / @anthropic-ai/sdk）
- ウォレット2本化（adminSigner / agentSigner）対応の ContractClient
- WebSocket イベント設計
- HTTP API ルート（エージェント制御 / 管理者操作）
- AppState（オンメモリ状態管理）
- セットアップスクリプト（deploy.ts / setup-agent.ts）

### 04_contract-design.md — スマートコントラクト設計書（v1.0）

Solidity コントラクトの実装設計。

- JPYY.sol: ERC-20 + AccessControl（minter権限）
- YTT.sol: ERC-20 + Ownable
- AMM.sol: 定数積式（x×y=k）+ 管理者専用機能（addLiquidity / setReserves）
- デプロイ手順（scripts/deploy.ts）
- 初期状態: JPYY=10,000 / YTT=100 → ¥100/YTT

### 05_contract-dev-setup.md — コントラクト開発環境構築手順（v1.0）

Hardhat プロジェクトのセットアップから Amoy Testnet デプロイまでの手順。

- 必要ツール一覧（Node.js / Hardhat / OpenZeppelin / ethers.js 等）
- ステップバイステップのセットアップ手順（9ステップ）
- MetaMask への Amoy Testnet 追加方法
- Faucet での POL 取得方法
- 日常の開発フロー

### 06_local-test-env.md — ローカルテスト環境構築手順（v1.0）

Hardhat 内蔵 EVM を使ったオフラインテスト環境の構築。

- テスト環境の全体像（Amoy 不要・インメモリ EVM）
- 共通デプロイヘルパー（deployAll / e18 / f18）
- テストファイル全文（JPYY / YTT / AMM）
- テスト実行コマンド一覧
- ガスレポート・カバレッジの設定
- ローカルノードを使った手動テスト手順

---

## 開発の進め方（推奨順序）

```
Step 1  contract/   コントラクト実装 → ローカルテスト → Amoy デプロイ
           参照: 04_contract-design.md
                05_contract-dev-setup.md
                06_local-test-env.md

Step 2  backend/    ContractClient → MarketAnalyzer → ClaudeClient
                    → TradeExecutor → AgentLoop → WsServer
           参照: 03_backend-design.md
                02_ai-agent-design.md

Step 3  frontend/   React コンポーネント実装
           参照: 01_screen-spec.md
```

## Claude Code での使い方

このフォルダに `CLAUDE.md` が置かれています。Claude Code（VS Code 拡張 / CLI）はプロジェクトを開いた際に `CLAUDE.md` を自動で読み込むため、毎回コンテキストを説明する必要はありません。

各ドキュメントを参照させる場合:
```
@docs/03_backend-design.md を参照して ContractClient.ts を実装して
```

---

*最終更新: 2026-04-29*
