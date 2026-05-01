import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { stateRoutes } from './routes/state';
import { agentRoutes } from './routes/agent';
import { adminRoutes } from './routes/admin';
import { chainSync } from './contracts/ChainSync';

async function bootstrap() {
  const app = Fastify({ logger: { level: 'warn' } });

  await app.register(cors, { origin: true });

  await app.register(stateRoutes);
  await app.register(agentRoutes, { prefix: '/agent' });
  await app.register(adminRoutes, { prefix: '/admin' });

  app.get('/health', async () => ({ ok: true, mode: config.isDummy ? 'dummy' : 'production' }));

  await app.listen({ port: config.PORT, host: '0.0.0.0' });

  console.log(`✓ JPYY TRADER backend listening on port ${config.PORT}`);
  console.log(`  Mode: ${config.isDummy ? '🟡 DUMMY (blockchain & AI simulated)' : '🟢 PRODUCTION (agent trade enabled)'}`);
  console.log(`  GET  http://localhost:${config.PORT}/api/state`);
  console.log(`  POST http://localhost:${config.PORT}/agent/start`);

  chainSync.start();
}

bootstrap().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
