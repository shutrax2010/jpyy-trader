import type { FastifyInstance } from 'fastify';
import AppState from '../store/AppState';
import { agentLoop } from '../agent/AgentLoop';

export async function stateRoutes(app: FastifyInstance) {
  app.get('/api/state', async (_req, reply) => {
    reply.send({
      agent: {
        address:     AppState.agentAddress ?? '',
        running:     AppState.running,
        mode:        AppState.mode,
        interval:    AppState.intervalSec,
        tradeAmount: AppState.tradeAmount,
        nextRunIn:   agentLoop.getNextRunIn(),
      },
      balances:     AppState.balances,
      pool:         AppState.pool,
      priceHistory: AppState.priceHistory.slice(-20),
      lastDecision: AppState.lastDecision,
      txHistory:    AppState.txHistory.slice(0, 20),
      lastError:    AppState.lastError,
    });
  });
}
