import { useEffect, useRef, useState } from 'react';
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
import { useSnapshotStore } from '../../state/snapshotStore.ts';
import { EchoForm, type EchoFormValues } from '../components/EchoForm.tsx';
import { EchoList } from '../components/EchoList.tsx';
import { btnGhost, btnOutline, btnPrimary, inputClass, labelClass } from '../components/classes.ts';
import { Skeleton, ToastStack } from '../components/feedback.tsx';
import { useToasts } from '../toasts.ts';
import { Alert, EmptyState, PageHeader } from '../components/ui.tsx';
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
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const fileRef = useRef<HTMLInputElement>(null);

  const snapshot = useSnapshotStore((s) => s.snapshot);
  const ensureSnapshotLoaded = useSnapshotStore((s) => s.ensureLoaded);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
  useEffect(() => {
    void ensureSnapshotLoaded();
  }, [ensureSnapshotLoaded]);

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
      pushToast(`Exported ${echoes.length} ${echoes.length === 1 ? 'echo' : 'echoes'}.`);
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
      <PageHeader
        title={
          <>
            Echo Inventory
            {loaded && echoes.length > 0 && sonataFilter === '' && (
              <span className="text-accent-text"> ({echoes.length})</span>
            )}
            {loaded && echoes.length > 0 && sonataFilter !== '' && (
              <span className="text-accent-text"> ({visible.length}/{echoes.length})</span>
            )}
          </>
        }
        description="Your Echo box — every piece the Calculator scores and the optimizer searches."
        actions={
          adding || editing !== null ? undefined : (
            <>
              {import.meta.env.DEV && (
                <>
                  <select
                    aria-label="Seed echo set"
                    value={seedSonata}
                    onChange={(e) => setSeedSonata(e.target.value)}
                    title="Restrict seeded echoes to one Sonata set"
                    className="border-2 border-dashed border-fog bg-panel px-2 py-1.5 text-xs text-fog"
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
                    className="border-2 border-dashed border-fog px-3 py-1.5 text-sm text-fog hover:bg-panel-2"
                  >
                    Seed 30 random
                  </button>
                </>
              )}
              <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
                Add Echo
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Import echoes from a WuWa Inventory Kamera JSON file"
                className={btnOutline}
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
                className={btnOutline}
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
            </>
          )
        }
      />

      {transferError !== null && (
        <Alert tone="danger" className="mt-4">
          {transferError}
        </Alert>
      )}

      {preview !== null && (
        <div className="animate-tt-rise mt-4 border-2 border-line bg-panel p-4">
          <h3 className="font-display text-xl leading-tight font-semibold text-ink">Import {preview.fileName}</h3>
          <p className="mt-1 text-sm text-fog">
            {`${preview.drafts.length} ${preview.drafts.length === 1 ? 'echo' : 'echoes'} ready to add, ${preview.issues.length} skipped. Adding is additive — existing rows are untouched.`}
          </p>
          {preview.drafts.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-fog">
              {preview.drafts.slice(0, 20).map((d, i) => (
                <li key={i}>{`${defName(d.echoDefId)} · ${setName(d.sonataId)} · Lv${d.level}`}</li>
              ))}
              {preview.drafts.length > 20 && <li>{`…and ${preview.drafts.length - 20} more`}</li>}
            </ul>
          )}
          {preview.issues.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-amber">
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
                const count = preview.drafts.length;
                void importEchoes(preview.drafts, KAMERA_ORIGIN)
                  .then(() => {
                    setPreview(null);
                    setTransferError(null);
                    pushToast(`Added ${count} ${count === 1 ? 'echo' : 'echoes'} from ${preview.fileName}.`);
                  })
                  .catch((err: unknown) =>
                    setTransferError(err instanceof Error ? err.message : 'Import failed.'),
                  );
              }}
              className={btnPrimary}
            >
              {`Add ${preview.drafts.length} ${preview.drafts.length === 1 ? 'echo' : 'echoes'}`}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className={btnGhost}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {flagged.length > 0 && (
        <Alert tone="warning" className="mt-4">
          {`${flagged.length} ${flagged.length === 1 ? 'echo needs' : 'echoes need'} re-linking — press Edit on each flagged row and pick the real Echo. Saving stays blocked until it matches game data.`}
        </Alert>
      )}

      {adding && (
        <div className="animate-tt-rise mt-4 border-2 border-line bg-panel p-4">
          <EchoForm
            submitLabel="Add Echo"
            onSubmit={async (draft) => {
              await addEcho(draft);
              setAdding(false);
              pushToast('Echo added to the inventory.');
            }}
          />
          <button
            type="button"
            onClick={() => setAdding(false)}
            className={`${btnGhost} mt-2`}
          >
            Cancel
          </button>
        </div>
      )}

      {editing !== null && (
        <div className="animate-tt-rise mt-4 border-2 border-line bg-panel p-4">
          <EchoForm
            key={editing.id}
            initial={toFormValues(editing)}
            submitLabel="Save"
            onSubmit={async (draft) => {
              await updateEcho(editing.id, draft);
              setEditing(null);
              pushToast('Echo saved.');
            }}
          />
          <button
            type="button"
            onClick={() => setEditing(null)}
            className={`${btnGhost} mt-2`}
          >
            Cancel
          </button>
        </div>
      )}

      {loaded && echoes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="inventory-sonata-filter" className={labelClass}>
            Sonata set
          </label>
          <select
            id="inventory-sonata-filter"
            value={sonataFilter}
            onChange={(e) => setSonataFilter(e.target.value)}
            className={`${inputClass} w-auto min-w-56`}
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
          <Skeleton lines={4} />
        ) : echoes.length === 0 ? (
          <EmptyState>No echoes yet — add your first Echo above to start building your gear box.</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>No echoes with this Sonata set — pick All sets to see the full inventory.</EmptyState>
        ) : (
          <EchoList
            echoes={visible}
            snapshot={snapshot}
            onEdit={setEditing}
            onDelete={(id) => {
              void removeEcho(id).then(() => pushToast('Echo deleted.'));
            }}
          />
        )}
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
