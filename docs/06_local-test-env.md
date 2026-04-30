# ローカルテスト環境 構築・運用手順書

**対象システム**: JPYY TRADER — スマートコントラクト
**バージョン**: 1.0
**作成日**: 2026-04-29

---

## 1. ローカルテスト環境の全体像

```
テスト実行時の構成

┌────────────────────────────────────────────────────────┐
│  Hardhat Network（インメモリEVM）                        │
│  ・Amoy Testnet と同じ EVM 仕様                         │
│  ・起動ごとにリセット（クリーンな状態から開始）            │
│  ・ガス代無料・TX即時確定                                │
│  ・テスト用アカウント20個を自動生成                        │
│                                                        │
│  JPYY.sol ─── YTT.sol ─── AMM.sol                     │
│  （テストごとに再デプロイ）                              │
└────────────────────────────────────────────────────────┘
         ↑ テスト実行
┌────────────────────┐
│  Hardhat Test      │  Mocha + Chai
│  test/*.test.ts    │  ethers.js でコントラクト操作
└────────────────────┘
```

Hardhat に内蔵された EVM を使うため、Amoy Testnet や POL 残高は不要。完全にオフラインで動作する。

---

## 2. テスト構成ファイル一覧

```
contract/
├── test/
│   ├── helpers/
│   │   └── deploy.ts          ← 共通デプロイヘルパー（各テストから import）
│   ├── JPYY.test.ts           ← JPYY トークンのテスト
│   ├── YTT.test.ts            ← YTT トークンのテスト
│   └── AMM.test.ts            ← AMM スワップ・管理機能のテスト
├── hardhat.config.ts
└── package.json
```

---

## 3. 共通デプロイヘルパー

各テストファイルで毎回同じセットアップを書かないよう、ヘルパーに切り出す。

```typescript
// test/helpers/deploy.ts
import { ethers } from 'hardhat';

export interface DeployedContracts {
  jpyy:  ethers.Contract;
  ytt:   ethers.Contract;
  amm:   ethers.Contract;
  admin: ethers.HardhatEthersSigner;   // 管理者ウォレット（Hardhat アカウント[0]）
  agent: ethers.HardhatEthersSigner;   // エージェントウォレット（Hardhat アカウント[1]）
}

/**
 * コントラクトをデプロイして初期状態を作るヘルパー。
 * ・JPYY / YTT / AMM をデプロイ
 * ・初期流動性を投入（JPYY=10,000 / YTT=100 → 初期価格 ¥100）
 * ・エージェントに JPYY=1,000 を配布
 * ・エージェントの Approve を設定
 */
export async function deployAll(): Promise<DeployedContracts> {
  const [admin, agent] = await ethers.getSigners();

  // デプロイ
  const JPYY = await ethers.getContractFactory('JPYY');
  const jpyy = await JPYY.deploy(admin.address);

  const YTT = await ethers.getContractFactory('YTT');
  const ytt = await YTT.deploy(admin.address);

  const AMM = await ethers.getContractFactory('AMM');
  const amm = await AMM.deploy(jpyy.target, ytt.target, admin.address);

  // 初期流動性（JPYY=10,000 / YTT=100 → ¥100/YTT）
  const jpyyInit = e18('10000');
  const yttInit  = e18('100');
  await jpyy.mint(admin.address, jpyyInit);
  await ytt.mint(admin.address,  yttInit);
  await jpyy.approve(amm.target, jpyyInit);
  await ytt.approve(amm.target,  yttInit);
  await amm.addLiquidity(jpyyInit, yttInit);

  // エージェントにJPYYを配布 + Approve
  await jpyy.mint(agent.address, e18('1000'));
  await jpyy.connect(agent).approve(amm.target, ethers.MaxUint256);
  await ytt.connect(agent).approve(amm.target,  ethers.MaxUint256);

  return { jpyy, ytt, amm, admin, agent };
}

/** parseUnits の短縮形 */
export const e18 = (n: string) => ethers.parseUnits(n, 18);

/** formatUnits の短縮形（数値で返す） */
export const f18 = (n: bigint) => parseFloat(ethers.formatUnits(n, 18));
```

---

## 4. テストファイル

### 4.1 JPYY.test.ts

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAll, e18 } from './helpers/deploy';

describe('JPYY', () => {
  let ctx: Awaited<ReturnType<typeof deployAll>>;

  beforeEach(async () => { ctx = await deployAll(); });

  // ── 基本情報 ────────────────────────────────────────────
  it('名前とシンボルが正しいこと', async () => {
    expect(await ctx.jpyy.name()).to.equal('JPYY Token');
    expect(await ctx.jpyy.symbol()).to.equal('JPYY');
  });

  // ── mint ────────────────────────────────────────────────
  it('管理者が mint できること', async () => {
    await ctx.jpyy.mint(ctx.agent.address, e18('500'));
    // beforeEach で 1,000 配布済み → 合計 1,500
    const bal = await ctx.jpyy.balanceOf(ctx.agent.address);
    expect(bal).to.equal(e18('1500'));
  });

  it('管理者以外が mint すると revert すること', async () => {
    await expect(
      ctx.jpyy.connect(ctx.agent).mint(ctx.agent.address, e18('100'))
    ).to.be.reverted;
  });

  // ── transfer ────────────────────────────────────────────
  it('transfer が正しく動作すること', async () => {
    const before = await ctx.jpyy.balanceOf(ctx.admin.address);
    await ctx.jpyy.transfer(ctx.agent.address, e18('200'));
    const after = await ctx.jpyy.balanceOf(ctx.admin.address);
    expect(before - after).to.equal(e18('200'));
  });

  it('残高不足で transfer すると revert すること', async () => {
    const bal = await ctx.jpyy.balanceOf(ctx.agent.address);
    await expect(
      ctx.jpyy.connect(ctx.agent).transfer(ctx.admin.address, bal + 1n)
    ).to.be.revertedWithCustomError(ctx.jpyy, 'ERC20InsufficientBalance');
  });
});
```

### 4.2 YTT.test.ts

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAll, e18 } from './helpers/deploy';

describe('YTT', () => {
  let ctx: Awaited<ReturnType<typeof deployAll>>;

  beforeEach(async () => { ctx = await deployAll(); });

  it('名前とシンボルが正しいこと', async () => {
    expect(await ctx.ytt.name()).to.equal('YTT Token');
    expect(await ctx.ytt.symbol()).to.equal('YTT');
  });

  it('owner（管理者）のみ mint できること', async () => {
    await ctx.ytt.mint(ctx.admin.address, e18('50'));
    await expect(
      ctx.ytt.connect(ctx.agent).mint(ctx.agent.address, e18('50'))
    ).to.be.revertedWithCustomError(ctx.ytt, 'OwnableUnauthorizedAccount');
  });
});
```

### 4.3 AMM.test.ts

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployAll, e18, f18 } from './helpers/deploy';

describe('AMM', () => {
  let ctx: Awaited<ReturnType<typeof deployAll>>;

  beforeEach(async () => { ctx = await deployAll(); });

  // ── 初期状態 ─────────────────────────────────────────────
  describe('初期状態', () => {
    it('プール残高が正しいこと（JPYY=10,000 / YTT=100）', async () => {
      const [jpyy, ytt] = await ctx.amm.getReserves();
      expect(jpyy).to.equal(e18('10000'));
      expect(ytt).to.equal(e18('100'));
    });

    it('初期YTT価格が ¥100 であること', async () => {
      const price = await ctx.amm.getYttPrice();
      // price = jpyyReserve * 1e18 / yttReserve = 100 * 1e18
      expect(price).to.equal(e18('100'));
    });
  });

  // ── getAmountOut ─────────────────────────────────────────
  describe('getAmountOut', () => {
    it('定数積式の計算が正しいこと', async () => {
      // amountOut = (amountIn × reserveOut) / (reserveIn + amountIn)
      // = (100 * 100) / (10000 + 100) ≈ 0.990...
      const out = await ctx.amm.getAmountOut(e18('100'), e18('10000'), e18('100'));
      expect(f18(out)).to.be.closeTo(0.990, 0.001);
    });

    it('amountIn=0 で revert すること', async () => {
      await expect(
        ctx.amm.getAmountOut(0n, e18('10000'), e18('100'))
      ).to.be.revertedWith('AMM: invalid reserves');
    });
  });

  // ── swapJpyyForYtt (BUY) ─────────────────────────────────
  describe('swapJpyyForYtt (BUY)', () => {
    it('JPYY → YTT スワップが成功すること', async () => {
      const jpyyIn   = e18('100');
      const minYtt   = 0n;
      const yttBefore = await ctx.ytt.balanceOf(ctx.agent.address);

      await ctx.amm.connect(ctx.agent).swapJpyyForYtt(jpyyIn, minYtt);

      const yttAfter = await ctx.ytt.balanceOf(ctx.agent.address);
      expect(yttAfter).to.be.gt(yttBefore);
    });

    it('スワップ後にプール残高が正しく更新されること', async () => {
      await ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('100'), 0n);
      const [jpyyRes, yttRes] = await ctx.amm.getReserves();
      expect(jpyyRes).to.equal(e18('10100'));  // 10000 + 100
      expect(yttRes).to.be.lt(e18('100'));     // YTT が減少
    });

    it('k定数がスワップ後も維持されること（誤差 0.01% 以内）', async () => {
      const [j0, y0] = await ctx.amm.getReserves();
      const k0 = j0 * y0;

      await ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('100'), 0n);

      const [j1, y1] = await ctx.amm.getReserves();
      const k1 = j1 * y1;

      // 整数演算の切り捨て誤差のみ許容（k1 ≦ k0）
      expect(k1).to.be.lte(k0);
      expect(k0 - k1).to.be.lte(k0 / 10000n);  // 0.01%以内
    });

    it('minYttOut を超える出力でないと revert すること', async () => {
      const tooHigh = e18('999');
      await expect(
        ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('100'), tooHigh)
      ).to.be.revertedWith('AMM: slippage exceeded');
    });

    it('JPYY 残高不足で revert すること', async () => {
      const bal = await ctx.jpyy.balanceOf(ctx.agent.address);
      await expect(
        ctx.amm.connect(ctx.agent).swapJpyyForYtt(bal + e18('1'), 0n)
      ).to.be.reverted;
    });

    it('Swap イベントが発行されること', async () => {
      await expect(
        ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('100'), 0n)
      ).to.emit(ctx.amm, 'Swap')
        .withArgs(
          ctx.agent.address,
          ctx.jpyy.target,
          e18('100'),
          // amountOut は動的なので anyValue で検証
          (v: bigint) => v > 0n,
          e18('10100'),
          (v: bigint) => v < e18('100'),
        );
    });
  });

  // ── swapYttForJpyy (SELL) ────────────────────────────────
  describe('swapYttForJpyy (SELL)', () => {
    beforeEach(async () => {
      // 先に BUY して YTT を取得
      await ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('100'), 0n);
    });

    it('YTT → JPYY スワップが成功すること', async () => {
      const yttBal    = await ctx.ytt.balanceOf(ctx.agent.address);
      const jpyyBefore = await ctx.jpyy.balanceOf(ctx.agent.address);

      await ctx.amm.connect(ctx.agent).swapYttForJpyy(yttBal / 2n, 0n);

      const jpyyAfter = await ctx.jpyy.balanceOf(ctx.agent.address);
      expect(jpyyAfter).to.be.gt(jpyyBefore);
    });

    it('YTT 残高不足で revert すること', async () => {
      const yttBal = await ctx.ytt.balanceOf(ctx.agent.address);
      await expect(
        ctx.amm.connect(ctx.agent).swapYttForJpyy(yttBal + e18('1'), 0n)
      ).to.be.reverted;
    });
  });

  // ── 管理者専用機能 ────────────────────────────────────────
  describe('管理者専用機能', () => {
    it('addLiquidity でプール残高が増えること', async () => {
      const add = e18('1000');
      await ctx.jpyy.mint(ctx.admin.address, add);
      await ctx.ytt.mint(ctx.admin.address,  e18('10'));
      await ctx.jpyy.approve(ctx.amm.target, add);
      await ctx.ytt.approve(ctx.amm.target,  e18('10'));

      await ctx.amm.addLiquidity(add, e18('10'));

      const [jpyyRes] = await ctx.amm.getReserves();
      expect(jpyyRes).to.equal(e18('11000'));
    });

    it('エージェントが addLiquidity を呼ぶと revert すること', async () => {
      await expect(
        ctx.amm.connect(ctx.agent).addLiquidity(1n, 1n)
      ).to.be.revertedWithCustomError(ctx.amm, 'OwnableUnauthorizedAccount');
    });

    it('setReserves で価格が変わること', async () => {
      // JPYY=15,000 / YTT=100 → 価格 ¥150 に変更
      const newJpyy = e18('15000');
      const newYtt  = e18('100');
      await ctx.jpyy.mint(ctx.admin.address, e18('5000'));
      await ctx.jpyy.approve(ctx.amm.target, e18('5000'));

      await ctx.amm.setReserves(newJpyy, newYtt);

      const price = await ctx.amm.getYttPrice();
      // price = 15000 * 1e18 / 100 = 150 * 1e18
      expect(price).to.equal(e18('150'));
    });

    it('エージェントが setReserves を呼ぶと revert すること', async () => {
      await expect(
        ctx.amm.connect(ctx.agent).setReserves(e18('1000'), e18('10'))
      ).to.be.revertedWithCustomError(ctx.amm, 'OwnableUnauthorizedAccount');
    });
  });

  // ── 連続トレードシナリオ ──────────────────────────────────
  describe('連続トレードシナリオ', () => {
    it('BUY × 3 回で YTT 価格が上昇すること', async () => {
      const price0 = await ctx.amm.getYttPrice();

      for (let i = 0; i < 3; i++) {
        await ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('100'), 0n);
      }

      const price1 = await ctx.amm.getYttPrice();
      expect(price1).to.be.gt(price0);
    });

    it('BUY 後に SELL すると価格がほぼ元に戻ること', async () => {
      const price0 = await ctx.amm.getYttPrice();

      // BUY
      await ctx.amm.connect(ctx.agent).swapJpyyForYtt(e18('500'), 0n);

      // 取得した YTT をすべて SELL
      const yttBal = await ctx.ytt.balanceOf(ctx.agent.address);
      await ctx.amm.connect(ctx.agent).swapYttForJpyy(yttBal, 0n);

      const price1 = await ctx.amm.getYttPrice();
      // スリッページにより完全一致ではないが 1% 以内に収まること
      const diff = price1 > price0 ? price1 - price0 : price0 - price1;
      expect(diff).to.be.lte(price0 / 100n);
    });
  });
});
```

---

## 5. テスト実行コマンド

```bash
# 全テスト実行（最も基本的なコマンド）
npx hardhat test

# 特定ファイルのみ
npx hardhat test test/AMM.test.ts

# テスト名をフィルタ（--grep でキーワード指定）
npx hardhat test --grep "スワップ"
npx hardhat test --grep "管理者"

# ガス消費レポート付き
REPORT_GAS=true npx hardhat test

# カバレッジ計測（solidity-coverage が必要）
npx hardhat coverage
```

---

## 6. ガスレポートの設定

```typescript
// hardhat.config.ts に追加
import 'hardhat-gas-reporter';  // npm install --save-dev hardhat-gas-reporter

const config: HardhatUserConfig = {
  // ...
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'JPY',
    outputFile: 'gas-report.txt',
    noColors: true,
  },
};
```

実行例:
```
·-----------------------|---------------------------|-------------|-----------------------------·
|  Contract             ·  Method                   ·  Gas        ·  JPY (avg)                 |
························|···························|·············|·····························
|  AMM                  ·  swapJpyyForYtt           ·      65,234 ·             ¥ 0.01         |
|  AMM                  ·  swapYttForJpyy           ·      64,891 ·             ¥ 0.01         |
|  AMM                  ·  addLiquidity             ·      89,432 ·             ¥ 0.02         |
|  AMM                  ·  setReserves              ·      54,123 ·             ¥ 0.01         |
·-----------------------|---------------------------|-------------|-----------------------------·
```

---

## 7. カバレッジの設定

```bash
# インストール
npm install --save-dev solidity-coverage

# hardhat.config.ts に追加
import 'solidity-coverage';
```

```bash
npx hardhat coverage
# → coverage/ ディレクトリに HTML レポートが生成される
# → coverage/index.html をブラウザで開くと行単位のカバレッジを確認できる
```

目標カバレッジ:

| コントラクト | ステートメント | ブランチ |
|-------------|-------------|---------|
| JPYY.sol | 100% | 100% |
| YTT.sol | 100% | 100% |
| AMM.sol | 95%+ | 90%+ |

---

## 8. ローカルノードを使った手動テスト

テストスクリプトではなく、ブラウザや `curl` から手動で動作確認したい場合は Hardhat Node を起動する。

```bash
# ローカル EVM ノードを起動（http://127.0.0.1:8545）
npx hardhat node

# 別ターミナルでデプロイ
npx hardhat run scripts/deploy.ts --network localhost

# バックエンドを localhost ネットワークで起動
# .env の RPC_URL を http://127.0.0.1:8545 に変更して
npm run dev
```

MetaMask でローカルノードに接続する場合:

| 項目 | 値 |
|------|---|
| ネットワーク名 | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| チェーンID | `31337` |
| 通貨記号 | `ETH` |

Hardhat が生成するテストアカウントの秘密鍵（先頭2つを管理者・エージェントとして使う）:

```
アカウント[0]（管理者）
  アドレス: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  秘密鍵:   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

アカウント[1]（エージェント）
  アドレス: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  秘密鍵:   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

> これらは Hardhat 公開の鍵であり、実資産には絶対に使用しないこと。

---

## 9. よくある失敗と対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `Error: cannot estimate gas` | コントラクトが revert している | `revertedWith` でエラー文を確認 |
| `AssertionError: expected X to equal Y` | `parseUnits` / `formatUnits` の桁ミス | `e18()` / `f18()` ヘルパーを使う |
| `TypeError: ctx.amm is undefined` | `beforeEach` が非同期処理を待っていない | `await deployAll()` になっているか確認 |
| `Error: invalid BigNumber value` | 数値を文字列で渡していない | `e18('100')` のように文字列で渡す |
| `Contract not deployed` | `beforeEach` 外でデプロイしている | 必ず `beforeEach` 内で `deployAll()` を呼ぶ |
| `nonce already used` | ローカルノードとの接続が古い | `npx hardhat node` を再起動 |

---

## 10. package.json スクリプト（テスト関連）

```json
{
  "scripts": {
    "test":          "hardhat test",
    "test:amm":      "hardhat test test/AMM.test.ts",
    "test:jpyy":     "hardhat test test/JPYY.test.ts",
    "test:watch":    "hardhat test --watch",
    "test:gas":      "REPORT_GAS=true hardhat test",
    "test:coverage": "hardhat coverage",
    "node":          "hardhat node"
  }
}
```

---

*最終更新: 2026-04-29*
