import { findEchoDef } from '../../data/index.ts';
import type { OwnedEcho, Snapshot, StatKey } from '../../data/schema.ts';
import { rollValueBlocks } from '../../domain/rollValue.ts';
import { echoDefIssues } from '../../state/inventory.ts';
import { echoDisplayName, echoScore, sonataName } from '../echoDisplay.ts';
import { formatStatValue, statLabel } from '../format.ts';
import { sonataTint } from '../sonataTint.ts';
import { GameIcon } from './GameIcon.tsx';
import { CostPips, SegmentMeter } from './ui.tsx';

/** Substats that get their own aligned column; everything else lands in "Other". */
const SUBSTAT_COLUMNS: readonly { stat: StatKey; header: string; title: string }[] = [
  { stat: 'critRate', header: 'CR', title: 'Crit Rate' },
  { stat: 'critDmg', header: 'CD', title: 'Crit DMG' },
  { stat: 'atkPct', header: 'ATK%', title: 'ATK%' },
  { stat: 'energyRegen', header: 'ER', title: 'Energy Regen' },
];
const COLUMN_STATS: ReadonlySet<StatKey> = new Set(SUBSTAT_COLUMNS.map((c) => c.stat));

function Dash() {
  return (
    <span aria-hidden="true" className="text-dim">
      –
    </span>
  );
}

interface EchoTableProps {
  echoes: OwnedEcho[];
  /** Active game-data snapshot (passed down so the table follows cache updates). */
  snapshot: Snapshot;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EchoTable({ echoes, snapshot, selectedId, onSelect }: EchoTableProps) {
  const defs = snapshot.echoDefs;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-outline text-left font-display text-sm text-fog">
            <th scope="col" className="px-3 py-2 font-semibold">
              Echo
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Cost
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              Lv
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Main
            </th>
            {SUBSTAT_COLUMNS.map((c) => (
              <th key={c.stat} scope="col" title={c.title} className="px-2 py-2 text-right font-semibold">
                {c.header}
              </th>
            ))}
            <th scope="col" className="px-3 py-2 font-semibold">
              Roll
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Other
            </th>
          </tr>
        </thead>
        <tbody>
          {echoes.map((echo) => {
            const issues = echoDefIssues(echo, defs);
            const def = findEchoDef(snapshot, echo.echoDefId);
            const name = echoDisplayName(snapshot, echo);
            const selected = echo.id === selectedId;
            const score = echoScore(echo);
            const others = echo.substats.filter((s) => !COLUMN_STATS.has(s.stat));
            return (
              <tr
                key={echo.id}
                className={`animate-tt-fade border-b-2 border-dashed border-line transition-terminal ${
                  selected ? 'bg-seal-wash' : 'hover:bg-panel-2'
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <GameIcon name={name} iconUrl={def?.iconUrl} tint={sonataTint(echo.sonataId)} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelect(echo.id)}
                        aria-pressed={selected}
                        className="block max-w-44 truncate text-left font-display text-base leading-tight font-semibold text-ink hover:text-accent-text"
                      >
                        {name}
                      </button>
                      <span className="text-xs text-fog">{sonataName(snapshot, echo.sonataId)}</span>
                      {issues.length > 0 && (
                        <p className="text-xs text-amber">Needs re-link: {issues.map((i) => i.message).join(' ')}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1.5 tnum">
                    <CostPips cost={echo.cost} />
                    <span className="text-xs text-fog">C{echo.cost}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-right tnum">{echo.level}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <span className="text-ink">{statLabel(echo.mainStat.stat)}</span>{' '}
                  <span className="font-bold tnum">{formatStatValue(echo.mainStat.stat, echo.mainStat.value)}</span>
                </td>
                {SUBSTAT_COLUMNS.map((c) => {
                  const sub = echo.substats.find((s) => s.stat === c.stat);
                  return (
                    <td key={c.stat} className="px-2 py-2 text-right tnum">
                      {sub === undefined ? <Dash /> : formatStatValue(sub.stat, sub.value)}
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  {score === null ? (
                    <Dash />
                  ) : (
                    <SegmentMeter
                      filled={rollValueBlocks(score)}
                      total={10}
                      label={`Roll value ${Math.round(score)} of 100`}
                    />
                  )}
                </td>
                <td className="px-2 py-2 text-xs whitespace-nowrap text-fog tnum">
                  {others.length === 0 ? (
                    <Dash />
                  ) : (
                    others.map((s) => `${statLabel(s.stat)} ${formatStatValue(s.stat, s.value)}`).join(' · ')
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
