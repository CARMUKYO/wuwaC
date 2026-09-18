import { useState, type FormEvent } from 'react';
import { BUFF_PRESETS, isAutoApplied, resolvePresetMods, type BuffPreset } from '../../data/buffPresets.ts';
import { attributeSchema, statKeySchema, type Attribute, type CharacterData, type StatKey } from '../../data/schema.ts';
import type { EchoSkillHit } from '../../data/echoSkills.ts';
import {
  characterResonanceModes,
  characterStatusBlocks,
  characterTuneRuptureResponses,
  characterUsesHavocBane,
  characterUsesTuneStrain,
  isBuffOnlySkill,
  type ResonanceMode,
} from '../../domain/characterMods.ts';
import { resolveMotion } from '../../domain/damage.ts';
import { JIYAN_OUTRO_LANCE_MV } from '../../domain/jiyan.ts';
import { maxStatusStacks, negativeStatusDef } from '../../domain/negativeStatus.ts';
import type { ActionBlock, BlockResult, RotationBuff } from '../../domain/rotation.ts';
import { blockStartTimes, buffAppliesAt, isBlockStale } from '../../domain/rotation.ts';
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
    | 'echoMotionValue'
    | 'echoFlatDamage'
    | 'echoAttribute'
    | 'echoScaling'
  >
>;

/** Slot-1 echo skill parsed for the "add Echo skill" panel (null = slot 1 empty/unknown). */
export interface MainEchoSkill {
  echoName: string;
  cooldown?: number;
  hits: EchoSkillHit[];
}

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
  /** Slot-1 echo skill for the "add Echo skill" panel. Absent = slot 1 empty/unknown. */
  mainEchoSkill?: MainEchoSkill | null;
  onAddBlock: (
    skillId: string,
    motionName: string,
    forteLevel: number,
    options?: Pick<ActionBlock, 'damageKind' | 'statusType' | 'statusStacks' | 'tuneResponseStacks' | 'tuneBreakMultiplier' | 'echoName' | 'echoMotionValue' | 'echoFlatDamage' | 'echoAttribute' | 'echoScaling' | 'echoCooldown'>,
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
  onSetBlockDuration: (id: string, seconds: number) => void;
  onSetBuffWindow: (id: string, start: number, duration: number) => void;
  onClearBuffWindow: (id: string) => void;
}

/** Compact seconds for timeline display (integers stay clean, float noise trimmed). */
function formatSeconds(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
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
    mainEchoSkill = null,
    onAddBlock, onRemoveBlock, onMoveBlock, onSetBlockForte, onSetBlockStatusStacks, onSetBlockConviction,
    onSetBlockKitState, onToggleBlockBuff, onToggleGlobalBuff, onAddBuff, onRemoveBuff,
    onSetBlockDuration, onSetBuffWindow, onClearBuffWindow,
  } = props;
  const starts = blockStartTimes(blocks);
  const anyTimed = blocks.some((block) => block.durationSeconds !== undefined);
  const totalDuration = blocks.reduce((sum, block) => sum + (block.durationSeconds ?? 0), 0);
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
      ...(selectedPreset.windowSeconds !== undefined ? { windowDurationSeconds: selectedPreset.windowSeconds } : {}),
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
        {totalDuration > 0 && totalDuration > rotationTime && (
          <p role="alert" className="mb-2 text-xs text-amber-300">
            Total block duration {formatSeconds(totalDuration)}s exceeds rotation time {rotationTime}s — out-of-range blocks still score.
          </p>
        )}
        {totalDuration > 0 && totalDuration <= rotationTime && (
          <p className="mb-2 text-xs text-slate-400">
            Total block duration {formatSeconds(totalDuration)}s of {rotationTime}s rotation time.
          </p>
        )}
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
              const echoSkill = block.damageKind === 'echoSkill';
              const specialKind = negativeStatus || tuneBreak || tuneRupture || echoSkill;
              const echoSubtitle = echoSkill
                ? `${((block.echoMotionValue ?? 0) * 100).toFixed(1)}% ${block.echoAttribute ?? '?'}${(block.echoFlatDamage ?? 0) > 0 ? ` +${block.echoFlatDamage}` : ''}${(block.echoScaling ?? 'ATK') !== 'ATK' ? ` [${block.echoScaling}]` : ''}`
                : null;
              const lanceBlock = !specialKind && skill !== undefined &&
                skill.motionValues.length === 0 && !isBuffOnlySkill(character.id, skill);
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
                        {anyTimed && ` @${formatSeconds(starts[index])}s`}
                        {result?.buffCarrier && <span className="text-xs text-slate-400"> (buff carrier)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {negativeStatus
                          ? `${block.statusStacks ?? 1} stack${(block.statusStacks ?? 1) === 1 ? '' : 's'}`
                          : tuneBreak
                            ? `coefficient ${block.tuneBreakMultiplier ?? '—'}`
                            : echoSkill
                              ? (echoSubtitle ?? 'Echo Skill')
                              : lanceBlock
                                ? 'Coordinated lance (one trigger)'
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
                              : echoSkill
                                ? `Echo Skill · ${block.activeBuffIds.length} buff${block.activeBuffIds.length === 1 ? '' : 's'}`
                                : lanceBlock
                                ? `Coordinated lance · ${block.activeBuffIds.length} buff${block.activeBuffIds.length === 1 ? '' : 's'}`
                                : `Forte ${block.forteLevel} · ${block.activeBuffIds.length} buff${block.activeBuffIds.length === 1 ? '' : 's'}`}
                      </summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label htmlFor={`block-duration-${block.id}`} className={labelClass}>Duration (s)</label>
                          <input
                            id={`block-duration-${block.id}`}
                            type="number"
                            min={0}
                            max={3600}
                            step="any"
                            value={block.durationSeconds ?? ''}
                            onChange={(e) => {
                              if (e.target.value.trim() === '') return;
                              const num = Number(e.target.value);
                              if (Number.isFinite(num)) onSetBlockDuration(block.id, num);
                            }}
                            className={`${inputClass} mt-0.5`}
                          />
                        </div>
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
                        ) : echoSkill ? (
                          <>
                            <div>
                              <label htmlFor={`block-echo-mv-${block.id}`} className={labelClass}>Motion value (%)</label>
                              <input
                                id={`block-echo-mv-${block.id}`}
                                type="number"
                                min={0}
                                max={9900}
                                step="any"
                                value={block.echoMotionValue === undefined ? '' : Math.round(block.echoMotionValue * 100 * 1e6) / 1e6}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') return;
                                  const num = Number(e.target.value);
                                  if (Number.isFinite(num)) onSetBlockKitState(block.id, { echoMotionValue: num / 100 });
                                }}
                                className={`${inputClass} mt-0.5`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`block-echo-flat-${block.id}`} className={labelClass}>Flat damage</label>
                              <input
                                id={`block-echo-flat-${block.id}`}
                                type="number"
                                min={0}
                                step="any"
                                value={block.echoFlatDamage ?? 0}
                                onChange={(e) => {
                                  if (e.target.value.trim() === '') return;
                                  const num = Number(e.target.value);
                                  if (Number.isFinite(num)) onSetBlockKitState(block.id, { echoFlatDamage: num });
                                }}
                                className={`${inputClass} mt-0.5`}
                              />
                            </div>
                            <div>
                              <label htmlFor={`block-echo-attr-${block.id}`} className={labelClass}>Damage element</label>
                              <select
                                id={`block-echo-attr-${block.id}`}
                                value={block.echoAttribute ?? 'Havoc'}
                                onChange={(e) => onSetBlockKitState(block.id, { echoAttribute: e.target.value as Attribute })}
                                className={`${inputClass} mt-0.5`}
                              >
                                {attributeSchema.options.map((attr) => (
                                  <option key={attr} value={attr}>{attr}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`block-echo-scaling-${block.id}`} className={labelClass}>Scales off</label>
                              <select
                                id={`block-echo-scaling-${block.id}`}
                                value={block.echoScaling ?? 'ATK'}
                                onChange={(e) => {
                                  const scaling = e.target.value;
                                  if (scaling === 'ATK' || scaling === 'HP' || scaling === 'DEF') {
                                    onSetBlockKitState(block.id, { echoScaling: scaling });
                                  }
                                }}
                                className={`${inputClass} mt-0.5`}
                              >
                                <option value="ATK">ATK</option>
                                <option value="HP">HP</option>
                                <option value="DEF">DEF</option>
                              </select>
                            </div>
                            {block.echoCooldown !== undefined && (
                              <p className="text-xs text-slate-500">
                                Cooldown {block.echoCooldown}s (shown, not simulated).
                              </p>
                            )}
                          </>
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
                              {buffs.map((buff) => {
                                const manual = block.activeBuffIds.includes(buff.id);
                                const inWindow = buffAppliesAt(buff, starts[index]);
                                return (
                                  <label key={buff.id} className="flex items-center gap-2 text-xs text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={manual || inWindow}
                                      disabled={inWindow && !manual}
                                      onChange={() => onToggleBlockBuff(block.id, buff.id)}
                                    />
                                    <span>[{buff.source}] {buff.label}</span>
                                    {inWindow && <span className="rounded bg-slate-800 px-1 text-slate-400">window</span>}
                                  </label>
                                );
                              })}
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
                {character.skills.filter((s) => s.kind === kind).flatMap((skill) => {
                  if (skill.motionValues.length === 0 && !isBuffOnlySkill(character.id, skill)) {
                    // Jiyan's outro lance: buff-carrier-shaped, scores damage.
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        title={`${(JIYAN_OUTRO_LANCE_MV * 100).toFixed(1)}% ATK · Aero + coordinated buckets`}
                        onClick={() => onAddBlock(skill.id, '', forteLevels[skill.id] ?? 10)}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        {skill.label} (coordinated lance)
                      </button>
                    );
                  }
                  return skill.motionValues.length === 0 ? (
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
                  );
                })}
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
        {mainEchoSkill !== null && (
          <div className="mt-3 rounded-md border border-slate-800 p-2">
            <p className="text-xs font-medium text-slate-400">Echo Skill (slot 1: {mainEchoSkill.echoName})</p>
            {mainEchoSkill.hits.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No damaging skill to score — heals, shields, Physical damage, and utility echoes carry no scorable hit.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-slate-500">
                  One block per hit — repeat for multi-hit skills{mainEchoSkill.cooldown !== undefined ? ` (cooldown ${mainEchoSkill.cooldown}s shown, not simulated)` : ''}.
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {mainEchoSkill.hits.map((hit) => (
                    <button
                      key={hit.label}
                      type="button"
                      onClick={() => onAddBlock('', mainEchoSkill.echoName, 1, {
                        damageKind: 'echoSkill',
                        echoName: mainEchoSkill.echoName,
                        echoMotionValue: hit.motionValue,
                        echoFlatDamage: hit.flatDamage,
                        echoAttribute: hit.attribute,
                        echoScaling: hit.scaling,
                        echoCooldown: mainEchoSkill.cooldown,
                      })}
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {mainEchoSkill.hits.length > 1 ? `${hit.label} · ` : ''}{(hit.motionValue * 100).toFixed(1)}% {hit.attribute}
                      {hit.flatDamage > 0 && ` +${hit.flatDamage}`}
                      {hit.scaling !== 'ATK' && ` [${hit.scaling}]`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section aria-label="Buffs" className="rounded-lg border border-slate-800 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold">Buffs</h3>
        {buffs.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            No buffs yet — pick a preset below or add a custom buff with its verified numbers.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {buffs.map((buff) => {
              const hasWindow = buff.windowDurationSeconds !== undefined;
              const windowStart = buff.windowStartSeconds ?? 0;
              const windowEnd = windowStart + (buff.windowDurationSeconds ?? 0);
              return (
                <li key={buff.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex min-w-0 items-center gap-2 text-slate-200">
                      <input
                        type="checkbox"
                        checked={globalBuffIds.includes(buff.id)}
                        onChange={() => onToggleGlobalBuff(buff.id)}
                      />
                      <span className="truncate">
                        [{buff.source}] {buff.label} ({buff.mods.map((m) => `${statLabel(m.stat)} ${toDisplayValue(m.stat, m.value)}`).join(', ')})
                        {hasWindow ? ` — window [${formatSeconds(windowStart)}s, ${formatSeconds(windowEnd)}s)` : ' — full uptime'}
                      </span>
                    </label>
                    <button type="button" onClick={() => onRemoveBuff(buff.id)} className="shrink-0 rounded-md px-2 py-1 text-red-300 hover:bg-slate-800">
                      Remove {buff.label}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 pl-6 text-slate-300">
                    <label htmlFor={`buff-window-start-${buff.id}`}>Window start (s)</label>
                    <input
                      id={`buff-window-start-${buff.id}`}
                      type="number"
                      min={0}
                      max={3600}
                      step="any"
                      value={buff.windowStartSeconds ?? ''}
                      onChange={(e) => {
                        if (e.target.value.trim() === '') return;
                        const num = Number(e.target.value);
                        if (Number.isFinite(num)) onSetBuffWindow(buff.id, num, buff.windowDurationSeconds ?? 0);
                      }}
                      className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                    />
                    <label htmlFor={`buff-window-duration-${buff.id}`}>Window duration (s)</label>
                    <input
                      id={`buff-window-duration-${buff.id}`}
                      type="number"
                      min={0}
                      max={3600}
                      step="any"
                      value={buff.windowDurationSeconds ?? ''}
                      onChange={(e) => {
                        if (e.target.value.trim() === '') return;
                        const num = Number(e.target.value);
                        if (Number.isFinite(num)) onSetBuffWindow(buff.id, buff.windowStartSeconds ?? 0, num);
                      }}
                      className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                    />
                    {hasWindow && (
                      <button
                        type="button"
                        onClick={() => onClearBuffWindow(buff.id)}
                        aria-label={`Clear window for ${buff.label}`}
                        className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800"
                      >
                        Clear window
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
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
        <p className="mt-1 text-xs text-slate-500">RES shred is entered as a negative RES Penetration value.</p>
      </section>
    </div>
  );
}
