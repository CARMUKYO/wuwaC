import { useEffect, useState } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import type { OwnedEcho } from '../../data/schema.ts';
import { echoDefIssues, useInventoryStore } from '../../state/inventory.ts';
import { seedInventory } from '../../state/seed.ts';
import { EchoForm, type EchoFormValues } from '../components/EchoForm.tsx';
import { EchoList } from '../components/EchoList.tsx';
import { toDisplayValue } from '../format.ts';

function toFormValues(echo: OwnedEcho): EchoFormValues {
  return {
    echoDefId: echo.echoDefId,
    label: echo.label ?? '',
    sonataId: echo.sonataId,
    level: String(echo.level),
    rarity: String(echo.rarity),
    mainStat: {
      stat: echo.mainStat.stat,
      valueText: toDisplayValue(echo.mainStat.stat, echo.mainStat.value),
    },
    secondMainStat: {
      valueText: echo.secondMainStat
        ? toDisplayValue(echo.secondMainStat.stat, echo.secondMainStat.value)
        : '',
    },
    substats: echo.substats.map((s) => ({
      stat: s.stat,
      valueText: toDisplayValue(s.stat, s.value),
    })),
  };
}

export function InventoryPage() {
  const echoes = useInventoryStore((s) => s.echoes);
  const loaded = useInventoryStore((s) => s.loaded);
  const load = useInventoryStore((s) => s.load);
  const addEcho = useInventoryStore((s) => s.addEcho);
  const updateEcho = useInventoryStore((s) => s.updateEcho);
  const removeEcho = useInventoryStore((s) => s.removeEcho);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OwnedEcho | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const flagged = echoes.filter((e) => echoDefIssues(e, loadBundledSnapshot().echoDefs).length > 0);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Echo Inventory{loaded && echoes.length > 0 && ` (${echoes.length})`}
        </h2>
        {!adding && editing === null && (
          <div className="flex gap-2">
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => void seedInventory(30)}
                title="Adds 30 random echoes from synced defs for optimizer testing"
                className="rounded-md border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Seed 30 random
              </button>
            )}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              Add Echo
            </button>
          </div>
        )}
      </div>

      {flagged.length > 0 && (
        <div role="alert" className="mt-4 rounded-md border border-amber-800 bg-amber-950 px-3 py-2 text-sm text-amber-200">
          {`${flagged.length} ${flagged.length === 1 ? 'echo needs' : 'echoes need'} re-linking — press Edit on each flagged row and pick the real Echo. Saving stays blocked until it matches game data.`}
        </div>
      )}

      {adding && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <EchoForm
            submitLabel="Add Echo"
            onSubmit={async (draft) => {
              await addEcho(draft);
              setAdding(false);
            }}
          />
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-2 rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      )}

      {editing !== null && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <EchoForm
            key={editing.id}
            initial={toFormValues(editing)}
            submitLabel="Save"
            onSubmit={async (draft) => {
              await updateEcho(editing.id, draft);
              setEditing(null);
            }}
          />
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="mt-2 rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-4">
        {!loaded ? (
          <p className="text-slate-400">Loading…</p>
        ) : echoes.length === 0 ? (
          <p className="text-slate-400">
            No echoes yet — add your first Echo above to start building your gear box.
          </p>
        ) : (
          <EchoList echoes={echoes} onEdit={setEditing} onDelete={(id) => void removeEcho(id)} />
        )}
      </div>
    </section>
  );
}
