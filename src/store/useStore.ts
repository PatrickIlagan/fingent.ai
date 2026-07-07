import { create } from 'zustand';

interface AppState {
  themeMode: 'basic' | 'advanced';
  setThemeMode: (mode: 'basic' | 'advanced') => void;
  shouldRefresh: boolean;
  triggerRefresh: () => void;
}

export const useStore = create<AppState>((set) => ({
  themeMode: 'basic',
  setThemeMode: (mode) => set({ themeMode: mode }),
  shouldRefresh: false,
  triggerRefresh: () => set((state) => ({ shouldRefresh: !state.shouldRefresh }))
}));
