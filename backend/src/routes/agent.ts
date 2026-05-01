import type { FastifyInstance } from 'fastify';
import AppState from '../store/AppState';
import { agentLoop } from '../agent/AgentLoop';
import type { AgentMode } from '@jpyy/shared';

export async function agentRoutes(app: FastifyInstance) {
  // エージェント状態取得
  app.get('/status', async (_req, reply) => {
    reply.send({
      running:     AppState.running,
      mode:        AppState.mode,
      interval:    AppState.intervalSec,
      tradeAmount: AppState.tradeAmount,
      nextRunIn:   agentLoop.getNextRunIn(),
    });
  });

  // エージェント起動
  app.post('/start', async (_req, reply) => {
    agentLoop.start();
    reply.send({ ok: true, running: AppState.running });
  });

  // エージェント停止
  app.post('/stop', async (_req, reply) => {
    agentLoop.stop();
    reply.send({ ok: true, running: AppState.running });
  });

  // 設定変更
  app.patch('/config', async (req, reply) => {
    const body = req.body as { mode?: AgentMode; interval?: number; tradeAmount?: number };
    if (body.mode      !== undefined) AppState.mode        = body.mode;
    if (body.interval  !== undefined) AppState.intervalSec = body.interval;
    if (body.tradeAmount !== undefined) AppState.tradeAmount = body.tradeAmount;
    reply.send({ ok: true });
  });

  // MetaMask接続通知
  app.post('/connect', async (req, reply) => {
    const body = req.body as { address?: string };
    if (body.address) {
      AppState.setAgentAddress(body.address);
      console.log('[Agent] Wallet connected:', body.address);
    }
    reply.send({ ok: true });
  });

  // MetaMask切断通知
  app.post('/disconnect', async (_req, reply) => {
    if (AppState.running) {
      agentLoop.stop();
    }
    AppState.setAgentAddress(null);
    console.log('[Agent] Wallet disconnected');
    reply.send({ ok: true });
  });
}
