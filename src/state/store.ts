import { create } from 'zustand';

export type Section =
  | 'inventory'
  | 'roster'
  | 'calculator'
  | 'teams'
  | 'builds'
  | 'database';

interface AppState {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  activeSection: 'inventory',
  setActiveSection: (section) => set({ activeSection: section }),
}));
