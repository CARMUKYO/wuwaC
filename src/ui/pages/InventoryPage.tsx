import { useEffect, useRef, useState } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import {
  exportKameraEchoes,
  KAMERA_ORIGIN,
  mapKameraEchoes,
  parseKameraEchoFile,
  type KameraImportResult,
} from '../../data/kamera.ts';
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
  const importEchoes = useInventoryStore((s) => s.importEchoes);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OwnedEcho | null>(null);
  const [sonataFilter, setSonataFilter] = useState('');
  const [seedSonata, setSeedSonata] = useState('');
  const [preview, setPreview] = useState<(KameraImportResult & { fileName: string }) | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const snapshot = loadBundledSnapshot();

  const defName = (echoDefId: string): string =>
    snapshot.echoDefs.find((d) => d.id === echoDefId)?.name ?? echoDefId;
  const setName = (sonataId: string): string =>
    snapshot.sonataSets.find((s) => s.id === sonataId)?.name ?? sonataId;

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseKameraEchoFile(text);
      setPreview({ fileName: file.name, ...mapKameraEchoes(rows, snapshot) });
      setTransferError(null);
    } catch (err) {
      setPreview(null);
      setTransferError(err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  const handleExport = (): void => {
    try {
      const json = JSON.stringify(exportKameraEchoes(echoes, snapshot), null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'echoes_wuwainventorykamera.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setTransferError(null);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Could not export the inventory.');
    }
  };
  const flagged = echoes.filter((e) => echoDefIssues(e, snapshot.echoDefs).length > 0);
  const visible = sonataFilter === '' ? echoes : echoes.filter((e) => e.sonataId === sonataFilter);
  const countBySonata = new Map<string, number>();
  for (const echo of echoes) {
    countBySonata.set(echo.sonataId, (countBySonata.get(echo.sonataId) ?? 0) + 1);
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Echo Inventory
          {loaded && echoes.length > 0 && sonataFilter === '' && ` (${echoes.length})`}
          {loaded && echoes.length > 0 && sonataFilter !== '' && ` (${visible.length}/${echoes.length})`}
        </h2>
        {!adding && editing === null && (
          <div className="flex gap-2">
            {import.meta.env.DEV && (
              <>
                <select
                  aria-label="Seed echo set"
                  value={seedSonata}
                  onChange={(e) => setSeedSonata(e.target.value)}
                  title="Restrict seeded echoes to one Sonata set"
                  className="rounded-md border border-dashed border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-300"
                >
                  <option value="">Any set</option>
                  {snapshot.sonataSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void seedInventory(30, seedSonata === '' ? undefined : seedSonata)}
                  title="Adds 30 random echoes from synced defs for optimizer testing"
                  className="rounded-md border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Seed 30 random
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              Add Echo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Import echoes from a WuWa Inventory Kamera JSON file"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Import
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={echoes.length === 0}
              title={
                echoes.length === 0
                  ? 'Nothing to export yet'
                  : 'Download the inventory as a Kamera-shaped JSON file'
              }
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              aria-label="Import echoes file"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      {transferError !== null && (
        <div role="alert" className="mt-4 rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {transferError}
        </div>
      )}

      {preview !== null && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Import {preview.fileName}</h3>
          <p className="mt-1 text-sm text-slate-300">
            {`${preview.drafts.length} ${preview.drafts.length === 1 ? 'echo' : 'echoes'} ready to add, ${preview.issues.length} skipped. Adding is additive — existing rows are untouched.`}
          </p>
          {preview.drafts.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-slate-400">
              {preview.drafts.slice(0, 20).map((d, i) => (
                <li key={i}>{`${defName(d.echoDefId)} · ${setName(d.sonataId)} · Lv${d.level}`}</li>
              ))}
              {preview.drafts.length > 20 && <li>{`…and ${preview.drafts.length - 20} more`}</li>}
            </ul>
          )}
          {preview.issues.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-amber-200">
              {preview.issues.map((issue, i) => (
                <li key={i}>{`Row ${issue.row} (${issue.key}): ${issue.message}`}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={preview.drafts.length === 0}
              onClick={() => {
                void importEchoes(preview.drafts, KAMERA_ORIGIN)
                  .then(() => {
                    setPreview(null);
                    setTransferError(null);
                  })
                  .catch((err: unknown) =>
                    setTransferError(err instanceof Error ? err.message : 'Import failed.'),
                  );
              }}
              className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {`Add ${preview.drafts.length} ${preview.drafts.length === 1 ? 'echo' : 'echoes'}`}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {loaded && echoes.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="inventory-sonata-filter" className="text-xs font-medium text-slate-300">
            Sonata set
          </label>
          <select
            id="inventory-sonata-filter"
            value={sonataFilter}
            onChange={(e) => setSonataFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="">All sets</option>
            {snapshot.sonataSets.map((set) => (
              <option key={set.id} value={set.id}>
                {`${set.name} (${countBySonata.get(set.id) ?? 0})`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4">
        {!loaded ? (
          <p className="text-slate-400">Loading…</p>
        ) : echoes.length === 0 ? (
          <p className="text-slate-400">
            No echoes yet — add your first Echo above to start building your gear box.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-slate-400">
            No echoes with this Sonata set — pick All sets to see the full inventory.
          </p>
        ) : (
          <EchoList echoes={visible} onEdit={setEditing} onDelete={(id) => void removeEcho(id)} />
        )}
      </div>
    </section>
  );
}
