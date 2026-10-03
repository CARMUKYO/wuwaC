import { create } from 'zustand';

export type Theme = 'paper' | 'ink';

const STORAGE_KEY = 'wuwa-theme';

function initialTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ink' ? 'ink' : 'paper';
  } catch {
    return 'paper';
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'ink' ? '#0d100f' : '#f1eee6');
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode — the theme still applies for this session.
  }
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const initial = initialTheme();
applyTheme(initial);

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: initial,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'paper' ? 'ink' : 'paper';
      applyTheme(next);
      return { theme: next };
    }),
}));
