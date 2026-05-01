import { ContractClient } from '../contracts/ContractClient';
import type { TxResult } from '@jpyy/shared';

const SLIPPAGE = 0.95;

function fakeTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export class TradeExecutor {
  static async execute(
    action: 'BUY' | 'SELL',
    amountJpyy: number,
    currentPrice: number
  ): Promise<TxResult> {
    const ts = new Date().toISOString();

    if (action === 'BUY') {
      const expectedYtt = ContractClient.getAmountOut(amountJpyy, 'JPYY');
      const minYtt      = expectedYtt * SLIPPAGE;

      const yttOut = await ContractClient.swapJpyyForYtt(amountJpyy);
      if (yttOut < minYtt) throw new Error('スリッページ超過');

      return {
        hash:      fakeTxHash(),
        action:    'BUY',
        amountIn:  amountJpyy,
        tokenIn:   'JPYY',
        amountOut: parseFloat(yttOut.toFixed(6)),
        tokenOut:  'YTT',
        status:    'confirmed',
        ts,
      };
    } else {
      const yttIn        = amountJpyy / currentPrice;
      const expectedJpyy = ContractClient.getAmountOut(yttIn, 'YTT');
      const minJpyy      = expectedJpyy * SLIPPAGE;

      const jpyyOut = await ContractClient.swapYttForJpyy(yttIn);
      if (jpyyOut < minJpyy) throw new Error('スリッページ超過');

      return {
        hash:      fakeTxHash(),
        action:    'SELL',
        amountIn:  parseFloat(yttIn.toFixed(6)),
        tokenIn:   'YTT',
        amountOut: parseFloat(jpyyOut.toFixed(2)),
        tokenOut:  'JPYY',
        status:    'confirmed',
        ts,
      };
    }
  }
}
