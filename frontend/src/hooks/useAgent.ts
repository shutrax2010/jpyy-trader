import type { AgentMode } from '@/types';

// 実バックエンド: NEXT_PUBLIC_API_URL=http://localhost:3001 → /agent/start
// モック(Next.js API Routes): 未設定 → /api/agent/start
function buildPath(path: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return apiUrl ? `${apiUrl}${path}` : `/api${path}`;
}

export function useAgent() {
  async function post(path: string, body?: object) {
    const res = await fetch(buildPath(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async function patch(path: string, body: object) {
    const res = await fetch(buildPath(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  return {
    start:        () => post('/agent/start'),
    stop:         () => post('/agent/stop'),
    connect:      (address: string) => post('/agent/connect', { address }),
    disconnect:   () => post('/agent/disconnect'),
    updateConfig: (mode: AgentMode, interval: number, tradeAmount: number) =>
      patch('/agent/config', { mode, interval, tradeAmount }),
  };
}
