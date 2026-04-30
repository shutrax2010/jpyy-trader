import { create } from 'zustand';
import type { AppState } from '@/types';

interface TradingStore {
  state: AppState | null;
  isLoading: boolean;
  setState: (s: AppState) => void;
  setLoading: (v: boolean) => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  state: null,
  isLoading: true,
  setState: (s) => set({ state: s, isLoading: false }),
  setLoading: (v) => set({ isLoading: v }),
}));
