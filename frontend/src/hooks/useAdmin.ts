// 実バックエンド: NEXT_PUBLIC_API_URL=http://localhost:3001 → /admin/mint など
// モック: 未設定 → /api/admin/mint など
function buildPath(path: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return apiUrl ? `${apiUrl}/admin${path}` : `/api/admin${path}`;
}

async function post(path: string, body: object) {
  const res = await fetch(buildPath(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path: string) {
  const res = await fetch(buildPath(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function del(path: string) {
  const res = await fetch(buildPath(path), { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useAdmin() {
  return {
    mint:         (amount: number, to?: string)                           => post('/mint',       { amount, to }),
    distribute:   (addresses: string[], amountEach: number)               => post('/distribute', { addresses, amountEach }),
    addLiquidity: (jpyyAmount: number, yttAmount: number)                 => post('/liquidity',  { jpyyAmount, yttAmount }),
    setPrice:     (targetPrice: number, yttReserve: number)               => post('/price',      { targetPrice, yttReserve }),
    adjustPrice:  (direction: 'up' | 'down' | 'bigUp' | 'bigDown')       => post('/price-adjust', { direction }),
    getLogs:      ()                                                       => get('/logs'),
    setAgentKey:  (privateKey: string)                                    => post('/agent-key',  { privateKey }),
    clearAgentKey: ()                                                      => del('/agent-key'),
  };
}
