import { ethers } from 'ethers';
import { config } from '../config';
import AppState from '../store/AppState';
import type { AgentBalances, PoolState } from '@jpyy/shared';
import ERC20_ABI from './abis/ERC20.json';
import AMM_ABI  from './abis/AMM.json';

// ── シングルトン ──────────────────────────────────────────────
let _provider:    ethers.JsonRpcProvider | null = null;
let _adminSigner: ethers.Wallet | null = null;
let _agentSigner: ethers.Wallet | null = null;  // Option A: インメモリ保持
let _jpyy:        ethers.Contract | null = null;
let _ytt:         ethers.Contract | null = null;
let _amm:         ethers.Contract | null = null;

function init() {
  if (_provider) return;
  _provider    = new ethers.JsonRpcProvider(config.RPC_URL);
  _adminSigner = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, _provider);
  _jpyy = new ethers.Contract(config.JPYY_ADDRESS, ERC20_ABI, _adminSigner);
  _ytt  = new ethers.Contract(config.YTT_ADDRESS,  ERC20_ABI, _adminSigner);
  _amm  = new ethers.Contract(config.AMM_ADDRESS,  AMM_ABI,   _adminSigner);
  // agentAddress は setAgentSigner() で設定する（adminアドレスは設定しない）
}

function u(raw: bigint): number {
  return parseFloat(ethers.formatUnits(raw, 18));
}
function p(n: number): bigint {
  return ethers.parseUnits(n.toFixed(18), 18);
}

// ── ContractClient ────────────────────────────────────────────
export class ContractClient {

  // ── エージェントSigner管理（Option A）────────────────────

  static setAgentSigner(privateKey: string): string {
    if (!_provider) init();
    _agentSigner = new ethers.Wallet(privateKey, _provider!);
    const address = _agentSigner.address;
    AppState.setAgentAddress(address);
    // approve チェックを非同期で実行（完了を待たない）
    _ensureAgentApproval(1, 1).catch(
      e => console.error('[ContractClient] agent approval check failed:', e)
    );
    return address;
  }

  static clearAgentSigner(): void {
    _agentSigner = null;
    AppState.setAgentAddress(null);
  }

  static hasAgentSigner(): boolean {
    return _agentSigner !== null;
  }

  // ── 同期読み取り（AppState キャッシュ）────────────────────

  static getReserves(): { jpyy: number; ytt: number } {
    return { jpyy: AppState.pool.jpyyReserve, ytt: AppState.pool.yttReserve };
  }

  static getAgentBalances(): AgentBalances {
    return { ...AppState.balances };
  }

  static getAmountOut(amountIn: number, tokenIn: 'JPYY' | 'YTT'): number {
    const { jpyy, ytt } = this.getReserves();
    return tokenIn === 'JPYY'
      ? (ytt * amountIn) / (jpyy + amountIn)
      : (jpyy * amountIn) / (ytt + amountIn);
  }

  // ── ダミーモード限定 ───────────────────────────────────────

  static addRandomDrift(): void {
    if (!config.isDummy) return;
    const drift = 1 + (Math.random() - 0.5) * 0.04;
    const newJ  = Math.max(500, AppState.pool.jpyyReserve * drift);
    _updatePool(newJ, AppState.pool.yttReserve);
  }

  // ── チェーン同期（ChainSync から呼び出し）─────────────────

  static async syncFromChain(): Promise<void> {
    if (config.isDummy) return;
    init();
    const [jpyyRaw, yttRaw] = await _amm!.getReserves();
    _updatePool(u(jpyyRaw), u(yttRaw));

    if (AppState.agentAddress) {
      const [jpyyBal, yttBal, polBal] = await Promise.all([
        _jpyy!.balanceOf(AppState.agentAddress),
        _ytt!.balanceOf(AppState.agentAddress),
        _provider!.getBalance(AppState.agentAddress),
      ]);
      _updateBalances({ jpyy: u(jpyyBal), ytt: u(yttBal), pol: u(polBal) });
    }
  }

  // ── エージェントスワップ（async）──────────────────────────
  // agentSigner未設定時はダミー動作（AppState更新のみ・チェーン送信なし）

  static async swapJpyyForYtt(jpyyIn: number): Promise<number> {
    if (config.isDummy || !_agentSigner) {
      const yttOut = this.getAmountOut(jpyyIn, 'JPYY');
      const { jpyy, ytt } = this.getReserves();
      _updatePool(jpyy + jpyyIn, ytt - yttOut);
      _updateBalances({ ...AppState.balances, jpyy: AppState.balances.jpyy - jpyyIn, ytt: AppState.balances.ytt + yttOut });
      return yttOut;
    }

    init();
    await _ensureAgentApproval(jpyyIn, 0);
    const ammAgent = _amm!.connect(_agentSigner) as ethers.Contract;
    const minYtt   = p(this.getAmountOut(jpyyIn, 'JPYY') * 0.95);
    const tx       = await ammAgent.swapJpyyForYtt(p(jpyyIn), minYtt);
    const receipt  = await tx.wait() as ethers.TransactionReceipt;
    const yttOut   = _parseSwapAmountOut(receipt);
    await this.syncFromChain();
    return yttOut;
  }

  static async swapYttForJpyy(yttIn: number): Promise<number> {
    if (config.isDummy || !_agentSigner) {
      const jpyyOut = this.getAmountOut(yttIn, 'YTT');
      const { jpyy, ytt } = this.getReserves();
      _updatePool(jpyy - jpyyOut, ytt + yttIn);
      _updateBalances({ ...AppState.balances, jpyy: AppState.balances.jpyy + jpyyOut, ytt: AppState.balances.ytt - yttIn });
      return jpyyOut;
    }

    init();
    await _ensureAgentApproval(0, yttIn);
    const ammAgent = _amm!.connect(_agentSigner) as ethers.Contract;
    const minJpyy  = p(this.getAmountOut(yttIn, 'YTT') * 0.95);
    const tx       = await ammAgent.swapYttForJpyy(p(yttIn), minJpyy);
    const receipt  = await tx.wait() as ethers.TransactionReceipt;
    const jpyyOut  = _parseSwapAmountOut(receipt);
    await this.syncFromChain();
    return jpyyOut;
  }

  // ── 管理者操作（async）────────────────────────────────────

  static async mintJpyy(to: string, amount: number): Promise<string | null> {
    if (config.isDummy) {
      if (!AppState.agentAddress || to.toLowerCase() === AppState.agentAddress.toLowerCase()) {
        _updateBalances({ ...AppState.balances, jpyy: AppState.balances.jpyy + amount });
      }
      return null;
    }
    init();
    const tx      = await _jpyy!.mint(to, p(amount));
    const receipt = await tx.wait() as ethers.TransactionReceipt;
    return receipt.hash;
  }

  static async addLiquidity(jpyyAmount: number, yttAmount: number): Promise<void> {
    if (config.isDummy) {
      const { jpyy, ytt } = this.getReserves();
      _updatePool(jpyy + jpyyAmount, ytt + yttAmount);
      return;
    }
    init();
    // Admin wallet may have 0 balance — auto-mint needed tokens first
    await _mintToAdminIfNeeded(jpyyAmount, yttAmount);
    await _ensureAdminApproval(jpyyAmount, yttAmount);
    const tx = await _amm!.addLiquidity(p(jpyyAmount), p(yttAmount));
    await tx.wait();
    await this.syncFromChain();
  }

  static async setReserves(jpyyAmount: number, yttAmount: number): Promise<void> {
    if (config.isDummy) {
      _updatePool(jpyyAmount, yttAmount);
      return;
    }
    init();
    // Read on-chain reserves for accuracy
    const [jpyyRaw, yttRaw] = await _amm!.getReserves();
    const curJ = u(jpyyRaw);
    const curY = u(yttRaw);
    const jpyyNeeded = Math.max(0, jpyyAmount - curJ);
    const yttNeeded  = Math.max(0, yttAmount  - curY);
    // Auto-mint tokens to admin if reserves need to increase
    if (jpyyNeeded > 0 || yttNeeded > 0) {
      await _mintToAdminIfNeeded(jpyyNeeded, yttNeeded);
      await _ensureAdminApproval(jpyyNeeded, yttNeeded);
    }
    const tx = await _amm!.setReserves(p(jpyyAmount), p(yttAmount));
    await tx.wait();
    await this.syncFromChain();
  }
}

// ── private helpers ───────────────────────────────────────────

function _updatePool(jpyy: number, ytt: number): void {
  const pool: PoolState = {
    jpyyReserve: Math.max(0.01, jpyy),
    yttReserve:  Math.max(0.0001, ytt),
    price:       Math.max(0.01, jpyy) / Math.max(0.0001, ytt),
  };
  AppState.setPool(pool);
}

function _updateBalances(b: AgentBalances): void {
  AppState.setBalances({ pol: Math.max(0, b.pol), jpyy: Math.max(0, b.jpyy), ytt: Math.max(0, b.ytt) });
}

function _parseSwapAmountOut(receipt: ethers.TransactionReceipt): number {
  const iface = new ethers.Interface(AMM_ABI as string[]);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === 'Swap') return u(parsed.args.amountOut as bigint);
    } catch { /* skip */ }
  }
  return 0;
}

async function _mintToAdminIfNeeded(jpyyNeeded: number, yttNeeded: number): Promise<void> {
  const adminAddr = _adminSigner!.address;
  if (jpyyNeeded > 0) {
    const bal = u(await _jpyy!.balanceOf(adminAddr));
    if (bal < jpyyNeeded) {
      await (await _jpyy!.mint(adminAddr, p(jpyyNeeded - bal + 1))).wait();
    }
  }
  if (yttNeeded > 0) {
    const bal = u(await _ytt!.balanceOf(adminAddr));
    if (bal < yttNeeded) {
      await (await _ytt!.mint(adminAddr, p(yttNeeded - bal + 1))).wait();
    }
  }
}

async function _ensureAdminApproval(jpyyNeeded: number, yttNeeded: number): Promise<void> {
  if (jpyyNeeded > 0) {
    const allowance = await _jpyy!.allowance(await _adminSigner!.getAddress(), config.AMM_ADDRESS);
    if (u(allowance) < jpyyNeeded) {
      await (await _jpyy!.approve(config.AMM_ADDRESS, ethers.MaxUint256)).wait();
    }
  }
  if (yttNeeded > 0) {
    const allowance = await _ytt!.allowance(await _adminSigner!.getAddress(), config.AMM_ADDRESS);
    if (u(allowance) < yttNeeded) {
      await (await _ytt!.approve(config.AMM_ADDRESS, ethers.MaxUint256)).wait();
    }
  }
}

async function _ensureAgentApproval(jpyyNeeded: number, yttNeeded: number): Promise<void> {
  if (!_agentSigner) return;
  const jpyyAgent = _jpyy!.connect(_agentSigner) as ethers.Contract;
  const yttAgent  = _ytt!.connect(_agentSigner)  as ethers.Contract;
  if (jpyyNeeded > 0) {
    const allowance = await _jpyy!.allowance(_agentSigner.address, config.AMM_ADDRESS);
    if (u(allowance) < jpyyNeeded) {
      await (await jpyyAgent.approve(config.AMM_ADDRESS, ethers.MaxUint256)).wait();
    }
  }
  if (yttNeeded > 0) {
    const allowance = await _ytt!.allowance(_agentSigner.address, config.AMM_ADDRESS);
    if (u(allowance) < yttNeeded) {
      await (await yttAgent.approve(config.AMM_ADDRESS, ethers.MaxUint256)).wait();
    }
  }
}
