import { findEchoDef } from '../../data/index.ts';
import type { OwnedEcho, Snapshot } from '../../data/schema.ts';
import { echoDefIssues } from '../../state/inventory.ts';
import { statLabel, toDisplayValue } from '../format.ts';
import { GameIcon } from './GameIcon.tsx';
import { btnDangerGhost, btnGhost, btnSm } from './classes.ts';
import { CostPips } from './ui.tsx';

interface EchoListProps {
  echoes: OwnedEcho[];
  /** Active game-data snapshot (passed down so the list follows cache updates). */
  snapshot: Snapshot;
  onEdit: (echo: OwnedEcho) => void;
  onDelete: (id: string) => void;
}

function sonataName(snapshot: Snapshot, sonataId: string): string {
  const found = snapshot.sonataSets.find((s) => s.id === sonataId);
  return found?.name ?? sonataId;
}

/** Nickname first, then the real def name, then the raw id (orphans). */
function displayName(snapshot: Snapshot, echo: OwnedEcho): string {
  if (echo.label) return echo.label;
  return findEchoDef(snapshot, echo.echoDefId)?.name ?? echo.echoDefId;
}

export function EchoList({ echoes, snapshot, onEdit, onDelete }: EchoListProps) {
  const defs = snapshot.echoDefs;
  return (
    <ul className="space-y-2">
      {echoes.map((echo) => {
        const issues = echoDefIssues(echo, defs);
        const def = findEchoDef(snapshot, echo.echoDefId);
        return (
        <li
          key={echo.id}
          className="animate-tt-fade row-sweep flex flex-wrap items-center gap-x-3 gap-y-2 border-2 border-line bg-panel px-3 py-2.5 transition-terminal hover:border-line-strong"
        >
          <GameIcon name={displayName(snapshot, echo)} iconUrl={def?.iconUrl} />
          <div className="min-w-0 flex-1 basis-52">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate font-display text-lg leading-tight font-semibold text-ink">
                {displayName(snapshot, echo)}
              </p>
              <span className="px-tag px-1.5 py-px text-xs">
                {sonataName(snapshot, echo.sonataId)}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fog tnum">
              <span className="inline-flex items-center gap-1.5">
                <CostPips cost={echo.cost} />
                <span>C{echo.cost} · Lv{echo.level}</span>
              </span>
              <span className="text-fog">|</span>
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
