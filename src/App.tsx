import { useEffect, useState } from 'react';
import { SECTIONS, initSectionRouting, useAppStore, type Section } from './state/store.ts';
import { useThemeStore } from './state/theme.ts';
import { CommandPalette } from './ui/components/palette.tsx';
import { Mascot } from './ui/components/Mascot.tsx';
import { PixelIcon } from './ui/components/PixelIcon.tsx';
import type { PixelIconName } from './ui/components/pixelIcons.ts';
import { btnOutline } from './ui/components/classes.ts';
import { BuildsPage } from './ui/pages/BuildsPage.tsx';
import { CalculatorPage } from './ui/pages/CalculatorPage.tsx';
import { DatabasePage } from './ui/pages/DatabasePage.tsx';
import { InventoryPage } from './ui/pages/InventoryPage.tsx';
import { RosterPage } from './ui/pages/RosterPage.tsx';
import { TeamsPage } from './ui/pages/TeamsPage.tsx';

function ActiveSection({ section }: { section: Section }) {
  switch (section) {
    case 'inventory':
      return <InventoryPage />;
    case 'roster':
      return <RosterPage />;
    case 'calculator':
      return <CalculatorPage />;
    case 'teams':
      return <TeamsPage />;
    case 'builds':
      return <BuildsPage />;
    case 'database':
      return <DatabasePage />;
  }
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const next = theme === 'paper' ? 'ink' : 'paper';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      className={`${btnOutline} text-sm`}
    >
      {theme === 'paper' ? 'Light' : 'Dark'}
    </button>
  );
}

function PaletteButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open command palette"
      title="Command palette (Ctrl+K)"
      className={`${btnOutline} text-sm`}
    >
      Search
      <kbd className="hidden border-2 border-line-strong px-1 py-px font-sans text-xs text-fog sm:inline">Ctrl K</kbd>
    </button>
  );
}

const SECTION_ICONS: Record<Section, PixelIconName> = {
  inventory: 'chest',
  roster: 'head',
  calculator: 'sword',
  teams: 'heart',
  builds: 'book',
  database: 'disk',
};

function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  return (
    <header className="border-b-[3px] border-outline bg-panel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-3 pb-5 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <Mascot variant="logo" />
          <p className="font-display text-2xl leading-none font-bold text-ink">
            WuWa<span className="text-accent-text">Opt</span>
          </p>
        </div>
        <nav aria-label="Sections" className="order-3 flex w-full flex-wrap gap-x-2 gap-y-4 lg:order-none lg:w-auto lg:flex-1">
          {SECTIONS.map(({ id, label }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-10 items-center gap-2 px-2.5 py-1 font-display text-base font-semibold ${
                  active ? 'px-button px-button-primary' : 'text-fog transition-terminal hover:bg-panel-2 hover:text-ink'
                }`}
              >
                <PixelIcon name={SECTION_ICONS[id]} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <PaletteButton onOpen={onOpenPalette} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function App() {
  const activeSection = useAppStore((s) => s.activeSection);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    initSectionRouting();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink transition-terminal">
      <TopBar onOpenPalette={() => setPaletteOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div key={activeSection} className="animate-tt-fade">
          <ActiveSection section={activeSection} />
        </div>
        <p className="mt-10 text-center text-xs text-fog">Local-first — nothing leaves this browser.</p>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default App;
