import { useState, type FormEvent } from 'react';
import { BUFF_PRESETS, isAutoApplied, resolvePresetMods, type BuffPreset } from '../../data/buffPresets.ts';
import { statKeySchema, type CharacterData, type StatKey } from '../../data/schema.ts';
import {
  characterResonanceModes,
  characterStatusBlocks,
  characterTuneRuptureResponses,
  characterUsesHavocBane,
  characterUsesTuneStrain,
  type ResonanceMode,
} from '../../domain/characterMods.ts';
import { resolveMotion } from '../../domain/damage.ts';
import { maxStatusStacks, negativeStatusDef } from '../../domain/negativeStatus.ts';
import type { ActionBlock, BlockResult, RotationBuff } from '../../domain/rotation.ts';
import { isBlockStale } from '../../domain/rotation.ts';
import { isPercentStat, parseDisplayValue, statLabel, toDisplayValue } from '../format.ts';

type KitStatePatch = Partial<
  Pick<
    ActionBlock,
    | 'targetHavocBaneStacks'
    | 'blazesConsumed'
    | 'nightfallBlazes'
    | 'ringsConsumed'
    | 'voiceFlux'
    | 'wovenMyriad'
    | 'tuneStrainStacks'
    | 'tuneResponseStacks'
    | 'tuneBreakMultiplier'
  >
>;

const KIND_ORDER = ['basic', 'heavy', 'skill', 'liberation', 'intro', 'outro', 'forte', 'echo', 'tunebreak'] as const;
const KIND_LABELS: Record<string, string> = {
  basic: 'Basic Attack',
  heavy: 'Heavy Attack',
  skill: 'Resonance Skill',
  liberation: 'Resonance Liberation',
  intro: 'Intro Skill',
  outro: 'Outro Skill',
  forte: 'Forte Circuit',
  echo: 'Echo Skill',
  tunebreak: 'Tune Break',
};

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';
const labelClass = 'block text-xs font-medium text-slate-300';

interface RotationTimelineProps {
  character: CharacterData;
  resonanceChain: number;
  forteLevels: Record<string, number>;
  resonanceMode: ResonanceMode | null;
  onSetResonanceMode: (mode: ResonanceMode | null) => void;
  blocks: ActionBlock[];
  buffs: RotationBuff[];
  globalBuffIds: string[];
  results: Map<string, BlockResult>;
  dpr: number | null;
  dps: number | null;
  rotationTime: number;
  /** Equipped weapon rank (1-5) for resolving weapon preset series. Defaults to 5. */
  weaponRank?: number;
  onAddBlock: (
    skillId: string,
    motionName: string,
    forteLevel: number,
    options?: Pick<ActionBlock, 'damageKind' | 'statusType' | 'statusStacks' | 'tuneResponseStacks' | 'tuneBreakMultiplier'>,
  ) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: -1 | 1) => void;
  onSetBlockForte: (id: string, forteLevel: number) => void;
  onSetBlockStatusStacks: (id: string, stacks: number) => void;
  onSetBlockConviction: (id: string, conviction: number) => void;
  onSetBlockKitState: (id: string, patch: KitStatePatch) => void;
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
    character, resonanceChain, forteLevels, resonanceMode, onSetResonanceMode, blocks, buffs, globalBuffIds, results, dpr, dps, rotationTime,
    weaponRank = 5,
    onAddBlock, onRemoveBlock, onMoveBlock, onSetBlockForte, onSetBlockStatusStacks, onSetBlockConviction,
    onSetBlockKitState, onToggleBlockBuff, onToggleGlobalBuff, onAddBuff, onRemoveBuff,
  } = props;
  const statusOptions = characterStatusBlocks(character.id);
  const baneCharacter = characterUsesHavocBane(character.id);
  const strainCharacter = characterUsesTuneStrain(character.id);
  const ruptureResponses = characterTuneRuptureResponses(character.id);
  const resonanceModes = characterResonanceModes(character.id);
  const RESONANCE_MODE_LABELS: Record<ResonanceMode, string> = {
    tuneRupture: 'Tune Rupture',
    fusionBurst: 'Fusion Burst',
    tuneStrain: 'Tune Strain',
  };
  const [buffError, setBuffError] = useState<string | null>(null);
  const [buffLabel, setBuffLabel] = useState('');
  const [buffSource, setBuffSource] = useState('');
  const [buffStat, setBuffStat] = useState<StatKey>('atkPct');
  const [buffValue, setBuffValue] = useState('');
  const [buffStat2, setBuffStat2] = useState<StatKey>('dmgBonus:basic');
  const [buffValue2, setBuffValue2] = useState('');
  const [presetId, setPresetId] = useState('');

  const kinds = KIND_ORDER.filter((kind) => character.skills.some((s) => s.kind === kind));

  type ParsedMod = { ok: true; mod: { stat: StatKey; value: number } | null } | { ok: false };
  const parseBuffMod = (stat: StatKey, text: string): ParsedMod => {
    if (text.trim() === '') return { ok: true, mod: null };
    try {
      return { ok: true, mod: { stat, value: parseDisplayValue(stat, text) } };
    } catch {
      setBuffError(`Buff value is not a valid ${isPercentStat(stat) ? 'percent' : 'number'}.`);
      return { ok: false };
    }
  };

  const handleAddBuff = (event: FormEvent): void => {
    event.preventDefault();
    const label = buffLabel.trim();
    if (label === '') {
      setBuffError('Buff name is required.');
      return;
    }
    setBuffError(null);
    const first = parseBuffMod(buffStat, buffValue);
    if (!first.ok || first.mod === null) {
      if (first.ok) setBuffError('Buff value is required.');
      return;
    }
    const second = parseBuffMod(buffStat2, buffValue2);
    if (!second.ok) return;
    const mods = second.mod === null ? [first.mod] : [first.mod, second.mod];
    onAddBuff({ label, source: buffSource.trim() === '' ? 'Custom' : buffSource.trim(), mods });
    setBuffLabel('');
    setBuffSource('');
    setBuffValue('');
    setBuffValue2('');
  };

  const selectedPreset: BuffPreset | undefined = BUFF_PRESETS.find((p) => p.id === presetId);

  const handleAddPreset = (): void => {
    if (!selectedPreset) return;
    const mods = resolvePresetMods(selectedPreset, { weaponRank, attribute: character.attribute });
    onAddBuff({
      label: selectedPreset.label,
      source: `${selectedPreset.source} preset`,
      mods,
    });
    setPresetId('');
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
              const statusLabel = block.statusType ? negativeStatusDef(block.statusType).label : null;
              const tuneBreak = block.damageKind === 'tuneBreak';
              const tuneRupture = block.damageKind === 'tuneRupture';
              const specialKind = negativeStatus || tuneBreak || tuneRupture;
              const blockLabel = specialKind
                ? (result?.label ?? (statusLabel ? `${statusLabel} DMG` : block.motionName !== '' ? `${block.motionName} (Tune)` : 'Tune Break DMG'))
                : (skill?.label ?? block.skillId);
              const skillKind = skill?.kind;
              const blockCap = maxStatusStacks(block.statusType ?? 'aeroErosion', character.id, resonanceChain);
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
                          : tuneBreak
                            ? `coefficient ${block.tuneBreakMultiplier ?? '—'}`
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
                          ? `${statusLabel ?? 'Status'} · ${block.statusStacks ?? 1} stack${(block.statusStacks ?? 1) === 1 ? '' : 's'}`
                          : tuneBreak
                            ? `Tune Break ×${block.tuneBreakMultiplier ?? '—'}`
                            : tuneRupture
                              ? `${block.motionName} · ${block.tuneResponseStacks ?? 0} trail stacks`
                              : `Forte ${block.forteLevel} · ${block.activeBuffIds.length} buff${block.activeBuffIds.length === 1 ? '' : 's'}`}
                      </summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {tuneBreak ? (
                          <div>
                            <label htmlFor={`block-break-mult-${block.id}`} className={labelClass}>Tune Break coefficient (unverified — your research)</label>
                            <input
                              id={`block-break-mult-${block.id}`}
                              type="number"
                              min={0}
                              max={99}
                              step="any"
                              value={block.tuneBreakMultiplier ?? ''}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isFinite(num)) onSetBlockKitState(block.id, { tuneBreakMultiplier: num });
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        ) : tuneRupture ? (
                          <>
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
                            <div>
                              <label htmlFor={`block-response-stacks-${block.id}`} className={labelClass}>Trail stacks consumed</label>
                              <input
                                id={`block-response-stacks-${block.id}`}
                                type="number"
                                min={0}
                                max={99}
                                value={block.tuneResponseStacks ?? 0}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') return;
                                  const num = Number(e.target.value);
                                  if (Number.isInteger(num)) onSetBlockKitState(block.id, { tuneResponseStacks: num });
                                }}
                                className={`${inputClass} mt-0.5`}
                              />
                            </div>
                          </>
                        ) : negativeStatus ? (
                          <div>
                            <label htmlFor={`block-status-stacks-${block.id}`} className={labelClass}>{statusLabel ?? 'Status'} stacks</label>
                            <input
                              id={`block-status-stacks-${block.id}`}
                              type="number"
                              min={1}
                              max={blockCap}
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
                        {!specialKind && character.id === 'cartethyia' && (
                          <div>
                            <label htmlFor={`target-status-stacks-${block.id}`} className={labelClass}>Target Aero Erosion stacks</label>
                            <input
                              id={`target-status-stacks-${block.id}`}
                              type="number"
                              min={0}
                              max={maxStatusStacks('aeroErosion', character.id, resonanceChain)}
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
                        {!specialKind && strainCharacter && (
                          <div>
                            <label htmlFor={`tune-strain-stacks-${block.id}`} className={labelClass}>Tune Strain stacks on target</label>
                            <input
                              id={`tune-strain-stacks-${block.id}`}
                              type="number"
                              min={0}
                              max={10}
                              value={block.tuneStrainStacks ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockKitState(block.id, { tuneStrainStacks: num });
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!specialKind && baneCharacter && (
                          <div>
                            <label htmlFor={`target-bane-stacks-${block.id}`} className={labelClass}>Target Havoc Bane stacks</label>
                            <input
                              id={`target-bane-stacks-${block.id}`}
                              type="number"
                              min={0}
                              max={maxStatusStacks('havocBane', character.id, resonanceChain)}
                              value={block.targetHavocBaneStacks ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockKitState(block.id, { targetHavocBaneStacks: num });
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!specialKind && character.id === 'zani' && skillKind === 'liberation' && (
                          <div>
                            <label htmlFor={`blazes-consumed-${block.id}`} className={labelClass}>Blazes consumed (S3)</label>
                            <input
                              id={`blazes-consumed-${block.id}`}
                              type="number"
                              min={0}
                              max={150}
                              value={block.blazesConsumed ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockKitState(block.id, { blazesConsumed: num });
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!specialKind && character.id === 'zani' && skillKind === 'forte' && (
                          <div>
                            <label htmlFor={`nightfall-blazes-${block.id}`} className={labelClass}>Blazes on Nightfall hit (S6)</label>
                            <input
                              id={`nightfall-blazes-${block.id}`}
                              type="number"
                              min={0}
                              max={40}
                              value={block.nightfallBlazes ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockKitState(block.id, { nightfallBlazes: num });
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!specialKind && character.id === 'yangyang-xuanling' && (
                          <label className="flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={block.voiceFlux ?? false}
                              onChange={() => onSetBlockKitState(block.id, { voiceFlux: !(block.voiceFlux ?? false) })}
                            />
                            <span>Voice Flux active (S6 Heavy +40%)</span>
                          </label>
                        )}
                        {!specialKind && character.id === 'chisa' && skillKind === 'forte' && (
                          <div>
                            <label className="flex items-center gap-2 text-xs text-slate-300">
                              <input
                                type="checkbox"
                                checked={block.wovenMyriad ?? false}
                                onChange={() => onSetBlockKitState(block.id, { wovenMyriad: !(block.wovenMyriad ?? false) })}
                              />
                              <span>Woven Myriad active (Liberation state)</span>
                            </label>
                            <label htmlFor={`rings-consumed-${block.id}`} className={`${labelClass} mt-2`}>Rings consumed (Eradication)</label>
                            <input
                              id={`rings-consumed-${block.id}`}
                              type="number"
                              min={0}
                              max={99}
                              value={block.ringsConsumed ?? 0}
                              onChange={(e) => {
                                if (e.target.value.trim() === '') return;
                                const num = Number(e.target.value);
                                if (Number.isInteger(num)) onSetBlockKitState(block.id, { ringsConsumed: num });
                              }}
                              className={`${inputClass} mt-0.5`}
                            />
                          </div>
                        )}
                        {!specialKind && character.id === 'cartethyia' && character.skills.find((s) => s.id === block.skillId)?.kind === 'forte' && (
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
        {resonanceModes.length > 0 && (
          <div className="mt-2 rounded-md border border-slate-800 p-2">
            <p className="text-xs font-medium text-slate-400">Resonance Mode</p>
            <p className="mt-1 text-xs text-slate-500">
              This kit scores differently per mode — pick the one this rotation runs.
            </p>
            <div className="mt-1 flex flex-wrap gap-1" role="radiogroup" aria-label="Resonance Mode">
              {resonanceModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={resonanceMode === mode}
                  onClick={() => onSetResonanceMode(mode)}
                  className={`rounded-md border px-2 py-1 text-xs hover:bg-slate-800 ${
                    resonanceMode === mode
                      ? 'border-sky-500 text-sky-200'
                      : 'border-slate-700 text-slate-200'
                  }`}
                >
                  {RESONANCE_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        )}
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
        {statusOptions.map((status) => {
          const def = negativeStatusDef(status);
          const cap = maxStatusStacks(status, character.id, resonanceChain);
          return (
            <div key={status} className="mt-3 rounded-md border border-slate-800 p-2">
              <p className="text-xs font-medium text-slate-400">Negative Status DMG</p>
              <p className="mt-1 text-xs text-slate-500">
                {def.label} ignores {def.element}/action DMG bonuses and Crit. Its damage is resolved from the selected stack count.
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from({ length: cap }, (_, i) => i + 1).map((stacks) => (
                  <button
                    key={stacks}
                    type="button"
                    onClick={() => onAddBlock('', `${def.label} DMG`, 1, {
                      damageKind: 'negativeStatus',
                      statusType: status,
                      statusStacks: stacks,
                    })}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    {def.label} ×{stacks}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {ruptureResponses.length > 0 && resonanceMode === 'tuneRupture' && (
          <div className="mt-3 rounded-md border border-slate-800 p-2">
            <p className="text-xs font-medium text-slate-400">Tune Rupture Response (provisional)</p>
            <p className="mt-1 text-xs text-slate-500">
              Response instances use the snapshot MV with trail scaling, no base Crit, and no verified formula — tune the trail count per block.
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {ruptureResponses.map((motionName) => {
                const skill = character.skills.find((s) => s.motionValues.some((m) => m.name === motionName));
                if (!skill) return null;
                return (
                  <button
                    key={motionName}
                    type="button"
                    onClick={() => onAddBlock(skill.id, motionName, forteLevels[skill.id] ?? 10, {
                      damageKind: 'tuneRupture',
                      tuneResponseStacks: 0,
                    })}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    {motionName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-3 rounded-md border border-slate-800 p-2">
          <p className="text-xs font-medium text-slate-400">Tune Break (provisional)</p>
          <p className="mt-1 text-xs text-slate-500">
            Mistuned-target break hit: provisional base-10000 shape, no verified formula or coefficients — set the coefficient per block from your own research.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onAddBlock('', 'Tune Break DMG', 1, {
                damageKind: 'tuneBreak',
                tuneBreakMultiplier: 1,
              })}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              Tune Break ×1.0
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Buffs" className="rounded-lg border border-slate-800 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold">Buffs</h3>
        {buffs.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            No buffs yet — pick a preset below or add a custom buff with its verified numbers.
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
                    [{buff.source}] {buff.label} ({buff.mods.map((m) => `${statLabel(m.stat)} ${toDisplayValue(m.stat, m.value)}`).join(', ')}) — full uptime
                  </span>
                </label>
                <button type="button" onClick={() => onRemoveBuff(buff.id)} className="shrink-0 rounded-md px-2 py-1 text-red-300 hover:bg-slate-800">
                  Remove {buff.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="buff-preset" className={labelClass}>Preset (Echo / Sonata / Weapon)</label>
            <select id="buff-preset" value={presetId} onChange={(e) => setPresetId(e.target.value)} className={`${inputClass} mt-0.5`}>
              <option value="">Pick a preset…</option>
              {(['Echo', 'Sonata', 'Weapon'] as const).map((source) => (
                <optgroup key={source} label={source}>
                  {BUFF_PRESETS.filter((p) => p.source === source && !isAutoApplied(p)).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={handleAddPreset} disabled={presetId === ''} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40">
              Add preset
            </button>
          </div>
        </div>
        {selectedPreset?.assumption && (
          <p className="mt-1 text-xs text-slate-500">{selectedPreset.label}: {selectedPreset.assumption}</p>
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
          <div>
            <label htmlFor="buff-stat-2" className={labelClass}>Second stat (optional)</label>
            <select id="buff-stat-2" value={buffStat2} onChange={(e) => setBuffStat2(e.target.value as StatKey)} className={`${inputClass} mt-0.5`}>
              {statKeySchema.options.map((stat) => (
                <option key={stat} value={stat}>{statLabel(stat)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="buff-value-2" className={labelClass}>Second value{isPercentStat(buffStat2) ? ' (%)' : ''}</label>
            <input id="buff-value-2" type="text" inputMode="decimal" value={buffValue2} onChange={(e) => setBuffValue2(e.target.value)} className={`${inputClass} mt-0.5`} />
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
