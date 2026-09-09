import { useEffect, useRef, useState } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import { serializeBuilds, useLibraryStore } from '../../state/library.ts';
import { decodeBuildLink, encodeBuildLink } from '../../state/share.ts';

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';

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
  const snapshot = loadBundledSnapshot();

  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const linkHandled = useRef(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Build Library</h2>
        {builds.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Export all as JSON
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-2 rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="mt-2 rounded-md border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-200">
          {notice}
        </p>
      )}

      <div className="mt-4">
        {!loaded ? (
          <p className="text-slate-400">Loading…</p>
        ) : builds.length === 0 ? (
          <p className="text-slate-400">No saved builds yet — save one from the Calculator results.</p>
        ) : (
          <ul className="space-y-2">
            {builds.map((build) => (
              <li key={build.id} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{build.name}</p>
                    <p className="text-xs text-slate-400">
                      {characterName(build.characterId)}
                      {build.score !== undefined && ` · score ${build.score.toFixed(1)}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(build.id)}
                      className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeBuild(build.id)}
                      className="rounded-md px-2 py-1 text-sm text-red-300 hover:bg-slate-800"
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

      <div className="mt-6">
        <label htmlFor="build-import" className="block text-xs font-medium text-slate-300">
          Paste build JSON to import (single build or array)
        </label>
        <textarea
          id="build-import"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          className={`${inputClass} mt-1 font-mono`}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          className="mt-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          Import
        </button>
      </div>
    </section>
  );
}
