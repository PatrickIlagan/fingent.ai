import { create } from 'zustand';

export interface BusinessData {
  id: number;
  name: string;
  type: string;
  status: string;
  mrr: number;
  growth: number;
  customers: number;
  target: number;
}

interface AppState {
  themeMode: 'basic' | 'advanced';
  setThemeMode: (mode: 'basic' | 'advanced') => void;
  shouldRefresh: boolean;
  triggerRefresh: () => void;
  selectedBusiness: BusinessData | null;
  setSelectedBusiness: (b: BusinessData | null) => void;
  selectedFreelance: any | null;
  setSelectedFreelance: (f: any | null) => void;
}

export const useStore = create<AppState>((set) => ({
  themeMode: 'basic',
  setThemeMode: (mode) => set({ themeMode: mode }),
  shouldRefresh: false,
  triggerRefresh: () => set((state) => ({ shouldRefresh: !state.shouldRefresh })),
  selectedBusiness: null,
  setSelectedBusiness: (b) => set({ selectedBusiness: b }),
  selectedFreelance: null,
  setSelectedFreelance: (f) => set({ selectedFreelance: f }),
}));
