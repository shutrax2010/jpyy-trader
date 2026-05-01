# スマートコントラクト設計書

**対象システム**: JPYY TRADER
**バージョン**: 2.1
**作成日**: 2026-04-29
**更新日**: 2026-05-01
**ネットワーク**: Polygon Amoy Testnet（chainId: 80002）

---

## 変更履歴

| Ver | 日付 | 変更内容 |
|-----|------|---------|
| 1.0 | 2026-04-29 | 初版 |
| 2.0 | 2026-05-01 | AGENT_PRIVATE_KEY廃止、エージェントApproveをMetaMask方式に変更 |
| 2.1 | 2026-05-01 | エージェントウォレット方式をOption A（インメモリ秘密鍵）に変更。バックエンドが自律署名。MetaMask接続不要。 |

---

## 1. ウォレット構成とコントラクトの関係

```
管理者ウォレット（ADMIN_PRIVATE_KEY — backend .env のみ）
  ├── JPYY.deploy() / YTT.deploy() / AMM.deploy()
  ├── JPYY.mint(to, amount)          JPYY 発行（管理ダッシュボード）
  ├── AMM.addLiquidity(jpyy, ytt)    流動性追加
  └── AMM.setReserves(jpyy, ytt)     価格変更（直接設定 / price-adjust 共用）

エージェントウォレット（Option A: バックエンドメモリに秘密鍵を保持）
  ├── JPYY.approve(AMM, MAX)         秘密鍵設定時にバックエンドが自動実行
  ├── YTT.approve(AMM, MAX)          同上
  ├── AMM.swapJpyyForYtt()           AI判断→BUY
  └── AMM.swapYttForJpyy()           AI判断→SELL
```

---

## 2. コントラクト一覧

| コントラクト | 役割 | 標準 |
|-------------|------|------|
| `JPYY` | 基本通貨トークン（1JPYY=1円） | ERC-20 + AccessControl（MINTER_ROLE） |
| `YTT` | 変動トークン（売買対象） | ERC-20 + Ownable |
| `AMM` | 自動マーケットメーカー（x×y=k） | カスタム + Ownable |

---

## 3. JPYY.sol

- `AccessControl` による MINTER_ROLE で発行権限を管理
- `DEFAULT_ADMIN_ROLE` と `MINTER_ROLE` をデプロイ時に `admin` アドレスへ付与

| 関数 | 呼び出し元 | 説明 |
|------|-----------|------|
| `mint(address to, uint256 amount)` | 管理者（MINTER_ROLE） | JPYY 発行 |
| `transfer / approve` | 全アドレス | ERC-20 標準 |

---

## 4. YTT.sol

- `Ownable` による owner 限定 mint（AMM への初期供給のみ使用）

| 関数 | 呼び出し元 | 説明 |
|------|-----------|------|
| `mint(address to, uint256 amount)` | 管理者（owner） | YTT 発行 |
| `transfer / approve` | 全アドレス | ERC-20 標準 |

---

## 5. AMM.sol

- JPYY / YTT の 2 トークンペア AMM
- **定数積式（x × y = k）** でスワップ価格を決定
- YTT 価格 = `jpyyReserve / yttReserve`（¥/YTT）
- 管理者専用の `setReserves`・`addLiquidity` でプールを直接操作可能（デモ用）

### スワップ価格計算式

```
amountOut = (amountIn × reserveOut) / (reserveIn + amountIn)
```

手数料なし。実行後に `jpyyReserve` と `yttReserve` を更新し、`Swap` イベントを発火。

### price-adjust との関係

`POST /admin/price-adjust` は以下の計算をバックエンド側で行い、`setReserves` を呼び出す：

```
k            = jpyyReserve × yttReserve    （定数積を維持）
targetPrice  = currentPrice × multiplier   （up=1.05, down=0.95, bigUp=1.20, bigDown=0.80）
newJpyy      = √(targetPrice × k)
newYtt       = √(k / targetPrice)
→ AMM.setReserves(newJpyy, newYtt)
```

`setReserves` は内部で差分だけトークンを transferFrom / transfer する（不足分は管理者ウォレットから補填、余剰は管理者ウォレットに返還）。

### 関数一覧

| 関数 | 呼び出し元 | 説明 |
|------|----------|------|
| `swapJpyyForYtt(uint256 jpyyIn, uint256 minYttOut)` | エージェント | BUY |
| `swapYttForJpyy(uint256 yttIn, uint256 minJpyyOut)` | エージェント | SELL |
| `getAmountOut(uint256 amountIn, uint256 rIn, uint256 rOut)` | 誰でも | スワップ出力量の計算 |
| `getYttPrice()` | 誰でも | YTT現在価格（`jpyyReserve × 1e18 / yttReserve`） |
| `getReserves()` | 誰でも | `(jpyyReserve, yttReserve)` を返す |
| `addLiquidity(uint256 jpyy, uint256 ytt)` | **管理者のみ** | 流動性追加 |
| `setReserves(uint256 _jpyy, uint256 _ytt)` | **管理者のみ** | 価格変更（デモ専用） |

---

## 6. デプロイ手順

### 6.1 前提

- Hardhat + `@nomicfoundation/hardhat-ethers` を使用
- `contract/.env` に `RPC_URL` と `ADMIN_PRIVATE_KEY` を設定
- Amoy Testnet への POL 残高が必要（ガス代）

### 6.2 デプロイスクリプト（`scripts/deploy.ts`）の処理順序

1. `admin` アドレスで JPYY をデプロイ（`MINTER_ROLE` を admin に付与）
2. `admin` アドレスで YTT をデプロイ（`owner` = admin）
3. `admin` アドレスで AMM をデプロイ（JPYY/YTTアドレスを渡す）
4. JPYY を 10,000 mint、YTT を 100 mint（初期流動性用）
5. JPYY / YTT を AMM への無制限 approve
6. `AMM.addLiquidity(10000, 100)` → YTT 初期価格 ¥100
7. 各コントラクトアドレスを出力 → `backend/.env` に記載

### 6.3 エージェントの Approve（バックエンド自動実行）

`POST /admin/agent-key` を受信後、`ContractClient.setAgentSigner()` が自動実行する：

1. 秘密鍵から `ethers.Wallet` を生成
2. `JPYY.allowance(agentAddress, ammAddress)` を確認
3. 不足している場合は `agentSigner` で `approve(ammAddress, MaxUint256)` を送信
4. YTT も同様に確認・実行
5. 完了後、エージェントがスワップ可能な状態になる

> MetaMask 操作は不要。管理画面から秘密鍵を入力するだけで完結。

---

## 7. 初期状態

| 項目 | 値 |
|------|---|
| AMMプール JPYY残高 | 10,000 JPYY |
| AMMプール YTT残高 | 100 YTT |
| YTT初期価格 | ¥100 / YTT |
| k 定数 | 1,000,000（1e18 スケール後） |
| エージェント JPYY残高 | デプロイ後に管理ダッシュボードから配布 |

---

## 8. バックエンド連携（decimals 変換）

コントラクトの全金額は 1e18 スケール（wei 単位）。`ContractClient` で以下のように変換する：

```typescript
// チェーン読み取り → 表示用
const [jpyyRaw, yttRaw] = await amm.getReserves();
const jpyyReserve = parseFloat(ethers.formatUnits(jpyyRaw, 18)); // 例: 10000.0
const price       = jpyyReserve / yttReserve;                    // 例: 100.0

// 表示用 → チェーン送信
const jpyyIn = ethers.parseUnits(String(tradeAmount), 18);

// setReserves（price-adjust で使用）
const newJpyy = ethers.parseUnits(newJpyyDisplay.toFixed(18), 18);
```

---

## 9. 環境変数

### contract/.env（デプロイ用）

```env
RPC_URL=https://rpc-amoy.polygon.technology
ADMIN_PRIVATE_KEY=0x...
```

### backend/.env（バックエンド用）

```env
ADMIN_PRIVATE_KEY=0x...
JPYY_ADDRESS=0x...
YTT_ADDRESS=0x...
AMM_ADDRESS=0x...
```

---

## 10. セキュリティ考慮事項

- `setReserves` はデモ専用（k 定数が変わるため本番では削除を推奨）
- `ADMIN_PRIVATE_KEY` は `.gitignore` 済みの `.env` にのみ記載
- エージェントウォレットの秘密鍵はバックエンドのプロセスメモリにのみ保持（Option A）
- ログへの秘密鍵出力禁止（`/admin/agent-key` のログレベルを `warn` に設定）
- 本番化する場合は Option B（ERC-4337 セッションキー）への移行を推奨

---

*最終更新: 2026-05-01（v2.1）*
