import { findEchoDef, loadBundledSnapshot } from '../../data/index.ts';
import type { OwnedEcho } from '../../data/schema.ts';
import { echoDefIssues } from '../../state/inventory.ts';
import { statLabel, toDisplayValue } from '../format.ts';
import { GameIcon } from './GameIcon.tsx';
import { btnDangerGhost, btnGhost, btnSm } from './classes.ts';
import { CostPips } from './ui.tsx';

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
          className="animate-tt-fade row-sweep flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-panel px-3 py-2.5 transition-terminal hover:border-line-strong"
        >
          <GameIcon name={displayName(echo)} iconUrl={def?.iconUrl} />
          <div className="min-w-0 flex-1 basis-52">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate font-display text-lg leading-tight font-semibold tracking-wide text-ink">
                {displayName(echo)}
              </p>
              <span className="seal-stamp px-1.5 py-px text-[10px] uppercase">
                {sonataName(echo.sonataId)}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-fog tnum">
              <span className="inline-flex items-center gap-1.5">
                <CostPips cost={echo.cost} />
                <span>C{echo.cost} · Lv{echo.level}</span>
              </span>
              <span className="text-dim">|</span>
              <span className="text-ink">
                {statLabel(echo.mainStat.stat)} {toDisplayValue(echo.mainStat.stat, echo.mainStat.value)}
              </span>
              {echo.substats.length > 0 && (
                <span className="truncate">
                  {echo.substats
                    .map((s) => `${statLabel(s.stat)} ${toDisplayValue(s.stat, s.value)}`)
                    .join(' · ')}
                </span>
              )}
            </p>
            {issues.length > 0 && (
              <p className="mt-0.5 text-xs text-amber">
                Needs re-link: {issues.map((i) => i.message).join(' ')}
              </p>
            )}
          </div>
          <div className="ml-auto flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onEdit(echo)}
              className={`${btnGhost} ${btnSm}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void onDelete(echo.id)}
              className={`${btnDangerGhost} ${btnSm}`}
            >
              Delete
            </button>
          </div>
        </li>
        );
      })}
    </ul>
  );
}
