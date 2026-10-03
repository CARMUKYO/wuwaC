import { create } from 'zustand';

export type Section =
  | 'inventory'
  | 'roster'
  | 'calculator'
  | 'teams'
  | 'builds'
  | 'database';

export const SECTIONS: { id: Section; label: string; blurb: string }[] = [
  { id: 'inventory', label: 'Inventory', blurb: 'Echo gear box' },
  { id: 'roster', label: 'Roster', blurb: 'Resonators' },
  { id: 'calculator', label: 'Calculator', blurb: 'Damage lab' },
  { id: 'teams', label: 'Teams', blurb: 'Trios & buffs' },
  { id: 'builds', label: 'Builds', blurb: 'Saved library' },
  { id: 'database', label: 'Database', blurb: 'Game data' },
];

const SECTION_IDS = new Set<string>(SECTIONS.map((s) => s.id));

/**
 * Parse a section from the URL hash. `#b=` share links are reserved for
 * BuildsPage and never resolve to a section.
 */
export function sectionFromHash(hash: string): Section | null {
  if (hash.startsWith('#b=')) return null;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return SECTION_IDS.has(id) ? (id as Section) : null;
}

function initialSection(): Section {
  if (typeof window === 'undefined') return 'inventory';
  return sectionFromHash(window.location.hash) ?? 'inventory';
}

function syncHash(section: Section): void {
  if (typeof window === 'undefined') return;
  if (window.location.hash === `#${section}`) return;
  window.location.hash = section;
}

interface AppState {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  activeSection: initialSection(),
  setActiveSection: (section) => {
    set({ activeSection: section });
    syncHash(section);
  },
}));

/**
 * One-time wiring so the browser back/forward buttons drive the section.
 * Safe to call repeatedly (StrictMode, tests). Uses a bare setState so a
 * hash change never rewrites the hash it came from.
 */
let routingReady = false;
export function initSectionRouting(): void {
  if (routingReady || typeof window === 'undefined') return;
  routingReady = true;
  window.addEventListener('hashchange', () => {
    const section = sectionFromHash(window.location.hash);
    if (section !== null && section !== useAppStore.getState().activeSection) {
      useAppStore.setState({ activeSection: section });
    }
  });
}
