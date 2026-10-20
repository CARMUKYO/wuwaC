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

/** Share links (`#b=<payload>`) open the Builds section; BuildsPage previews them. */
export function isShareHash(hash: string): boolean {
  return hash.startsWith('#b=');
}

/** Parse a section from the URL hash. A `#b=` share link resolves to Builds. */
export function sectionFromHash(hash: string): Section | null {
  if (isShareHash(hash)) return 'builds';
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return SECTION_IDS.has(id) ? (id as Section) : null;
}

function currentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash;
}

function syncHash(section: Section): void {
  if (typeof window === 'undefined') return;
  if (window.location.hash === `#${section}`) return;
  // An unresolved share link stays in the URL until BuildsPage resolves it.
  if (section === 'builds' && isShareHash(window.location.hash)) return;
  window.location.hash = section;
}

interface AppState {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  /** Pending `#b=` share link awaiting the user's Import / Dismiss. */
  shareLink: string | null;
  /** Forget the pending link and leave the URL at `#builds` (reload stays on Builds). */
  resolveShareLink: () => void;
}

const initialHash = currentHash();

export const useAppStore = create<AppState>()((set) => ({
  activeSection: sectionFromHash(initialHash) ?? 'inventory',
  setActiveSection: (section) => {
    set({ activeSection: section });
    syncHash(section);
  },
  shareLink: isShareHash(initialHash) ? initialHash : null,
  resolveShareLink: () => {
    set({ shareLink: null });
    if (typeof window !== 'undefined' && isShareHash(window.location.hash)) {
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, '', `${pathname}${search}#builds`);
    }
  },
}));

/**
 * One-time wiring so the browser back/forward buttons drive the section.
 * Safe to call repeatedly (StrictMode, tests). Uses a bare setState so a
 * hash change never rewrites the hash it came from. A share link pasted
 * into a running app is captured the same way as one opened cold.
 */
let routingReady = false;
export function initSectionRouting(): void {
  if (routingReady || typeof window === 'undefined') return;
  routingReady = true;
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (isShareHash(hash)) {
      useAppStore.setState({ activeSection: 'builds', shareLink: hash });
      return;
    }
    const section = sectionFromHash(hash);
    if (section !== null && section !== useAppStore.getState().activeSection) {
      useAppStore.setState({ activeSection: section });
    }
  });
}
