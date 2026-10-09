import { useEffect, useRef, useState } from 'react';
import { serializeBuilds, useLibraryStore } from '../../state/library.ts';
import { useSnapshotStore } from '../../state/snapshotStore.ts';
import { decodeBuildLink, encodeBuildLink } from '../../state/share.ts';
import { GameIcon } from '../components/GameIcon.tsx';
import { btnDangerGhost, btnGhost, btnOutline, btnPrimary, inputClass, labelClass } from '../components/classes.ts';
import { Skeleton, ToastStack } from '../components/feedback.tsx';
import { useToasts } from '../toasts.ts';
import { MotifEmptyState } from '../components/motif.tsx';
import { Alert, PageHeader } from '../components/ui.tsx';

/** Decode a share hash and import it; resolves a user-facing notice. Pure module scope (no hooks). */
async function importLinkIntoLibrary(
  hash: string,
  importBuilds: (json: unknown) => Promise<{ added: number; skipped: number }>,
): Promise<string> {
  const build = decodeBuildLink(hash);
  const { added, skipped } = await importBuilds([build]);
  return added === 1
    ? `Imported shared build “${build.name}”.`
    : `Build already in the library (skipped ${skipped}).`;
}

export function BuildsPage() {
  const builds = useLibraryStore((s) => s.builds);
  const loaded = useLibraryStore((s) => s.loaded);
  const load = useLibraryStore((s) => s.load);
  const removeBuild = useLibraryStore((s) => s.removeBuild);
  const importBuilds = useLibraryStore((s) => s.importBuilds);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const ensureSnapshotLoaded = useSnapshotStore((s) => s.ensureLoaded);

  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const linkHandled = useRef(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
  useEffect(() => {
    void ensureSnapshotLoaded();
  }, [ensureSnapshotLoaded]);

  // Open a shared build from the URL hash (once per mount).
  useEffect(() => {
    if (linkHandled.current || !loaded) return;
    if (!window.location.hash.startsWith('#b=')) return;
    linkHandled.current = true;
    const hash = window.location.hash;
    void importLinkIntoLibrary(hash, importBuilds).then(
      (message) => {
        setNotice(message);
        window.history.replaceState(null, '', window.location.pathname);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const characterName = (id: string): string =>
    snapshot.characters.find((c) => c.id === id)?.name ?? id;

  const handleExport = (): void => {
    const blob = new Blob([serializeBuilds(builds)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wuwa-builds.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (): Promise<void> => {
    setError(null);
    setNotice(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(paste);
    } catch {
      setError('Pasted text is not valid JSON.');
      return;
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    try {
      const { added, skipped } = await importBuilds(list);
      setNotice(`Imported ${added} build${added === 1 ? '' : 's'}${skipped > 0 ? ` (${skipped} skipped as duplicates)` : ''}.`);
      setPaste('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopyLink = async (buildId: string): Promise<void> => {
    setError(null);
    const build = builds.find((b) => b.id === buildId);
    if (!build) return;
    const url = `${window.location.href.split('#')[0]}${encodeBuildLink(build)}`;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard is unavailable in this browser.');
      await navigator.clipboard.writeText(url);
      setNotice(`Copied share link for “${build.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section>
      <PageHeader
        title="Build Library"
        description="Winning optimizer results, saved with their full rotation spec — exportable and shareable by link."
        actions={
          builds.length > 0 ? (
            <button type="button" onClick={handleExport} className={btnOutline}>
              Export all as JSON
            </button>
          ) : undefined
        }
      />

      {error && (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" role="status" className="mt-4">
          {notice}
        </Alert>
      )}

      <div className="mt-4">
        {!loaded ? (
          <Skeleton lines={3} />
        ) : builds.length === 0 ? (
          <MotifEmptyState seed="builds-empty">No saved builds yet — save one from the Calculator results.</MotifEmptyState>
        ) : (
          <ul className="space-y-2">
            {builds.map((build) => (
              <li key={build.id} className="animate-tt-fade row-sweep border-2 border-line bg-panel px-4 py-3 transition-terminal hover:border-line-strong">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex min-w-0 flex-1 basis-52 items-center gap-3">
                    <GameIcon
                      name={characterName(build.characterId)}
                      iconUrl={snapshot.characters.find((c) => c.id === build.characterId)?.iconUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl leading-tight font-semibold text-ink">{build.name}</p>
                      <p className="mt-0.5 text-xs text-fog tnum">
                        {characterName(build.characterId)}
                        {build.score !== undefined && (
                          <>
                            {' · '}
                            <span className="px-tag px-1.5 py-px text-xs">
                              score {build.score.toFixed(1)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(build.id)}
                      className={`${btnGhost} px-2 py-1 text-xs`}
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeBuild(build.id).then(() => pushToast(`Build “${build.name}” deleted.`))}
                      className={`${btnDangerGhost} px-2 py-1 text-xs`}
                    >
                      Delete {build.name}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 border-2 border-line bg-panel p-4">
        <label htmlFor="build-import" className={labelClass}>
          Paste build JSON to import (single build or array)
        </label>
        <textarea
          id="build-import"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          className={`${inputClass} mt-1.5 text-xs`}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          className={`${btnPrimary} mt-3`}
        >
          Import
        </button>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
