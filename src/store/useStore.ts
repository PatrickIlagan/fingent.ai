import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { rewardSummary } from '../lib/rewards';

export type AccentColor = 'emerald' | 'ocean' | 'violet' | 'sunset' | 'mango' | 'sakura' | 'matcha' | 'midnight';
export type RewardsSnapshot = ReturnType<typeof rewardSummary>;

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
  /** Master switch for suggestions, insights, and optional Gemini help. */
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
  suggestionsEnabled: boolean;
  setSuggestionsEnabled: (enabled: boolean) => void;
  /** Opt-in: send generic, anonymous facts to Gemini (with the user's own key) for one extra tip. */
  geminiSuggestions: boolean;
  setGeminiSuggestions: (enabled: boolean) => void;
  dismissedSuggestions: string[];
  dismissSuggestion: (id: string) => void;
  restoreSuggestions: () => void;
  /** Latest Ipon summary, refreshed after changes. */
  rewards: RewardsSnapshot | null;
  setRewards: (rewards: RewardsSnapshot | null) => void;
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
  aiEnabled: true,
  setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
  suggestionsEnabled: true,
  setSuggestionsEnabled: (enabled) => set({ suggestionsEnabled: enabled }),
  geminiSuggestions: false,
  setGeminiSuggestions: (enabled) => set({ geminiSuggestions: enabled }),
  dismissedSuggestions: [],
  restoreSuggestions: () => set({ dismissedSuggestions: [] }),
  rewards: null,
  setRewards: (rewards) => set({ rewards }),
  dismissSuggestion: (id) => set((state) => ({ dismissedSuggestions: [...state.dismissedSuggestions.filter(item => item !== id), id].slice(-200) })),
}), {
  name: 'fingent-preferences',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ themeMode: state.themeMode, accentColor: state.accentColor, hiddenTabs: state.hiddenTabs, aiEnabled: state.aiEnabled, suggestionsEnabled: state.suggestionsEnabled, geminiSuggestions: state.geminiSuggestions, dismissedSuggestions: state.dismissedSuggestions })
}));
