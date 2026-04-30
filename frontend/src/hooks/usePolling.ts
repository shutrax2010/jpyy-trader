import { useEffect, useCallback } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import type { AppState } from '@/types';

const INTERVAL_MS = 5000;

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? '';
}

export function usePolling() {
  const { setState, setLoading } = useTradingStore();

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppState = await res.json();
      setState(data);
    } catch (err) {
      console.error('[usePolling] fetch error:', err);
      setLoading(false);
    }
  }, [setState, setLoading]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchState]);

  return { refetch: fetchState };
}
