import { useEffect, useState } from 'react';
import { SECTIONS, initSectionRouting, useAppStore, type Section } from './state/store.ts';
import { useThemeStore } from './state/theme.ts';
import { CommandPalette } from './ui/components/palette.tsx';
import { FrequencyStrip } from './ui/components/motif.tsx';
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

/** Waveform mark — the Tacet frequency motif. Bars drift via `tt-eq` (CSS-gated). */
function BrandMark() {
  const bars = [10, 18, 26, 15, 22, 12, 19];
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" aria-hidden="true" className="shrink-0">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 4}
          y={(24 - h) / 2}
          width="2.5"
          height={h}
          rx="1"
          className={`eq-bar ${i === 2 ? 'fill-seal-bright' : 'fill-seal'}`}
          style={{ animationDelay: `${i * -0.35}s`, animationDuration: `${2.2 + (i % 3) * 0.4}s` }}
          opacity={i === 2 ? 1 : 0.45 + (i % 3) * 0.15}
        />
      ))}
    </svg>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const next = theme === 'paper' ? 'ink' : 'paper';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      className={
        compact
          ? 'shrink-0 rounded-md border border-line-strong px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-fog uppercase transition-terminal hover:bg-panel-2 hover:text-ink'
          : 'flex w-full items-center justify-between rounded-md border border-line-strong px-3 py-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-terminal hover:bg-panel-2'
      }
    >
      {compact ? (
        theme.toUpperCase()
      ) : (
        <>
          <span className="text-fog">Theme</span>
          <span className="text-accent-text">{theme === 'paper' ? 'Paper' : 'Ink'}</span>
        </>
      )}
    </button>
  );
}

function PaletteButton({ compact = false, onOpen }: { compact?: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open command palette"
      title="Command palette (Ctrl+K)"
      className={
        compact
          ? 'shrink-0 rounded-md border border-line-strong px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-fog uppercase transition-terminal hover:bg-panel-2 hover:text-ink'
          : 'flex w-full items-center justify-between rounded-md border border-line-strong px-3 py-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-terminal hover:bg-panel-2'
      }
    >
      {compact ? (
        '⌘K'
      ) : (
        <>
          <span className="text-fog">Command</span>
          <span className="rounded border border-line-strong px-1.5 py-px text-[10px] text-fog">
            Ctrl K
          </span>
        </>
      )}
    </button>
  );
}

function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-panel lg:flex">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <BrandMark />
        <div>
          <p className="font-display text-2xl leading-none font-semibold tracking-wide text-ink">
            WuWa Optimizer
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.28em] text-accent-text uppercase">
            Resonator terminal
          </p>
        </div>
      </div>
      <div className="rule mx-5" aria-hidden="true" />
      <nav aria-label="Sections" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map(({ id, label, blurb }, i) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left transition-terminal ${
                active ? 'bg-panel-2' : 'hover:bg-panel-2/60'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-2 bottom-2 left-0 w-1 rounded-full bg-seal transition-transform duration-150 ${
                  active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50'
                }`}
              />
              <span
                className={`font-mono text-[11px] font-medium tnum ${
                  active ? 'text-accent-text' : 'text-fog group-hover:text-fog'
                }`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0">
                <span
                  className={`block font-display text-lg leading-tight font-semibold tracking-wide ${
                    active ? 'text-ink' : 'text-fog group-hover:text-ink'
                  }`}
                >
                  {label}
                </span>
                <span className="block truncate font-mono text-[10px] tracking-[0.14em] text-fog uppercase">
                  {blurb}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="space-y-3 px-5 py-4">
        <PaletteButton onOpen={onOpenPalette} />
        <ThemeToggle />
        <FrequencyStrip seed="sidebar" bars={36} className="h-5 w-full opacity-60" />
        <div className="rule" aria-hidden="true" />
        <p className="font-mono text-[10px] leading-relaxed tracking-[0.14em] text-fog uppercase">
          Local-first
          <br />
          Nothing leaves this browser
        </p>
      </div>
    </aside>
  );
}

function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-panel lg:hidden">
      <div className="flex items-center gap-3 px-4 pt-3">
        <BrandMark />
        <p className="font-display text-xl leading-none font-semibold tracking-wide text-ink">
          WuWa Optimizer
        </p>
        <div className="ml-auto flex gap-1.5">
          <PaletteButton compact onOpen={onOpenPalette} />
          <ThemeToggle compact />
        </div>
      </div>
      <nav aria-label="Sections" className="mt-2 flex gap-1 overflow-x-auto px-4 pb-3">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            aria-current={activeSection === id ? 'page' : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 font-display text-base font-semibold tracking-wide transition-terminal ${
              activeSection === id ? 'bg-seal text-seal-ink' : 'text-fog hover:bg-panel-2 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
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
    <div className="terminal-ground min-h-screen bg-canvas text-ink transition-terminal">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <TopBar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div key={activeSection} className="animate-tt-fade">
            <ActiveSection section={activeSection} />
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default App;
