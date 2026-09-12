import { findEchoDef, loadBundledSnapshot } from '../../data/index.ts';
import type { OwnedEcho } from '../../data/schema.ts';
import { echoDefIssues } from '../../state/inventory.ts';
import { statLabel, toDisplayValue } from '../format.ts';
import { GameIcon } from './GameIcon.tsx';

interface EchoListProps {
  echoes: OwnedEcho[];
  onEdit: (echo: OwnedEcho) => void;
  onDelete: (id: string) => void;
}

function sonataName(sonataId: string): string {
  const found = loadBundledSnapshot().sonataSets.find((s) => s.id === sonataId);
  return found?.name ?? sonataId;
}

/** Nickname first, then the real def name, then the raw id (orphans). */
function displayName(echo: OwnedEcho): string {
  if (echo.label) return echo.label;
  return findEchoDef(loadBundledSnapshot(), echo.echoDefId)?.name ?? echo.echoDefId;
}

export function EchoList({ echoes, onEdit, onDelete }: EchoListProps) {
  const defs = loadBundledSnapshot().echoDefs;
  return (
    <ul className="space-y-2">
      {echoes.map((echo) => {
        const issues = echoDefIssues(echo, defs);
        const def = findEchoDef(loadBundledSnapshot(), echo.echoDefId);
        return (
        <li
          key={echo.id}
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
        >
          <GameIcon name={displayName(echo)} iconUrl={def?.iconUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName(echo)}</p>
            <p className="truncate text-xs text-slate-400">
              {sonataName(echo.sonataId)} · Cost {echo.cost} · Lv {echo.level} ·{' '}
              {statLabel(echo.mainStat.stat)} {toDisplayValue(echo.mainStat.stat, echo.mainStat.value)}
              {echo.substats.length > 0 &&
                ` · ${echo.substats
                  .map((s) => `${statLabel(s.stat)} ${toDisplayValue(s.stat, s.value)}`)
                  .join(', ')}`}
            </p>
            {issues.length > 0 && (
              <p className="mt-0.5 text-xs text-amber-300">
                Needs re-link: {issues.map((i) => i.message).join(' ')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onEdit(echo)}
            className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void onDelete(echo.id)}
            className="rounded-md px-2 py-1 text-sm text-red-300 hover:bg-slate-800"
          >
            Delete
          </button>
        </li>
        );
      })}
    </ul>
  );
}
