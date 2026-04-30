# JPYY TRADER — プロジェクト概要

AIがJPYY/YTTトークンペアの自動売買を行うデモアプリ。
Polygon Amoy Testnet 上で動作する。

---

## システム構成

```
frontend/    React（トレードダッシュボード + 管理画面）
backend/     Node.js + TypeScript（AIエージェント + WebSocket API）
contract/    Solidity（JPYY / YTT / AMM コントラクト）
```

## トークン

| トークン | 役割 | 備考 |
|---------|------|------|
| JPYY | 基本通貨（1JPYY = 1円） | ERC-20、管理者がmint |
| YTT | 変動トークン（売買対象） | ERC-20、価格はAMMプールで決定 |

## ウォレット（2本のみ）

| ウォレット | 環境変数 | 用途 |
|-----------|---------|------|
| 管理者ウォレット | `ADMIN_PRIVATE_KEY` | コントラクトデプロイ・JPYY発行・AMM管理 |
| エージェントウォレット | `AGENT_PRIVATE_KEY` | AI自律売買（Claude APIで判断） |

## AIエージェントの動作

1. AMMプールから YTT 価格を取得
2. Claude API に価格履歴・残高を渡して BUY / SELL / HOLD を判断
3. BUY/SELL の場合は AMM.swap() を実行
4. WebSocket でフロントエンドにリアルタイム配信

モード: `積極モード`（閾値±3%）/ `慎重モード`（閾値±8%）

## ネットワーク

- Polygon Amoy Testnet（chainId: 80002）
- RPC: https://rpc-amoy.polygon.technology
- エクスプローラー: https://amoy.polygonscan.com

## 詳細ドキュメント（docs/）

| ファイル | 内容 |
|---------|------|
| `01_screen-spec.md` | 画面仕様書（v1.4）|
| `02_ai-agent-design.md` | AIエージェント機能設計書 |
| `03_backend-design.md` | バックエンド設計書（v1.1）|
| `04_contract-design.md` | スマートコントラクト設計書 |
| `05_contract-dev-setup.md` | コントラクト開発環境構築手順 |
| `06_local-test-env.md` | ローカルテスト環境構築手順 |
