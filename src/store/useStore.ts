import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AccentColor = 'emerald' | 'ocean' | 'violet' | 'sunset';

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
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  hiddenTabs: string[];
  toggleTabVisibility: (tabId: string) => void;
  shouldRefresh: boolean;
  triggerRefresh: () => void;
  selectedBusiness: BusinessData | null;
  setSelectedBusiness: (b: BusinessData | null) => void;
  selectedFreelance: any | null;
  setSelectedFreelance: (f: any | null) => void;
  /** Goal to open when Plans is shown next (set from the Calendar). */
  focusGoalId: number | null;
  setFocusGoalId: (id: number | null) => void;
}

export const useStore = create<AppState>()(persist((set) => ({
  themeMode: 'basic',
  setThemeMode: (mode) => set({ themeMode: mode }),
  accentColor: 'emerald',
  setAccentColor: (color) => set({ accentColor: color }),
  hiddenTabs: [],
  toggleTabVisibility: (tabId) => set((state) => ({ hiddenTabs: state.hiddenTabs.includes(tabId) ? state.hiddenTabs.filter(id => id !== tabId) : [...state.hiddenTabs, tabId] })),
  shouldRefresh: false,
  triggerRefresh: () => set((state) => ({ shouldRefresh: !state.shouldRefresh })),
  selectedBusiness: null,
  setSelectedBusiness: (b) => set({ selectedBusiness: b }),
  selectedFreelance: null,
  setSelectedFreelance: (f) => set({ selectedFreelance: f }),
  focusGoalId: null,
  setFocusGoalId: (id) => set({ focusGoalId: id }),
}), {
  name: 'fingent-preferences',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ themeMode: state.themeMode, accentColor: state.accentColor, hiddenTabs: state.hiddenTabs })
}));
