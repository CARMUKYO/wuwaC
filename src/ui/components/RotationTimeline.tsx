import { useState, type FormEvent } from 'react';
import { statKeySchema, type CharacterData, type StatKey } from '../../data/schema.ts';
import { resolveMotion } from '../../domain/damage.ts';
import { maxAeroErosionStacks } from '../../domain/cartethyia.ts';
import type { ActionBlock, BlockResult, RotationBuff } from '../../domain/rotation.ts';
import { isBlockStale } from '../../domain/rotation.ts';
import { isPercentStat, parseDisplayValue, statLabel } from '../format.ts';

const KIND_ORDER = ['basic', 'heavy', 'skill', 'liberation', 'intro', 'outro', 'forte', 'echo'] as const;
const KIND_LABELS: Record<string, string> = {
  basic: 'Basic Attack',
  heavy: 'Heavy Attack',
  skill: 'Resonance Skill',
  liberation: 'Resonance Liberation',
  intro: 'Intro Skill',
  outro: 'Outro Skill',
  forte: 'Forte Circuit',
  echo: 'Echo Skill',
};

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';
const labelClass = 'block text-xs font-medium text-slate-300';

interface RotationTimelineProps {
  character: CharacterData;
  resonanceChain: number;
  forteLevels: Record<string, number>;
  blocks: ActionBlock[];
  buffs: RotationBuff[];
  globalBuffIds: string[];
  results: Map<string, BlockResult>;
  dpr: number | null;
  dps: number | null;
  rotationTime: number;
  onAddBlock: (
    skillId: string,
    motionName: string,
    forteLevel: number,
    options?: Pick<ActionBlock, 'damageKind' | 'statusType' | 'statusStacks'>,
  ) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: -1 | 1) => void;
  onSetBlockForte: (id: string, forteLevel: number) => void;
  onSetBlockStatusStacks: (id: string, stacks: number) => void;
  onSetBlockConviction: (id: string, conviction: number) => void;
  onToggleBlockBuff: (blockId: string, buffId: string) => void;
  onToggleGlobalBuff: (id: string) => void;
  onAddBuff: (buff: Omit<RotationBuff, 'id'>) => void;
  onRemoveBuff: (id: string) => void;
}

function motionPercent(skill: CharacterData['skills'][number], motionName: string, forteLevel: number): string {
  const motion = resolveMotion(skill, motionName, forteLevel);
  const pct = (motion.ratio * 100).toFixed(1);
  return motion.hits > 1 ? `${pct}% (×${motion.hits})` : `${pct}%`;
}

/** Healing motions score 0 damage — hidden from the action picker (name fallback covers legacy data). */
function isHealingMotionRow(
  motion: CharacterData['skills'][number]['motionValues'][number],
): boolean {
  return motion.isHealing ?? /healing/i.test(motion.name);
}

/** Tooltip extras: scaling stat + true bonus bucket when it differs from the skill kind. */
function motionTitle(
  skill: CharacterData['skills'][number],
  motion: CharacterData['skills'][number]['motionValues'][number],
  forteLevel: number,
): string {
  const parts = [motionPercent(skill, motion.name, forteLevel)];
  const scaling = motion.scaling ?? skill.scaling;
  if (scaling !== 'ATK') parts.push(`scales off ${scaling}`);
  const bucket = motion.dmgType ?? skill.kind;
  if (bucket !== skill.kind) parts.push(`scores as ${KIND_LABELS[bucket] ?? bucket} DMG Bonus`);
  return parts.join(' · ');
}

/** Per-motion scaling tag (falls back to the skill default for legacy data). */
function motionScaling(
  skill: CharacterData['skills'][number],
  motion: CharacterData['skills'][number]['motionValues'][number],
): string {
  return motion.scaling ?? skill.scaling;
}

export function RotationTimeline(props: RotationTimelineProps) {
  const {
    character, resonanceChain, forteLevels, blocks, buffs, globalBuffIds, results, dpr, dps, rotationTime,
    onAddBlock, onRemoveBlock, onMoveBlock, onSetBlockForte, onSetBlockStatusStacks, onSetBlockConviction,
    onToggleBlockBuff, onToggleGlobalBuff, onAddBuff, onRemoveBuff,
  } = props;
  const [buffError, setBuffError] = useState<string | null>(null);
  const [buffLabel, setBuffLabel] = useState('');
  const [buffSource, setBuffSource] = useState('');
  const [buffStat, setBuffStat] = useState<StatKey>('atkPct');
  const [buffValue, setBuffValue] = useState('');

  const kinds = KIND_ORDER.filter((kind) => character.skills.some((s) => s.kind === kind));

  const handleAddBuff = (event: FormEvent): void => {
    event.preventDefault();
    const label = buffLabel.trim();
    if (label === '') {
      setBuffError('Buff name is required.');
      return;
    }
    let value = 0;
    try {
      value = parseDisplayValue(buffStat, buffValue);
    } catch {
      setBuffError(`Buff value is not a valid ${isPercentStat(buffStat) ? 'percent' : 'number'}.`);
      return;
    }
    setBuffError(null);
    onAddBuff({ label, source: buffSource.trim() === '' ? 'Custom' : buffSource.trim(), mods: [{ stat: buffStat, value }] });
    setBuffLabel('');
    setBuffSource('');
    setBuffValue('');
  };

  return (
    <div className="space-y-4">
      {dpr !== null && dps !== null && (
        <div aria-label="Rotation results" className="grid grid-cols-3 gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <div>
            <p className="text-xs text-slate-400">DPR</p>
            <p className="text-lg font-bold">{Math.round(dpr).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">DPS</p>
            <p className="text-lg font-bold">{Math.round(dps).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Time</p>
            <p className="text-lg font-bold">{rotationTime}s</p>
          </div>
        </div>
      )}

      <section aria-label="Rotation timeline">
        {blocks.length === 0 ? (
          <p className="text-slate-400">No actions yet — add your first hit below to start the rotation.</p>
        ) : (
          <ol className="space-y-2">
            {blocks.map((block, index) => {
              const negativeStatus = block.damageKind === 'negativeStatus';
              const stale = negativeStatus ? false : isBlockStale(character, block);
              const result = results.get(block.id);
              const skill = character.skills.find((s) => s.id === block.skillId);
              const blockLabel = negativeStatus ? 'Aero Erosion DMG' : (skill?.label ?? block.skillId);
              return (
                <li key={block.id} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {index + 1}. {blockLabel}
                        {result?.buffCarrier && <span className="text-xs text-slate-400"> (buff carrier)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {negativeStatus
                          ? `${block.statusStacks ?? 1} stack${(block.statusStacks ?? 1) === 1 ? '' : 's'}`
                          : block.motionName === '' ? 'No damage component' : block.motionName}
                        {result && !result.buffCarrier && ` · ${Math.round(result.damage).toLocaleString()} dmg · ${result.share.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" aria-label={`Move ${block.motionName || 'block'} up`} disabled={index === 0} onClick={() => onMoveBlock(block.id, -1)} className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-30">↑</button>
                      <button type="button" aria-label={`Move ${block.motionName || 'block'} down`} disabled={index === blocks.length - 1} onClick={() => onMoveBlock(block.id, 1)} className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => onRemoveBlock(block.id)} className="rounded-md px-2 py-1 text-sm text-red-300 hover:bg-slate-800">Remove</button>
                    </div>
                  </div>
                  {result && !result.buffCarrier && (
                    <div className="mt-1 h-1.5 rounded-full bg-slate-800" aria-hidden="true">
                      <div className="h-1.5 rounded-full bg-slate-100" style={{ width: `${Math.min(100, result.share)}%` }} />
                    </div>
                  )}
                  {stale ? (
                    <p role="alert" className="mt-1 text-xs text-amber-300">
                      This action is not on {character.name}’s kit — remove it or switch back.
                    </p>
                  ) : (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-slate-400">
                        {negativeStatus
                          ? `Aero Erosion · ${block.statusStacks ?? 1} stack${(block.statusStacks ?? 1) === 1 ? '' : 's'}`
                          : `Forte ${block.forteLevel} · ${block.activeBuffIds.length} buff${block.activeBuffIds.length === 1 ? '' : 's'}`}
                      </summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {negativeStatus ? (
                          <div>
                            <label htmlFor={`block-status-stacks-${block.id}`} className={labelClass}>Aero Erosion stacks</label>
                            <input
                              id={`block-status-stacks-${block.id}`}
                              type="number"
                              min={1}
                              max={maxAeroErosionStacks(resonanceChain)}
                              value={block.statusStacks ?? 1}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockStatusStacks(block.id, num);
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        ) : (
                          <div>
                            <label htmlFor={`block-forte-${block.id}`} className={labelClass}>Forte level</label>
                            <input
                              id={`block-forte-${block.id}`}
                              type="number"
                              min={1}
                              max={10}
                              value={block.forteLevel}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockForte(block.id, num);
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!negativeStatus && character.id === 'cartethyia' && (
                          <div>
                            <label htmlFor={`target-status-stacks-${block.id}`} className={labelClass}>Target Aero Erosion stacks</label>
                            <input
                              id={`target-status-stacks-${block.id}`}
                              type="number"
                              min={0}
                              max={maxAeroErosionStacks(resonanceChain)}
                              value={block.targetStatusStacks ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockStatusStacks(block.id, num);
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!negativeStatus && character.id === 'cartethyia' && character.skills.find((s) => s.id === block.skillId)?.kind === 'forte' && (
                          <div>
                            <label htmlFor={`conviction-${block.id}`} className={labelClass}>Fleurdelys Conviction (S1)</label>
                            <input
                              id={`conviction-${block.id}`}
                              type="number"
                              min={0}
                              max={120}
                              value={block.conviction ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockConviction(block.id, num);
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        <fieldset>
                          <legend className={labelClass}>Buffs on this action</legend>
                          {buffs.length === 0 ? (
                            <p className="mt-0.5 text-xs text-slate-500">No buffs yet — add one below.</p>
                          ) : (
                            <div className="mt-1 space-y-1">
                              {buffs.map((buff) => (
                                <label key={buff.id} className="flex items-center gap-2 text-xs text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={block.activeBuffIds.includes(buff.id)}
                                    onChange={() => onToggleBlockBuff(block.id, buff.id)}
                                  />
                                  <span>[{buff.source}] {buff.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </fieldset>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-label="Add actions">
        <h3 className="text-sm font-semibold">Add Actions</h3>
        <div className="mt-2 space-y-3">
          {kinds.map((kind) => (
            <div key={kind}>
              <p className="text-xs font-medium text-slate-400">{KIND_LABELS[kind]}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {character.skills.filter((s) => s.kind === kind).flatMap((skill) =>
                  skill.motionValues.length === 0 ? (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => onAddBlock(skill.id, '', forteLevels[skill.id] ?? 10)}
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {skill.label} (buff carrier)
                    </button>
                  ) : (
                    skill.motionValues.filter((motion) => !isHealingMotionRow(motion)).map((motion) => (
                      <button
                        key={`${skill.id}:${motion.name}`}
                        type="button"
                        title={motionTitle(skill, motion, forteLevels[skill.id] ?? 10)}
                        onClick={() => onAddBlock(skill.id, motion.name, forteLevels[skill.id] ?? 10)}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        {motion.name} · {motionPercent(skill, motion.name, forteLevels[skill.id] ?? 10)}
                        {motionScaling(skill, motion) !== 'ATK' && ` [${motionScaling(skill, motion)}]`}
                        {(motion.dmgType ?? skill.kind) !== skill.kind && ` (${KIND_LABELS[motion.dmgType ?? skill.kind] ?? motion.dmgType} bonus)`}
                      </button>
                    ))
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        {character.id === 'cartethyia' && (
          <div className="mt-3 rounded-md border border-slate-800 p-2">
            <p className="text-xs font-medium text-slate-400">Negative Status DMG</p>
            <p className="mt-1 text-xs text-slate-500">
              Aero Erosion ignores Aero/action DMG bonuses and Crit. Its damage is resolved from the selected stack count.
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {Array.from({ length: maxAeroErosionStacks(resonanceChain) }, (_, i) => i + 1).map((stacks) => (
                <button
                  key={stacks}
                  type="button"
                  onClick={() => onAddBlock('', 'Aero Erosion DMG', 1, {
                    damageKind: 'negativeStatus',
                    statusType: 'aeroErosion',
                    statusStacks: stacks,
                  })}
                  className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Aero Erosion ×{stacks}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section aria-label="Buffs" className="rounded-lg border border-slate-800 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold">Buffs</h3>
        {buffs.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            No buffs yet — game-text buffs stay manual (never parsed from prose), so add them with their verified numbers.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {buffs.map((buff) => (
              <li key={buff.id} className="flex items-center justify-between gap-2 text-xs">
                <label className="flex min-w-0 items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={globalBuffIds.includes(buff.id)}
                    onChange={() => onToggleGlobalBuff(buff.id)}
                  />
                  <span className="truncate">
                    [{buff.source}] {buff.label} ({buff.mods.map((m) => `${statLabel(m.stat)}`).join(', ')}) — full uptime
                  </span>
                </label>
                <button type="button" onClick={() => onRemoveBuff(buff.id)} className="shrink-0 rounded-md px-2 py-1 text-red-300 hover:bg-slate-800">
                  Remove {buff.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddBuff} className="mt-3 grid gap-2 md:grid-cols-4">
          <div>
            <label htmlFor="buff-label" className={labelClass}>Buff name</label>
            <input id="buff-label" type="text" value={buffLabel} onChange={(e) => setBuffLabel(e.target.value)} placeholder="Verina Outro" className={`${inputClass} mt-0.5`} />
          </div>
          <div>
            <label htmlFor="buff-source" className={labelClass}>Source</label>
            <input id="buff-source" type="text" value={buffSource} onChange={(e) => setBuffSource(e.target.value)} placeholder="Teammate" className={`${inputClass} mt-0.5`} />
          </div>
          <div>
            <label htmlFor="buff-stat" className={labelClass}>Stat</label>
            <select id="buff-stat" value={buffStat} onChange={(e) => setBuffStat(e.target.value as StatKey)} className={`${inputClass} mt-0.5`}>
              {statKeySchema.options.map((stat) => (
                <option key={stat} value={stat}>{statLabel(stat)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="buff-value" className={labelClass}>Value{isPercentStat(buffStat) ? ' (%)' : ''}</label>
            <input id="buff-value" type="text" inputMode="decimal" value={buffValue} onChange={(e) => setBuffValue(e.target.value)} className={`${inputClass} mt-0.5`} />
          </div>
        </form>
        {buffError && <div role="alert" className="mt-2 text-xs text-red-300">{buffError}</div>}
        <button type="button" onClick={(e) => handleAddBuff(e as unknown as FormEvent)} className="mt-2 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
          Add buff
        </button>
      </section>
    </div>
  );
}
