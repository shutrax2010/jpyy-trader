# スマートコントラクト設計書

**対象システム**: JPYY TRADER
**バージョン**: 1.0
**作成日**: 2026-04-29
**ネットワーク**: Polygon Amoy Testnet（chainId: 80002）

---

## 1. ウォレット構成とコントラクトの関係

```
管理者ウォレット（ADMIN_PRIVATE_KEY）
  ├── JPYY.deploy()          コントラクトをデプロイ
  ├── YTT.deploy()
  ├── AMM.deploy()
  ├── JPYY.mint(to, amount)  JPYY発行
  ├── JPYY.transfer(to, amt) JPYY配布
  ├── AMM.addLiquidity()     流動性追加
  └── AMM.setReserves()      価格リバランス

エージェントウォレット（AGENT_PRIVATE_KEY）
  ├── JPYY.approve(AMM, MAX) 初回のみ
  ├── YTT.approve(AMM, MAX)  初回のみ
  ├── AMM.swapJpyyForYtt()   AI判断→BUY
  └── AMM.swapYttForJpyy()   AI判断→SELL
```

---

## 2. コントラクト一覧

| コントラクト | 役割 | 標準 |
|-------------|------|------|
| `JPYY` | 基本通貨トークン（1JPYY=1円） | ERC-20 + Mintable |
| `YTT` | 変動トークン（売買対象） | ERC-20 |
| `AMM` | 自動マーケットメーカー（x×y=k） | カスタム |

---

## 3. JPYY.sol

### 概要

- 1 JPYY = 1円の基本通貨として機能するデモ用ERC-20トークン
- 管理者ウォレットのみが `mint`（発行）できる
- `transfer` は全アドレスで自由に行える

### 実装

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract JPYY is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address admin) ERC20("JPYY Token", "JPYY") {
        // 管理者ウォレットに DEFAULT_ADMIN_ROLE と MINTER_ROLE を付与
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    // 管理者のみが発行可能
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(to, amount);
    }

    // decimals は 18（ERC-20デフォルト）
    // 1 JPYY = 1e18 wei 単位
}
```

### 権限

| 関数 | 呼び出せるウォレット |
|------|-------------------|
| `mint(to, amount)` | 管理者ウォレット（MINTER_ROLE） |
| `transfer(to, amount)` | 全アドレス（ERC-20標準） |
| `approve(spender, amount)` | 全アドレス（エージェントがAMMを承認） |
| `grantRole(role, account)` | 管理者ウォレット（DEFAULT_ADMIN_ROLE） |

---

## 4. YTT.sol

### 概要

- 売買対象の変動トークン
- 初期供給は管理者がmintし、AMM流動性追加時に投入する
- JPYY同様にERC-20だが、mint権限の使用は初期設定時のみ

### 実装

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YTT is ERC20, Ownable {
    constructor(address admin)
        ERC20("YTT Token", "YTT")
        Ownable(admin)
    {}

    // owner（管理者）のみが発行可能
    // 初期流動性追加時に一度だけ使用
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

### 権限

| 関数 | 呼び出せるウォレット |
|------|-------------------|
| `mint(to, amount)` | 管理者ウォレット（owner） |
| `transfer / approve` | 全アドレス（ERC-20標準） |

---

## 5. AMM.sol

### 概要

- JPYY と YTT の 2 トークンペアの自動マーケットメーカー
- **定数積式（x × y = k）** でスワップ価格を決定
- YTTの価格 = `jpyyReserve / yttReserve`（¥/YTT）
- 管理者専用の `setReserves`・`addLiquidity` でプールを直接操作可能（デモ用）

### 実装

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AMM is Ownable {
    IERC20 public immutable jpyy;
    IERC20 public immutable ytt;

    uint256 public jpyyReserve;
    uint256 public yttReserve;

    event Swap(
        address indexed sender,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 newJpyyReserve,
        uint256 newYttReserve
    );
    event LiquidityAdded(uint256 jpyyAmount, uint256 yttAmount);
    event ReservesSet(uint256 jpyyReserve, uint256 yttReserve);

    constructor(address _jpyy, address _ytt, address admin)
        Ownable(admin)
    {
        jpyy = IERC20(_jpyy);
        ytt  = IERC20(_ytt);
    }

    // ── スワップ（エージェントが呼び出す）────────────────

    // JPYY → YTT（BUY）
    function swapJpyyForYtt(uint256 jpyyIn, uint256 minYttOut) external {
        require(jpyyIn > 0, "AMM: zero input");

        uint256 yttOut = getAmountOut(jpyyIn, jpyyReserve, yttReserve);
        require(yttOut >= minYttOut, "AMM: slippage exceeded");
        require(yttOut < yttReserve, "AMM: insufficient YTT reserve");

        jpyy.transferFrom(msg.sender, address(this), jpyyIn);
        ytt.transfer(msg.sender, yttOut);

        jpyyReserve += jpyyIn;
        yttReserve  -= yttOut;

        emit Swap(msg.sender, address(jpyy), jpyyIn, yttOut, jpyyReserve, yttReserve);
    }

    // YTT → JPYY（SELL）
    function swapYttForJpyy(uint256 yttIn, uint256 minJpyyOut) external {
        require(yttIn > 0, "AMM: zero input");

        uint256 jpyyOut = getAmountOut(yttIn, yttReserve, jpyyReserve);
        require(jpyyOut >= minJpyyOut, "AMM: slippage exceeded");
        require(jpyyOut < jpyyReserve, "AMM: insufficient JPYY reserve");

        ytt.transferFrom(msg.sender, address(this), yttIn);
        jpyy.transfer(msg.sender, jpyyOut);

        yttReserve  += yttIn;
        jpyyReserve -= jpyyOut;

        emit Swap(msg.sender, address(ytt), yttIn, jpyyOut, jpyyReserve, yttReserve);
    }

    // ── 価格計算（x × y = k、手数料なし）────────────────

    // amountOut = (amountIn × reserveOut) / (reserveIn + amountIn)
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "AMM: invalid reserves");
        return (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    // 現在のYTT価格（¥単位、小数点18桁）
    // = jpyyReserve × 1e18 / yttReserve
    function getYttPrice() external view returns (uint256) {
        require(yttReserve > 0, "AMM: no YTT reserve");
        return (jpyyReserve * 1e18) / yttReserve;
    }

    // プール残高を返す
    function getReserves() external view returns (uint256, uint256) {
        return (jpyyReserve, yttReserve);
    }

    // ── 管理者専用（管理画面から呼び出す）────────────────

    // 流動性追加（現在の比率に合わせて両トークンを投入）
    function addLiquidity(uint256 jpyyAmount, uint256 yttAmount)
        external
        onlyOwner
    {
        jpyy.transferFrom(msg.sender, address(this), jpyyAmount);
        ytt.transferFrom(msg.sender, address(this), yttAmount);

        jpyyReserve += jpyyAmount;
        yttReserve  += yttAmount;

        emit LiquidityAdded(jpyyAmount, yttAmount);
    }

    // プール残高を直接設定（価格リバランス用・デモ専用機能）
    // ※ k定数が変わるため本番環境では使用しない
    function setReserves(uint256 _jpyyReserve, uint256 _yttReserve)
        external
        onlyOwner
    {
        require(_jpyyReserve > 0 && _yttReserve > 0, "AMM: zero reserve");

        // 超過分または不足分のトークンを調整
        _adjustReserve(jpyy, jpyyReserve, _jpyyReserve);
        _adjustReserve(ytt,  yttReserve,  _yttReserve);

        jpyyReserve = _jpyyReserve;
        yttReserve  = _yttReserve;

        emit ReservesSet(_jpyyReserve, _yttReserve);
    }

    function _adjustReserve(
        IERC20 token,
        uint256 current,
        uint256 target
    ) internal {
        if (target > current) {
            // 不足分を管理者から受け取る
            token.transferFrom(msg.sender, address(this), target - current);
        } else if (current > target) {
            // 超過分を管理者に返す
            token.transfer(msg.sender, current - target);
        }
    }
}
```

### 関数一覧

| 関数 | 呼び出し元 | 説明 |
|------|----------|------|
| `swapJpyyForYtt(jpyyIn, minYttOut)` | エージェント | BUY（JPYY→YTT） |
| `swapYttForJpyy(yttIn, minJpyyOut)` | エージェント | SELL（YTT→JPYY） |
| `getAmountOut(amountIn, rIn, rOut)` | 誰でも | スワップ出力量の計算 |
| `getYttPrice()` | 誰でも | YTT現在価格（¥×1e18） |
| `getReserves()` | 誰でも | プール残高を返す |
| `addLiquidity(jpyy, ytt)` | **管理者のみ** | 流動性追加 |
| `setReserves(jpyy, ytt)` | **管理者のみ** | 価格リバランス（デモ専用） |

---

## 6. デプロイ手順

### 6.1 hardhat.config.ts

```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    amoy: {
      url:      process.env.RPC_URL ?? '',
      accounts: [process.env.ADMIN_PRIVATE_KEY ?? ''],  // 管理者ウォレットのみ
    },
  },
};
export default config;
```

### 6.2 scripts/deploy.ts

```typescript
import { ethers } from 'hardhat';

async function main() {
  const [admin] = await ethers.getSigners();
  console.log('Deploying with admin:', admin.address);

  // 1. JPYY デプロイ
  const JPYYFactory = await ethers.getContractFactory('JPYY');
  const jpyy = await JPYYFactory.deploy(admin.address);
  await jpyy.waitForDeployment();
  console.log('JPYY_ADDRESS=', await jpyy.getAddress());

  // 2. YTT デプロイ
  const YTTFactory = await ethers.getContractFactory('YTT');
  const ytt = await YTTFactory.deploy(admin.address);
  await ytt.waitForDeployment();
  console.log('YTT_ADDRESS=', await ytt.getAddress());

  // 3. AMM デプロイ
  const AMMFactory = await ethers.getContractFactory('AMM');
  const amm = await AMMFactory.deploy(
    await jpyy.getAddress(),
    await ytt.getAddress(),
    admin.address
  );
  await amm.waitForDeployment();
  console.log('AMM_ADDRESS=', await amm.getAddress());

  // 4. 初期流動性を投入（JPYY=10,000 / YTT=100 → YTT初期価格 ¥100）
  const jpyyInit = ethers.parseUnits('10000', 18);
  const yttInit  = ethers.parseUnits('100',   18);

  await jpyy.mint(admin.address, jpyyInit);
  await ytt.mint(admin.address,  yttInit);
  await jpyy.approve(await amm.getAddress(), jpyyInit);
  await ytt.approve(await amm.getAddress(),  yttInit);
  await amm.addLiquidity(jpyyInit, yttInit);
  console.log('✓ Initial liquidity added: JPYY=10,000 / YTT=100 → ¥100/YTT');

  // 5. エージェントに JPYY を配布（初期売買資金）
  const agentAddress = process.env.AGENT_ADDRESS!;
  const agentJpyy    = ethers.parseUnits('50000', 18);
  await jpyy.mint(agentAddress, agentJpyy);
  console.log('✓ Agent JPYY minted: ¥50,000 →', agentAddress);
}

main().catch(console.error);
```

### 6.3 scripts/setup-agent.ts（エージェントのApprove）

```typescript
import { ethers } from 'ethers';
import 'dotenv/config';
import JPYY_ABI from '../src/contracts/abis/JPYY.json';
import YTT_ABI  from '../src/contracts/abis/YTT.json';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const agent    = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

  const jpyy = new ethers.Contract(process.env.JPYY_ADDRESS!, JPYY_ABI, agent);
  const ytt  = new ethers.Contract(process.env.YTT_ADDRESS!,  YTT_ABI,  agent);

  await (await jpyy.approve(process.env.AMM_ADDRESS!, ethers.MaxUint256)).wait();
  await (await ytt.approve(process.env.AMM_ADDRESS!,  ethers.MaxUint256)).wait();
  console.log('✓ Agent approvals complete');
}

main().catch(console.error);
```

---

## 7. 初期状態まとめ

デプロイ直後の状態:

| 項目 | 値 |
|------|---|
| AMMプール JPYY残高 | 10,000 JPYY |
| AMMプール YTT残高 | 100 YTT |
| YTT初期価格 | ¥100 / YTT |
| k定数 | 1,000,000 |
| エージェント JPYY残高 | 50,000 JPYY |
| エージェント YTT残高 | 0 YTT（売買で増減） |

---

## 8. セキュリティ考慮事項

- `setReserves` はデモ専用機能。k定数が変わるため本番環境では削除する
- `ADMIN_PRIVATE_KEY`・`AGENT_PRIVATE_KEY` は `.gitignore` 済みの `.env` にのみ記載
- Amoy Testnet のため実資産リスクはないが、秘密鍵は本番ウォレットと共用しない
- エージェントウォレットの残高はデモ用の必要最小限（¥50,000相当）にとどめる

---

*最終更新: 2026-04-29*
