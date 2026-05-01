import { ContractClient } from './ContractClient';
import { config } from '../config';

const SYNC_INTERVAL_MS = 15_000;

class ChainSync {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (config.isDummy || this.timer) return;
    ContractClient.syncFromChain().catch(e => console.error('[ChainSync] initial sync failed:', e));
    this.timer = setInterval(() => {
      ContractClient.syncFromChain().catch(e => console.error('[ChainSync] sync failed:', e));
    }, SYNC_INTERVAL_MS);
    console.log(`[ChainSync] started (every ${SYNC_INTERVAL_MS / 1000}s)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const chainSync = new ChainSync();
