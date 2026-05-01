import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import type { JPYY, YTT, AMM } from '../typechain-types';

// BigInt 平方根（k 維持テスト用）
function sqrtBigInt(n: bigint): bigint {
  if (n === 0n) return 0n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (y + n / y) / 2n; }
  return x;
}

describe('JPYY', function () {
  let jpyy: JPYY;
  let admin: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async function () {
    [admin, other] = await ethers.getSigners();
    const F = await ethers.getContractFactory('JPYY');
    jpyy = await F.deploy(admin.address);
  });

  it('admin が mint できる', async function () {
    await jpyy.mint(other.address, ethers.parseUnits('1000', 18));
    expect(await jpyy.balanceOf(other.address)).to.equal(ethers.parseUnits('1000', 18));
  });

  it('non-admin は mint できない', async function () {
    await expect(jpyy.connect(other).mint(other.address, 1n)).to.be.reverted;
  });
});

describe('YTT', function () {
  let ytt: YTT;
  let admin: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async function () {
    [admin, other] = await ethers.getSigners();
    const F = await ethers.getContractFactory('YTT');
    ytt = await F.deploy(admin.address);
  });

  it('owner が mint できる', async function () {
    await ytt.mint(other.address, ethers.parseUnits('100', 18));
    expect(await ytt.balanceOf(other.address)).to.equal(ethers.parseUnits('100', 18));
  });

  it('non-owner は mint できない', async function () {
    await expect(ytt.connect(other).mint(other.address, 1n)).to.be.reverted;
  });
});

describe('AMM', function () {
  let jpyy: JPYY;
  let ytt: YTT;
  let amm: AMM;
  let admin: HardhatEthersSigner;
  let agent: HardhatEthersSigner;

  // 初期値（1e18 スケール）
  const JPYY_INIT = ethers.parseUnits('10000', 18); // ¥10,000
  const YTT_INIT  = ethers.parseUnits('100',   18); // 100 YTT → ¥100/YTT
  const AGENT_JPYY = ethers.parseUnits('50000', 18);

  beforeEach(async function () {
    [admin, agent] = await ethers.getSigners();

    const JF = await ethers.getContractFactory('JPYY');
    jpyy = await JF.deploy(admin.address);

    const YF = await ethers.getContractFactory('YTT');
    ytt = await YF.deploy(admin.address);

    const AF = await ethers.getContractFactory('AMM');
    amm = await AF.deploy(await jpyy.getAddress(), await ytt.getAddress(), admin.address);

    const ammAddr = await amm.getAddress();

    // admin: 初期流動性を投入
    await jpyy.mint(admin.address, JPYY_INIT);
    await ytt.mint(admin.address,  YTT_INIT);
    await jpyy.approve(ammAddr, ethers.MaxUint256);
    await ytt.approve(ammAddr,  ethers.MaxUint256);
    await amm.addLiquidity(JPYY_INIT, YTT_INIT);

    // agent: JPYY を付与して AMM を approve
    await jpyy.mint(agent.address, AGENT_JPYY);
    await jpyy.connect(agent).approve(ammAddr, ethers.MaxUint256);
    await ytt.connect(agent).approve(ammAddr,  ethers.MaxUint256);
  });

  // ── 初期状態 ────────────────────────────────────────────

  describe('初期状態', function () {
    it('リザーブが正しい', async function () {
      const [j, y] = await amm.getReserves();
      expect(j).to.equal(JPYY_INIT);
      expect(y).to.equal(YTT_INIT);
    });

    it('YTT 初期価格が ¥100（1e18 スケール）', async function () {
      expect(await amm.getYttPrice()).to.equal(ethers.parseUnits('100', 18));
    });
  });

  // ── getAmountOut ─────────────────────────────────────────

  describe('getAmountOut', function () {
    it('x×y=k 定数積式が正しい', async function () {
      // amountOut = (amountIn × reserveOut) / (reserveIn + amountIn)
      const amountIn  = ethers.parseUnits('1000', 18);
      const reserveIn  = JPYY_INIT;
      const reserveOut = YTT_INIT;
      const expected   = (amountIn * reserveOut) / (reserveIn + amountIn);
      expect(await amm.getAmountOut(amountIn, reserveIn, reserveOut)).to.equal(expected);
    });

    it('amountIn=0 でリバート', async function () {
      await expect(amm.getAmountOut(0n, JPYY_INIT, YTT_INIT)).to.be.revertedWith('AMM: invalid reserves');
    });
  });

  // ── BUY（JPYY→YTT） ──────────────────────────────────────

  describe('swapJpyyForYtt（BUY）', function () {
    it('正しい量の YTT を受け取る', async function () {
      const jpyyIn     = ethers.parseUnits('1000', 18);
      const [j, y]     = await amm.getReserves();
      const expectedYtt = await amm.getAmountOut(jpyyIn, j, y);

      const before = await ytt.balanceOf(agent.address);
      await amm.connect(agent).swapJpyyForYtt(jpyyIn, 0n);
      const after = await ytt.balanceOf(agent.address);

      expect(after - before).to.equal(expectedYtt);
    });

    it('スワップ後にリザーブが更新される', async function () {
      const jpyyIn = ethers.parseUnits('1000', 18);
      const [j0, y0] = await amm.getReserves();
      const yttOut = await amm.getAmountOut(jpyyIn, j0, y0);

      await amm.connect(agent).swapJpyyForYtt(jpyyIn, 0n);
      const [j1, y1] = await amm.getReserves();

      expect(j1).to.equal(j0 + jpyyIn);
      expect(y1).to.equal(y0 - yttOut);
    });

    it('スリッページ超過でリバート', async function () {
      const jpyyIn   = ethers.parseUnits('1000', 18);
      const tooMuch  = ethers.parseUnits('100', 18); // プール全量を超える
      await expect(amm.connect(agent).swapJpyyForYtt(jpyyIn, tooMuch))
        .to.be.revertedWith('AMM: slippage exceeded');
    });

    it('amountIn=0 でリバート', async function () {
      await expect(amm.connect(agent).swapJpyyForYtt(0n, 0n))
        .to.be.revertedWith('AMM: zero input');
    });

    it('BUY 後に YTT 価格が上昇する', async function () {
      const priceBefore = await amm.getYttPrice();
      await amm.connect(agent).swapJpyyForYtt(ethers.parseUnits('1000', 18), 0n);
      const priceAfter = await amm.getYttPrice();
      expect(priceAfter).to.be.gt(priceBefore);
    });
  });

  // ── SELL（YTT→JPYY） ─────────────────────────────────────

  describe('swapYttForJpyy（SELL）', function () {
    beforeEach(async function () {
      // SELL テスト前に YTT を入手
      await amm.connect(agent).swapJpyyForYtt(ethers.parseUnits('1000', 18), 0n);
    });

    it('正しい量の JPYY を受け取る', async function () {
      const yttIn      = await ytt.balanceOf(agent.address);
      const [j, y]     = await amm.getReserves();
      const expectedJ  = await amm.getAmountOut(yttIn, y, j);

      const before = await jpyy.balanceOf(agent.address);
      await amm.connect(agent).swapYttForJpyy(yttIn, 0n);
      const after  = await jpyy.balanceOf(agent.address);

      expect(after - before).to.equal(expectedJ);
    });

    it('SELL 後に YTT 価格が下落する', async function () {
      const priceBefore = await amm.getYttPrice();
      const yttIn       = await ytt.balanceOf(agent.address);
      await amm.connect(agent).swapYttForJpyy(yttIn, 0n);
      const priceAfter  = await amm.getYttPrice();
      expect(priceAfter).to.be.lt(priceBefore);
    });
  });

  // ── addLiquidity ─────────────────────────────────────────

  describe('addLiquidity', function () {
    it('リザーブが増える', async function () {
      const add = ethers.parseUnits('5000', 18);
      await jpyy.mint(admin.address, add);
      await ytt.mint(admin.address, ethers.parseUnits('50', 18));

      const [j0, y0] = await amm.getReserves();
      await amm.addLiquidity(add, ethers.parseUnits('50', 18));
      const [j1, y1] = await amm.getReserves();

      expect(j1).to.equal(j0 + add);
      expect(y1).to.equal(y0 + ethers.parseUnits('50', 18));
    });

    it('non-owner でリバート', async function () {
      await expect(amm.connect(agent).addLiquidity(1n, 1n)).to.be.reverted;
    });
  });

  // ── setReserves ──────────────────────────────────────────

  describe('setReserves', function () {
    it('直接価格設定: ¥100 → ¥150', async function () {
      // JPYY 15000 / YTT 100 → ¥150
      const newJpyy = ethers.parseUnits('15000', 18);
      const newYtt  = YTT_INIT;
      await jpyy.mint(admin.address, ethers.parseUnits('5000', 18));
      await amm.setReserves(newJpyy, newYtt);
      expect(await amm.getYttPrice()).to.equal(ethers.parseUnits('150', 18));
    });

    it('直接価格設定: ¥100 → ¥80（リザーブ削減）', async function () {
      // JPYY 8000 / YTT 100 → ¥80（管理者に 2000 JPYY が戻る）
      const newJpyy = ethers.parseUnits('8000', 18);
      await amm.setReserves(newJpyy, YTT_INIT);
      expect(await amm.getYttPrice()).to.equal(ethers.parseUnits('80', 18));
    });

    it('k 維持 +20%: sqrt 計算で正しい価格になる', async function () {
      const [j, y] = await amm.getReserves();
      const k = j * y;
      const targetPrice18 = (ethers.parseUnits('100', 18) * 120n) / 100n; // +20%

      // newJpyy = sqrt(targetPrice * k / 1e18), newYtt = sqrt(k * 1e18 / targetPrice)
      const newJpyy = sqrtBigInt((targetPrice18 * k) / (10n ** 18n));
      const newYtt  = sqrtBigInt((k * (10n ** 18n)) / targetPrice18);

      // 差分の JPYY を admin にミント（setReserves が transferFrom する）
      const diff = newJpyy > j ? newJpyy - j : 0n;
      if (diff > 0n) await jpyy.mint(admin.address, diff);

      await amm.setReserves(newJpyy, newYtt);
      const price = await amm.getYttPrice();

      // 整数丸め誤差を許容（±0.01%）
      const expected = targetPrice18;
      const tolerance = expected / 10000n;
      expect(price).to.be.within(expected - tolerance, expected + tolerance);
    });

    it('non-owner でリバート', async function () {
      await expect(amm.connect(agent).setReserves(1n, 1n)).to.be.reverted;
    });

    it('ゼロリザーブでリバート', async function () {
      await expect(amm.setReserves(0n, YTT_INIT)).to.be.revertedWith('AMM: zero reserve');
    });
  });
});
