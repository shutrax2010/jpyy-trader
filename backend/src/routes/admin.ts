import type { FastifyInstance } from 'fastify';
import { ContractClient } from '../contracts/ContractClient';
import AppState from '../store/AppState';

export async function adminRoutes(app: FastifyInstance) {
  // JPYY 発行
  app.post('/mint', async (req, reply) => {
    const { amount, to } = req.body as { amount: number; to?: string };
    const target = to ?? AppState.agentAddress ?? '';
    try {
      const txHash = await ContractClient.mintJpyy(target, amount);
      AppState.pushAdminLog({ action: 'mint', params: { amount, to: target }, status: 'success' });
      reply.send({ ok: true, txHash });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      AppState.pushAdminLog({ action: 'mint', params: { amount, to: target }, status: 'failed', error });
      reply.status(500).send({ error });
    }
  });

  // JPYY 配布
  app.post('/distribute', async (req, reply) => {
    const { addresses, amountEach } = req.body as { addresses: string[]; amountEach: number };
    try {
      for (const addr of addresses) {
        await ContractClient.mintJpyy(addr, amountEach);
      }
      AppState.pushAdminLog({ action: 'distribute', params: { addresses, amountEach }, status: 'success' });
      reply.send({ ok: true });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      AppState.pushAdminLog({ action: 'distribute', params: { addresses, amountEach }, status: 'failed', error });
      reply.status(500).send({ error });
    }
  });

  // 流動性追加
  app.post('/liquidity', async (req, reply) => {
    const { jpyyAmount, yttAmount } = req.body as { jpyyAmount: number; yttAmount: number };
    try {
      await ContractClient.addLiquidity(jpyyAmount, yttAmount);
      AppState.pushAdminLog({ action: 'addLiquidity', params: { jpyyAmount, yttAmount }, status: 'success' });
      reply.send({ ok: true, pool: AppState.pool });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      AppState.pushAdminLog({ action: 'addLiquidity', params: { jpyyAmount, yttAmount }, status: 'failed', error });
      reply.status(500).send({ error });
    }
  });

  // YTT 価格設定（setReserves）
  app.post('/price', async (req, reply) => {
    const { targetPrice, yttReserve } = req.body as { targetPrice: number; yttReserve: number };
    const jpyyReserve = targetPrice * yttReserve;
    try {
      await ContractClient.setReserves(jpyyReserve, yttReserve);
      AppState.pushAdminLog({ action: 'setPrice', params: { targetPrice, yttReserve, jpyyReserve }, status: 'success' });
      reply.send({ ok: true, pool: AppState.pool });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      AppState.pushAdminLog({ action: 'setPrice', params: { targetPrice, yttReserve }, status: 'failed', error });
      reply.status(500).send({ error });
    }
  });

  // 価格ワンクリック調整（k維持: newJ = √(P'k), newY = √(k/P')）
  app.post('/price-adjust', async (req, reply) => {
    const { direction } = req.body as { direction: 'up' | 'down' | 'bigUp' | 'bigDown' };
    const multipliers = { up: 1.05, down: 0.95, bigUp: 1.20, bigDown: 0.80 } as const;
    const m = multipliers[direction];
    if (!m) return reply.status(400).send({ error: 'invalid direction' });

    const { jpyyReserve, yttReserve, price } = AppState.pool;
    const k           = jpyyReserve * yttReserve;
    const targetPrice = price * m;
    const newJpyy     = Math.sqrt(targetPrice * k);
    const newYtt      = Math.sqrt(k / targetPrice);

    try {
      await ContractClient.setReserves(newJpyy, newYtt);
      AppState.pushAdminLog({ action: 'adjustPrice', params: { direction, before: price.toFixed(2), after: targetPrice.toFixed(2) }, status: 'success' });
      reply.send({ ok: true, pool: AppState.pool });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      AppState.pushAdminLog({ action: 'adjustPrice', params: { direction }, status: 'failed', error });
      reply.status(500).send({ error });
    }
  });

  // エージェント秘密鍵設定
  app.post('/agent-key', { logLevel: 'warn' }, async (req, reply) => {
    const { privateKey } = req.body as { privateKey?: string };
    if (!privateKey) return reply.status(400).send({ error: '秘密鍵が必要です' });
    if (AppState.running) return reply.status(400).send({ error: 'エージェントが稼働中です。先に停止してください。' });
    try {
      const address = ContractClient.setAgentSigner(privateKey);
      AppState.pushAdminLog({ action: 'setAgentKey', params: { address }, status: 'success' });
      reply.send({ ok: true, address });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      reply.status(400).send({ error: `秘密鍵が無効です: ${error}` });
    }
  });

  // エージェント秘密鍵クリア
  app.delete('/agent-key', async (_req, reply) => {
    if (AppState.running) return reply.status(400).send({ error: 'エージェントが稼働中です。先に停止してください。' });
    ContractClient.clearAgentSigner();
    AppState.pushAdminLog({ action: 'clearAgentKey', params: {}, status: 'success' });
    reply.send({ ok: true });
  });

  // 操作ログ取得
  app.get('/logs', async (_req, reply) => {
    reply.send({ logs: AppState.adminLogs });
  });
}
