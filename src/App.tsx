import { useAppStore, type Section } from './state/store.ts';
import { BuildsPage } from './ui/pages/BuildsPage.tsx';
import { CalculatorPage } from './ui/pages/CalculatorPage.tsx';
import { DatabasePage } from './ui/pages/DatabasePage.tsx';
import { InventoryPage } from './ui/pages/InventoryPage.tsx';
import { RosterPage } from './ui/pages/RosterPage.tsx';
import { TeamsPage } from './ui/pages/TeamsPage.tsx';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'roster', label: 'Roster' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'teams', label: 'Teams' },
  { id: 'builds', label: 'Builds' },
  { id: 'database', label: 'Database' },
];

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

function App() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-4">
          <h1 className="text-lg font-bold tracking-tight">
            WuWa Optimizer
          </h1>
          <nav className="flex flex-wrap gap-1" aria-label="Sections">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                aria-current={activeSection === id ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeSection === id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <ActiveSection section={activeSection} />
      </main>
    </div>
  );
}

export default App;
