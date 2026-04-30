# スマートコントラクト開発環境 構築手順書

**対象システム**: JPYY TRADER
**バージョン**: 1.0
**作成日**: 2026-04-29
**ネットワーク**: Polygon Amoy Testnet

---

## 1. 必要なツール一覧

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20 LTS 以上 | 実行環境（Hardhat は Node.js 上で動く） |
| npm / pnpm | npm 10 / pnpm 9 | パッケージ管理 |
| Hardhat | 2.22 以上 | コンパイル・テスト・デプロイ フレームワーク |
| Solidity | 0.8.20 | スマートコントラクト言語 |
| OpenZeppelin Contracts | 5.x | ERC-20・AccessControl の標準実装 |
| ethers.js | 6.x | デプロイスクリプト・テスト内でのコントラクト操作 |
| TypeScript | 5.x | デプロイスクリプト・テストの記述言語 |
| dotenv | 16.x | .env ファイルから秘密鍵・RPC URLを読み込む |
| MetaMask | 最新版 | 管理者ウォレットの管理（ブラウザ拡張） |

---

## 2. ディレクトリ構成

```
contract/                        ← このリポジトリのルート
├── contracts/
│   ├── JPYY.sol
│   ├── YTT.sol
│   └── AMM.sol
├── scripts/
│   ├── deploy.ts                ← デプロイ + 初期設定を一括実行
│   └── setup-agent.ts           ← エージェントの Approve を設定
├── test/
│   ├── JPYY.test.ts
│   ├── YTT.test.ts
│   └── AMM.test.ts
├── ignition/                    ← （使用しない場合は削除可）
├── .env                         ← 秘密鍵・RPC URL（gitignore 済み）
├── .env.example                 ← .env のテンプレート（コミット可）
├── .gitignore
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. セットアップ手順

### ステップ 1 — Node.js のインストール

```bash
# バージョン確認（20以上であること）
node -v   # v20.x.x
npm -v    # 10.x.x

# まだの場合は公式サイトか nvm でインストール
# https://nodejs.org/  または
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

### ステップ 2 — プロジェクトの作成

```bash
mkdir jpyy-contract && cd jpyy-contract

# Hardhat プロジェクトを初期化
npx hardhat init
# → "Create a TypeScript project" を選択
# → .gitignore を追加するか → Yes
# → 依存パッケージをインストールするか → Yes
```

### ステップ 3 — 必要なパッケージを追加

```bash
# OpenZeppelin（ERC-20・AccessControl）
npm install @openzeppelin/contracts

# Hardhat 関連（TypeScript・ethers.js サポート）
npm install --save-dev \
  @nomicfoundation/hardhat-ethers \
  @nomicfoundation/hardhat-toolbox \
  ethers \
  ts-node \
  typescript \
  @types/node

# 環境変数
npm install dotenv
```

### ステップ 4 — TypeScript 設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "resolveJsonModule": true
  },
  "include": ["./scripts", "./test", "./hardhat.config.ts"]
}
```

### ステップ 5 — Hardhat 設定ファイル

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // ローカル開発用（テスト実行時に自動起動）
    hardhat: {},

    // Polygon Amoy Testnet
    amoy: {
      url:      process.env.RPC_URL ?? '',
      accounts: process.env.ADMIN_PRIVATE_KEY
        ? [process.env.ADMIN_PRIVATE_KEY]
        : [],
      chainId: 80002,
    },
  },
};

export default config;
```

### ステップ 6 — .env ファイルの作成

```bash
cp .env.example .env
```

```env
# .env.example（リポジトリにコミットするテンプレート）

# Polygon Amoy Testnet の RPC URL
RPC_URL=https://rpc-amoy.polygon.technology

# 管理者ウォレットの秘密鍵（MetaMask → アカウント詳細 → 秘密鍵をエクスポート）
ADMIN_PRIVATE_KEY=0x_your_admin_private_key_here

# エージェントウォレットの秘密鍵
AGENT_PRIVATE_KEY=0x_your_agent_private_key_here

# エージェントウォレットのアドレス（秘密鍵から自動導出可能）
AGENT_ADDRESS=0x_your_agent_address_here

# デプロイ後に記入するコントラクトアドレス
JPYY_ADDRESS=
YTT_ADDRESS=
AMM_ADDRESS=
```

```bash
# .gitignore に .env が含まれていることを確認
echo ".env" >> .gitignore
```

### ステップ 7 — MetaMask の設定

**Amoy Testnet をMetaMaskに追加する**:

MetaMask → ネットワークを追加 → カスタムネットワーク

| 項目 | 値 |
|------|---|
| ネットワーク名 | Polygon Amoy Testnet |
| RPC URL | `https://rpc-amoy.polygon.technology` |
| チェーンID | `80002` |
| 通貨記号 | `POL` |
| ブロックエクスプローラー | `https://amoy.polygonscan.com` |

または以下のコードをコンソールで実行して自動追加:

```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
  }],
});
```

### ステップ 8 — テスト用 POL の取得（Faucet）

以下のいずれかで管理者・エージェント両ウォレットに POL を補給する。

| Faucet | URL | 補給量 |
|--------|-----|-------|
| Polygon 公式 | https://faucet.polygon.technology/ | 0.2 POL/日 |
| Alchemy Faucet | https://www.alchemy.com/faucets/polygon-amoy | 0.5 POL/日 |

> 各Faucetは1アドレスあたり1日1回。管理者・エージェントで合計2回リクエストする。

---

## 4. コントラクトのコンパイル

```bash
# Solidity をコンパイルして ABI・bytecode を生成
npx hardhat compile

# 成功すると以下が生成される
# artifacts/contracts/JPYY.sol/JPYY.json  ← ABI + bytecode
# artifacts/contracts/YTT.sol/YTT.json
# artifacts/contracts/AMM.sol/AMM.json
# cache/                                   ← コンパイルキャッシュ
```

コンパイル後、バックエンドの `src/contracts/abis/` に ABI をコピーする:

```bash
cp artifacts/contracts/JPYY.sol/JPYY.json ../backend/src/contracts/abis/
cp artifacts/contracts/YTT.sol/YTT.json   ../backend/src/contracts/abis/
cp artifacts/contracts/AMM.sol/AMM.json   ../backend/src/contracts/abis/
```

---

## 5. テスト

### テストファイルの構成

```typescript
// test/AMM.test.ts（例）
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('AMM', () => {
  let jpyy: any, ytt: any, amm: any;
  let admin: any, agent: any;

  beforeEach(async () => {
    [admin, agent] = await ethers.getSigners();

    const JPYY = await ethers.getContractFactory('JPYY');
    jpyy = await JPYY.deploy(admin.address);

    const YTT = await ethers.getContractFactory('YTT');
    ytt = await YTT.deploy(admin.address);

    const AMM = await ethers.getContractFactory('AMM');
    amm = await AMM.deploy(jpyy.target, ytt.target, admin.address);

    // 初期流動性を投入
    const jpyyAmt = ethers.parseUnits('10000', 18);
    const yttAmt  = ethers.parseUnits('100',   18);
    await jpyy.mint(admin.address, jpyyAmt);
    await ytt.mint(admin.address,  yttAmt);
    await jpyy.approve(amm.target, jpyyAmt);
    await ytt.approve(amm.target,  yttAmt);
    await amm.addLiquidity(jpyyAmt, yttAmt);

    // エージェントに JPYY を配布して Approve
    const agentJpyy = ethers.parseUnits('1000', 18);
    await jpyy.mint(agent.address, agentJpyy);
    await jpyy.connect(agent).approve(amm.target, ethers.MaxUint256);
    await ytt.connect(agent).approve(amm.target,  ethers.MaxUint256);
  });

  it('初期価格が ¥100/YTT であること', async () => {
    const price = await amm.getYttPrice();
    // price = jpyyReserve * 1e18 / yttReserve = 10000e18 * 1e18 / 100e18 = 100e18
    expect(price).to.equal(ethers.parseUnits('100', 18));
  });

  it('BUY: JPYY → YTT スワップができること', async () => {
    const jpyyIn = ethers.parseUnits('100', 18);
    const expected = await amm.getAmountOut(
      jpyyIn,
      ethers.parseUnits('10000', 18),
      ethers.parseUnits('100', 18)
    );

    await amm.connect(agent).swapJpyyForYtt(jpyyIn, expected);

    const [jpyyRes, yttRes] = await amm.getReserves();
    expect(jpyyRes).to.be.gt(ethers.parseUnits('10000', 18));
    expect(yttRes).to.be.lt(ethers.parseUnits('100', 18));
  });

  it('SELL: YTT → JPYY スワップができること', async () => {
    // 先にBUYしてYTTを取得
    await amm.connect(agent).swapJpyyForYtt(
      ethers.parseUnits('100', 18), 0n
    );

    const yttBalance = await ytt.balanceOf(agent.address);
    await amm.connect(agent).swapYttForJpyy(yttBalance / 2n, 0n);

    const [jpyyRes] = await amm.getReserves();
    expect(jpyyRes).to.be.gt(0n);
  });

  it('スリッページ超過で revert すること', async () => {
    const jpyyIn  = ethers.parseUnits('100', 18);
    const tooHigh = ethers.parseUnits('999', 18);  // 実際より多い要求
    await expect(
      amm.connect(agent).swapJpyyForYtt(jpyyIn, tooHigh)
    ).to.be.revertedWith('AMM: slippage exceeded');
  });

  it('管理者以外が addLiquidity を呼ぶと revert すること', async () => {
    await expect(
      amm.connect(agent).addLiquidity(1n, 1n)
    ).to.be.revertedWithCustomError(amm, 'OwnableUnauthorizedAccount');
  });

  it('管理者以外が setReserves を呼ぶと revert すること', async () => {
    await expect(
      amm.connect(agent).setReserves(1000n, 10n)
    ).to.be.revertedWithCustomError(amm, 'OwnableUnauthorizedAccount');
  });
});
```

### テスト実行コマンド

```bash
# 全テストを実行（ローカルの Hardhat ネットワーク上）
npx hardhat test

# 特定のファイルのみ
npx hardhat test test/AMM.test.ts

# ガス消費量のレポート付き
REPORT_GAS=true npx hardhat test

# カバレッジ計測
npx hardhat coverage
```

---

## 6. デプロイ

### 6.1 Amoy Testnet へのデプロイ

```bash
# scripts/deploy.ts を実行
npx hardhat run scripts/deploy.ts --network amoy
```

成功すると以下のようなログが出力される:

```
Deploying with admin: 0x1A2B...
JPYY_ADDRESS= 0xABCD...
YTT_ADDRESS=  0xEFGH...
AMM_ADDRESS=  0xIJKL...
✓ Initial liquidity added: JPYY=10,000 / YTT=100 → ¥100/YTT
✓ Agent JPYY minted: ¥50,000 → 0xMNOP...
```

### 6.2 .env にコントラクトアドレスを記入

```bash
# デプロイログのアドレスを .env に記入
JPYY_ADDRESS=0xABCD...
YTT_ADDRESS=0xEFGH...
AMM_ADDRESS=0xIJKL...
```

### 6.3 エージェントの Approve を設定

```bash
npx ts-node scripts/setup-agent.ts
# → ✓ Agent approvals complete
```

### 6.4 Polygonscan で確認

デプロイ後、Polygonscan でコントラクトが正常に作成されていることを確認する。

```
https://amoy.polygonscan.com/address/<コントラクトアドレス>
```

---

## 7. npm スクリプト一覧

```json
// package.json の scripts セクション
{
  "scripts": {
    "compile":       "hardhat compile",
    "test":          "hardhat test",
    "test:coverage": "hardhat coverage",
    "deploy":        "hardhat run scripts/deploy.ts --network amoy",
    "setup:agent":   "ts-node scripts/setup-agent.ts",
    "node":          "hardhat node",
    "copy:abis":     "cp artifacts/contracts/JPYY.sol/JPYY.json ../backend/src/contracts/abis/ && cp artifacts/contracts/YTT.sol/YTT.json ../backend/src/contracts/abis/ && cp artifacts/contracts/AMM.sol/AMM.json ../backend/src/contracts/abis/"
  }
}
```

---

## 8. よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `insufficient funds` | デプロイウォレットの POL 不足 | Faucet で POL を補給 |
| `nonce too low` | 前のTXが pending のまま | Metamask で nonce をリセット or 少し待つ |
| `invalid private key` | .env の秘密鍵が不正 | `0x` プレフィックスがあるか確認 |
| `network not found` | hardhat.config の amoy 設定ミス | RPC URL と chainId を確認 |
| `contract not deployed` | ABI のアドレスが古い | .env のコントラクトアドレスを更新 |
| `OwnableUnauthorizedAccount` | 管理者以外が owner 限定関数を呼んだ | ADMIN_PRIVATE_KEY が正しいか確認 |
| `AMM: slippage exceeded` | スリッページ設定が厳しすぎる | minAmountOut を 0 にしてテスト |

---

## 9. 開発フロー（日常作業）

```
Solidity を修正
    ↓
npx hardhat compile      ← コンパイルエラーを確認
    ↓
npx hardhat test         ← ローカルで全テストをパス
    ↓
npm run deploy           ← Amoy Testnet にデプロイ
    ↓
.env のアドレスを更新
    ↓
npm run copy:abis        ← バックエンドの ABI を更新
    ↓
バックエンドを再起動
```

---

*最終更新: 2026-04-29*
