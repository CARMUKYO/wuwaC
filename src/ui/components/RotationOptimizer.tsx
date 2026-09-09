import { useEffect, useRef, useState } from 'react';
import type {
  CharacterData,
  OwnedEcho,
  RosterEntry,
  RotationBlockSpec,
  RotationBuffSpec,
  SonataSetData,
  WeaponData,
} from '../../data/schema.ts';
import type { CritMode, EnemyProfile } from '../../domain/damage.ts';
import { runOptimization, type OptimizationHandle } from '../../optimizer/worker.ts';
import type { OptimizeRequest, SearchData, SearchResult } from '../../optimizer/search.ts';
import { useLibraryStore } from '../../state/library.ts';

const selectClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';
const labelClass = 'block text-xs font-medium text-slate-300';

type Status =
  | { kind: 'idle' }
  | { kind: 'running'; evaluated: number; total: number }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

interface RotationOptimizerProps {
  character: CharacterData;
  weapon: WeaponData;
  roster: RosterEntry;
  echoes: OwnedEcho[];
  sonataSets: SonataSetData[];
  enemy: EnemyProfile;
  blocks: RotationBlockSpec[];
  buffs: RotationBuffSpec[];
  globalBuffIds: string[];
  crit: CritMode;
  /** DPR of the currently picked 5 echoes (null when ungated). */
  currentDpr: number | null;
  rotationTime: number;
  onApply: (echoIds: string[]) => void;
}

/**
 * Minimal rotation optimizer: budget + Top N + run, ranked by rotation DPR
 * (DPS ranks identically — time is constant). Results apply straight into
 * the Calculator loadout or save to the build library with the full spec.
 */
export function RotationOptimizer(props: RotationOptimizerProps) {
  const {
    character, weapon, roster, echoes, sonataSets, enemy,
    blocks, buffs, globalBuffIds, crit, currentDpr, rotationTime, onApply,
  } = props;
  const saveBuild = useLibraryStore((s) => s.saveBuild);

  const [budget, setBudget] = useState<'10' | '12'>('12');
  const [topN, setTopN] = useState('5');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [lastRun, setLastRun] = useState<{ data: SearchData; request: OptimizeRequest } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');

  const runRef = useRef<OptimizationHandle | null>(null);
  const runCounter = useRef(0);
  useEffect(() => () => runRef.current?.cancel(), []);

  const echoLabels = new Map(echoes.map((e) => [e.id, e.label ?? e.echoDefId]));
  const tooFew = echoes.length < 5;
  const canRun = blocks.length > 0 && !tooFew;

  const handleRun = (): void => {
    const parsedTopN = Number(topN.trim());
    if (!Number.isInteger(parsedTopN) || parsedTopN < 1 || parsedTopN > 50) {
      setStatus({ kind: 'error', message: 'Top N must be a whole number from 1 to 50.' });
      return;
    }
    const data: SearchData = { character, weapon, roster, echoes, sonataSets, enemy };
    const request: OptimizeRequest = {
      costBudget: budget === '10' ? 10 : 12,
      sonataLock: { mode: 'none' },
      objective: { kind: 'rotation-dpr', blocks, buffs, globalBuffIds, crit },
      topN: parsedTopN,
    };
    runRef.current?.cancel();
    const runId = (runCounter.current += 1);
    const handle = runOptimization(data, request);
    runRef.current = handle;
    setResult(null);
    setStatus({ kind: 'running', evaluated: 0, total: 0 });
    handle.onProgress((evaluated, total) => {
      if (runCounter.current === runId) setStatus({ kind: 'running', evaluated, total });
    });
    void handle.promise.then(
      (searchResult) => {
        if (runCounter.current !== runId) return;
        setResult(searchResult);
        setLastRun({ data, request });
        setStatus({ kind: 'done' });
      },
      (err: unknown) => {
        if (runCounter.current !== runId) return;
        setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      },
    );
  };

  const handleSave = async (echoIds: string[]): Promise<void> => {
    if (!lastRun || saveName.trim() === '') return;
    const key = echoIds.join('+');
    await saveBuild({
      name: saveName.trim(),
      characterId: lastRun.data.character.id,
      weaponId: lastRun.data.weapon.id,
      echoIds: [...echoIds].sort() as [string, string, string, string, string],
      objectiveId: 'Rotation DPR',
      objective: lastRun.request.objective,
      score: result?.builds.find((b) => b.echoIds.join('+') === key)?.score,
    });
    setSavingKey(null);
    setSaveName('');
  };

  return (
    <section aria-label="Optimize for this rotation" className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <h3 className="text-sm font-semibold">Optimize for This Rotation</h3>
      {currentDpr !== null && (
        <p className="mt-1 text-xs text-slate-400">
          Current picks: {Math.round(currentDpr).toLocaleString()} DPR ·{' '}
          {Math.round(currentDpr / rotationTime).toLocaleString()} DPS
        </p>
      )}
      {tooFew ? (
        <p className="mt-2 text-xs text-slate-500">
          You need at least 5 echoes in your inventory to run the optimizer.
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-3 items-end gap-2">
          <div>
            <label htmlFor="ropt-budget" className={labelClass}>Cost budget</label>
            <select id="ropt-budget" value={budget} onChange={(e) => setBudget(e.target.value as '10' | '12')} className={`${selectClass} mt-0.5`}>
              <option value="10">10</option>
              <option value="12">12</option>
            </select>
          </div>
          <div>
            <label htmlFor="ropt-topn" className={labelClass}>Top N</label>
            <input id="ropt-topn" value={topN} onChange={(e) => setTopN(e.target.value)} inputMode="numeric" className={`${selectClass} mt-0.5`} />
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            title={blocks.length === 0 ? 'Add rotation actions first' : undefined}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-40"
          >
            Find best builds
          </button>
        </div>
      )}

      {status.kind === 'running' && (
        <p className="mt-2 text-sm text-slate-400" role="status">
          Evaluated {status.evaluated} of {status.total} combos…
        </p>
      )}
      {status.kind === 'error' && (
        <div role="alert" className="mt-2 rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {status.message}
        </div>
      )}
      {status.kind === 'done' && result && (
        <div className="mt-3">
          {result.builds.length === 0 ? (
            <p className="text-xs text-slate-400">No valid builds — loosen the budget.</p>
          ) : (
            <ol className="space-y-2">
              {result.builds.map((build, i) => {
                const key = build.echoIds.join('+');
                const saving = savingKey === key;
                const uplift = currentDpr !== null && currentDpr > 0
                  ? ((build.score - currentDpr) / currentDpr) * 100
                  : null;
                return (
                  <li key={key} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                    <p className="text-sm font-medium">
                      #{i + 1} — {Math.round(build.score).toLocaleString()} DPR ·{' '}
                      {Math.round(build.score / rotationTime).toLocaleString()} DPS
                      {uplift !== null && (
                        <span className={uplift >= 0 ? 'text-green-300' : 'text-red-300'}>
                          {' '}({uplift >= 0 ? '+' : ''}{uplift.toFixed(1)}% vs current)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {build.echoIds.map((id) => echoLabels.get(id) ?? id).join(' · ')}
                    </p>
                    {build.warnings.length > 0 && (
                      <p className="text-xs text-amber-300">
                        {build.warnings.length} unmodeled effect{build.warnings.length === 1 ? '' : 's'}
                      </p>
                    )}
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onApply(build.echoIds)}
                        className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Apply to loadout
                      </button>
                      {saving ? (
                        <>
                          <input
                            aria-label="Build name"
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Build name"
                            className={`${selectClass} !w-40 !py-1 text-xs`}
                          />
                          <button
                            type="button"
                            onClick={() => void handleSave(build.echoIds)}
                            disabled={saveName.trim() === ''}
                            className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-white disabled:opacity-40"
                          >
                            Confirm save
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSavingKey(key);
                            setSaveName('');
                          }}
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Scored {result.evaluated} combos
            {result.prunedEchoes.length > 0 && `, pruned ${result.prunedEchoes.length} dominated echoes`}.
          </p>
        </div>
      )}
    </section>
  );
}
