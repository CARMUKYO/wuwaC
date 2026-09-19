import { useState, type FormEvent } from 'react';
import { findEchoDef, loadBundledSnapshot } from '../../data/index.ts';
import { MAIN_STAT_RANGES, SUB_STAT_TIERS } from '../../data/echoStats.ts';
import { MAIN_STAT_POOLS, SUBSTAT_POOL } from '../../data/placeholders.ts';
import type { StatKey } from '../../data/schema.ts';
import type { EchoDraft } from '../../state/inventory.ts';
import { isPercentStat, parseDisplayValue, statLabel, toDisplayValue } from '../format.ts';

export interface EchoFormValues {
  echoDefId: string;
  /** Optional nickname; empty falls back to the def name at render. */
  label: string;
  sonataId: string;
  level: string;
  rarity: string;
  mainStat: { stat: StatKey; valueText: string };
  secondMainStat?: { valueText: string };
  substats: { stat: StatKey; valueText: string }[];
}

interface EchoFormProps {
  initial?: EchoFormValues;
  submitLabel: string;
  onSubmit: (draft: EchoDraft) => void | Promise<void>;
}

const COST_FILTERS = [1, 3, 4] as const;

function defaultValues(): EchoFormValues {
  return {
    echoDefId: '',
    label: '',
    sonataId: '',
    level: '25',
    rarity: '5',
    mainStat: { stat: 'atkPct', valueText: '' },
    secondMainStat: { valueText: '' },
    substats: [],
  };
}

function parseLevel(text: string): number {
  const num = Number(text.trim());
  if (!Number.isInteger(num) || num < 0 || num > 25) {
    throw new Error('level must be a whole number from 0 to 25');
  }
  return num;
}

function parseRarity(text: string): number {
  const num = Number(text.trim());
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new Error('rarity must be a whole number from 1 to 5');
  }
  return num;
}

export function EchoForm({ initial, submitLabel, onSubmit }: EchoFormProps) {
  const snapshot = loadBundledSnapshot();
  const [values, setValues] = useState<EchoFormValues>(() => ({
    ...defaultValues(),
    ...initial,
    mainStat: { ...defaultValues().mainStat, ...initial?.mainStat },
    secondMainStat: initial?.secondMainStat ?? { valueText: '' },
    substats: initial?.substats ?? [],
  }));
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState<1 | 3 | 4 | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);

  const def = values.echoDefId === '' ? undefined : findEchoDef(snapshot, values.echoDefId);
  const sonataName = (id: string): string =>
    snapshot.sonataSets.find((s) => s.id === id)?.name ?? id;
  const filteredDefs = snapshot.echoDefs.filter((d) => {
    if (costFilter !== null && d.cost !== costFilter) return false;
    if (search.trim() !== '' && !d.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  // Over-maximum warnings (non-blocking): reference maxima are 5★ Lv25
  // values, so anything above max is impossible at any level/rarity —
  // while below-min is legitimate for unleveled echoes (hence only the
  // top is checked, and submit is never blocked). Pairs the reference
  // does not list (fixed secondaries, healingBonus subs) are unchecked.
  const overMax: string[] = [];
  if (def) {
    const mainMax = MAIN_STAT_RANGES[def.cost][values.mainStat.stat]?.max;
    if (mainMax !== undefined) {
      try {
        const parsed = parseDisplayValue(values.mainStat.stat, values.mainStat.valueText);
        if (parsed > mainMax) {
          overMax.push(
            `Main stat ${toDisplayValue(values.mainStat.stat, parsed)} is above the ${def.cost}-cost reference maximum ${toDisplayValue(values.mainStat.stat, mainMax)} — check the value.`,
          );
        }
      } catch {
        // Submit validation reports unparseable input; no warning needed.
      }
    }
    values.substats.forEach((row, i) => {
      const tiers = SUB_STAT_TIERS[row.stat];
      if (!tiers) return;
      try {
        const parsed = parseDisplayValue(row.stat, row.valueText);
        const top = tiers[tiers.length - 1];
        if (parsed > top) {
          overMax.push(
            `Substat ${i + 1} (${statLabel(row.stat)}) ${toDisplayValue(row.stat, parsed)} is above the reference maximum ${toDisplayValue(row.stat, top)} — check the value.`,
          );
        }
      } catch {
        // Submit validation reports unparseable input; no warning needed.
      }
    });
  }

  /** Picking a (new) def force-fixes derived fields; every change is announced, never silent. */
  const handleDefPick = (echoDefId: string): void => {
    const next = echoDefId === '' ? undefined : findEchoDef(snapshot, echoDefId);
    if (!next) {
      setValues((v) => ({ ...v, echoDefId, sonataId: '' }));
      setNotices([]);
      return;
    }
    const notes: string[] = [`Cost set to ${next.cost} (${next.name}).`];
    const sonataId = next.sonataIds.includes(values.sonataId) ? values.sonataId : next.sonataIds[0];
    if (sonataId !== values.sonataId) {
      notes.push(values.sonataId === '' ? `Sonata set to ${sonataName(sonataId)}.` : `Sonata reset to ${sonataName(sonataId)} — ${next.name} cannot roll the previous set.`);
    }
    const mainStat = next.allowedMainStats.includes(values.mainStat.stat)
      ? values.mainStat
      : { stat: next.allowedMainStats[0], valueText: values.mainStat.valueText };
    if (mainStat.stat !== values.mainStat.stat) {
      notes.push(`Main stat reset to ${statLabel(mainStat.stat)} — ${next.name} cannot roll the previous stat.`);
    }
    setValues((v) => ({ ...v, echoDefId, sonataId, mainStat }));
    setNotices(notes);
  };

  const updateSubstat = (index: number, patch: Partial<{ stat: StatKey; valueText: string }>): void =>
    setValues((v) => ({
      ...v,
      substats: v.substats.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));

  /** Switching a substat's type snaps its value to the first roll tier (when tiered). */
  const handleSubstatType = (index: number, stat: StatKey): void => {
    const tiers = SUB_STAT_TIERS[stat];
    updateSubstat(index, tiers ? { stat, valueText: toDisplayValue(stat, tiers[0]) } : { stat });
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const found: string[] = [];
    const fail = (message: string): void => {
      found.push(message);
    };

    if (!def) fail('Pick an Echo from the list first.');
    const nickname = values.label.trim();

    let level = 0;
    let rarity = 5;
    try {
      level = parseLevel(values.level);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Invalid level.');
    }
    try {
      rarity = parseRarity(values.rarity);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Invalid rarity.');
    }

    if (def && !def.sonataIds.includes(values.sonataId)) {
      fail(`${def.name} cannot roll the sonata set ${JSON.stringify(values.sonataId)}.`);
    }
    if (def && !def.allowedMainStats.includes(values.mainStat.stat)) {
      fail(`${def.name} cannot roll ${statLabel(values.mainStat.stat)} as a main stat.`);
    }

    let mainValue = 0;
    try {
      mainValue = parseDisplayValue(values.mainStat.stat, values.mainStat.valueText);
    } catch {
      fail(`Main stat value is not a valid ${isPercentStat(values.mainStat.stat) ? 'percent' : 'number'}.`);
    }

    // Fixed secondary: flat HP on 1-cost, flat ATK on 3/4 (reference doc §2).
    const secondaryStat = def ? MAIN_STAT_POOLS[def.cost].secondary : null;
    let secondMainStat: EchoDraft['secondMainStat'];
    const secondText = values.secondMainStat?.valueText.trim() ?? '';
    if (secondaryStat && secondText !== '') {
      try {
        secondMainStat = {
          stat: secondaryStat,
          value: parseDisplayValue(secondaryStat, secondText),
        };
      } catch {
        fail('Secondary stat value is not a valid number.');
      }
    }

    const substats: EchoDraft['substats'] = [];
    values.substats.forEach((row, i) => {
      try {
        substats.push({ stat: row.stat, value: parseDisplayValue(row.stat, row.valueText) });
      } catch {
        fail(`Substat ${i + 1} value is not valid.`);
      }
    });
    // Duplicates are a selection error even before values are typed.
    if (new Set(values.substats.map((row) => row.stat)).size !== values.substats.length) {
      fail('Duplicate substats: each substat must be a different stat.');
    }

    if (found.length > 0) {
      setErrors(found);
      return;
    }
    if (!def) return;
    setErrors([]);
    await onSubmit({
      label: nickname === '' ? undefined : nickname,
      echoDefId: def.id,
      sonataId: values.sonataId,
      cost: def.cost,
      level,
      rarity,
      mainStat: { stat: values.mainStat.stat, value: mainValue },
      ...(secondMainStat ? { secondMainStat } : {}),
      substats,
      equippedTo: null,
    });
  };

  const inputClass =
    'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';
  const labelClass = 'block text-xs font-medium text-slate-300';

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      {errors.length > 0 && (
        <div role="alert" className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          <ul className="list-disc pl-5">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {notices.length > 0 && (
        <p role="status" className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
          {notices.join(' ')}
        </p>
      )}
      {overMax.length > 0 && (
        <div role="status" aria-label="Above-reference warnings" className="rounded-md border border-amber-800 bg-amber-950 px-3 py-2 text-sm text-amber-200">
          <ul className="list-disc pl-5">
            {overMax.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <fieldset>
        <legend className={labelClass}>Echo (from game data — cost and pools fill in automatically)</legend>
        <div className="mt-1 flex gap-2">
          <input
            aria-label="Search echoes"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search echoes…"
            className={inputClass}
          />
          <div className="flex shrink-0 gap-1" role="group" aria-label="Cost filter">
            {COST_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={costFilter === c}
                onClick={() => setCostFilter(costFilter === c ? null : c)}
                className={`rounded-md border px-2 py-1 text-xs ${costFilter === c ? 'border-slate-100 bg-slate-100 text-slate-900' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <select
          aria-label="Echo"
          value={values.echoDefId}
          onChange={(e) => handleDefPick(e.target.value)}
          className={`${inputClass} mt-2`}
        >
          <option value="">Pick an Echo…</option>
          {filteredDefs.map((d) => (
            <option key={d.id} value={d.id}>
              {`${d.name} (${d.cost} cost · ${d.sonataIds.map(sonataName).join(' / ')})`}
            </option>
          ))}
        </select>
        {filteredDefs.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">No echoes match — clear the search or cost filter.</p>
        )}
        {def && (
          <div className="mt-2 rounded-md bg-slate-950 p-2 text-xs text-slate-300">
            <p>
              <span className="font-medium text-slate-100">{def.name}</span>
              {' · '}{def.element ?? 'No element'} · Cost {def.cost} · {def.sonataIds.map(sonataName).join(' / ')}
            </p>
            {def.skillDescription && <p className="mt-1 text-slate-400">{def.skillDescription}</p>}
          </div>
        )}
      </fieldset>

      {def && (
        <>
          <div>
            <label htmlFor="echo-nickname" className={labelClass}>Nickname (optional)</label>
            <input
              id="echo-nickname"
              type="text"
              value={values.label}
              onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
              placeholder={def.name}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <span className={labelClass}>Sonata set</span>
              {def.sonataIds.length === 1 ? (
                <p className="mt-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm">{sonataName(def.sonataIds[0])}</p>
              ) : (
                <select
                  aria-label="Sonata set"
                  value={values.sonataId}
                  onChange={(e) => setValues((v) => ({ ...v, sonataId: e.target.value }))}
                  className={`${inputClass} mt-0.5`}
                >
                  {def.sonataIds.map((id) => (
                    <option key={id} value={id}>{sonataName(id)}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <span className={labelClass}>Cost</span>
              <p className="mt-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm">{def.cost} (from {def.name})</p>
            </div>
            <div>
              <label htmlFor="echo-level" className={labelClass}>Level</label>
              <input
                id="echo-level"
                type="number"
                min={0}
                max={25}
                value={values.level}
                onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="echo-rarity" className={labelClass}>Rarity</label>
              <input
                id="echo-rarity"
                type="number"
                min={1}
                max={5}
                value={values.rarity}
                onChange={(e) => setValues((v) => ({ ...v, rarity: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="echo-main-stat" className={labelClass}>Main stat</label>
              <select
                id="echo-main-stat"
                value={values.mainStat.stat}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    mainStat: { stat: e.target.value as StatKey, valueText: v.mainStat.valueText },
                  }))
                }
                className={inputClass}
              >
                {def.allowedMainStats.map((stat) => (
                  <option key={stat} value={stat}>{statLabel(stat)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="echo-main-value" className={labelClass}>
                Main stat value{isPercentStat(values.mainStat.stat) ? ' (%)' : ''}
              </label>
              <input
                id="echo-main-value"
                type="text"
                inputMode="decimal"
                value={values.mainStat.valueText}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    mainStat: { stat: v.mainStat.stat, valueText: e.target.value },
                  }))
                }
                className={inputClass}
              />
              {def && <MainStatSlider defCost={def.cost} stat={values.mainStat.stat} valueText={values.mainStat.valueText} onPick={(valueText) =>
                setValues((v) => ({
                  ...v,
                  mainStat: { stat: v.mainStat.stat, valueText },
                }))
              } />}
            </div>
          </div>

          {MAIN_STAT_POOLS[def.cost].secondary && (
            <div>
              <label htmlFor="echo-second-value" className={labelClass}>
                Secondary stat value ({statLabel(MAIN_STAT_POOLS[def.cost].secondary!)}, optional)
              </label>
              <input
                id="echo-second-value"
                type="text"
                inputMode="decimal"
                value={values.secondMainStat?.valueText ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, secondMainStat: { valueText: e.target.value } }))}
                className={inputClass}
              />
            </div>
          )}

          <fieldset>
            <legend className={labelClass}>Substats (up to 5, no duplicates)</legend>
            <div className="mt-1 space-y-2">
              {values.substats.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <div>
                    <label htmlFor={`substat-${i + 1}-stat`} className={labelClass}>
                      Substat {i + 1} stat
                    </label>
                    <select
                      id={`substat-${i + 1}-stat`}
                      value={row.stat}
                      onChange={(e) => handleSubstatType(i, e.target.value as StatKey)}
                      className={inputClass}
                    >
                      {SUBSTAT_POOL.map((stat) => (
                        <option key={stat} value={stat}>{statLabel(stat)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`substat-${i + 1}-value`} className={labelClass}>
                      Substat {i + 1} value
                    </label>
                    <input
                      id={`substat-${i + 1}-value`}
                      type="text"
                      inputMode="decimal"
                      value={row.valueText}
                      onChange={(e) => updateSubstat(i, { valueText: e.target.value })}
                      className={inputClass}
                    />
                    <SubstatTierSlider
                      index={i}
                      stat={row.stat}
                      valueText={row.valueText}
                      onPick={(valueText) => updateSubstat(i, { valueText })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setValues((v) => ({ ...v, substats: v.substats.filter((_, j) => j !== i) }))
                    }
                    className="rounded-md px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
                  >
                    Remove substat {i + 1}
                  </button>
                </div>
              ))}
            </div>
            {values.substats.length < 5 && (
              <button
                type="button"
                onClick={() =>
                  setValues((v) => ({
                    ...v,
                    substats: [...v.substats, { stat: SUBSTAT_POOL[0], valueText: '' }],
                  }))
                }
                className="mt-2 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Add substat
              </button>
            )}
          </fieldset>
        </>
      )}

      <button
        type="submit"
        className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}

/**
 * Main-stat range slider (5★ Lv25 reference bounds). Convenience only — the
 * text field stays the source of truth, so lower-level echoes keep working.
 * Renders nothing for (cost, stat) pairs the reference does not list.
 */
function MainStatSlider({ defCost, stat, valueText, onPick }: {
  defCost: 1 | 3 | 4;
  stat: StatKey;
  valueText: string;
  onPick: (valueText: string) => void;
}) {
  const range = MAIN_STAT_RANGES[defCost][stat];
  if (!range) return null;
  const percent = isPercentStat(stat);
  // Round to 1 decimal: raw ratio math leaves float dust (0.036*100 =
  // 3.5999999999999996) that breaks slider step alignment in some engines.
  const toDisplay = (stored: number): number =>
    Math.round((percent ? stored * 100 : stored) * 10) / 10;
  const parsed = Number(valueText.trim());
  const displayValue = Number.isFinite(parsed) ? parsed : toDisplay(range.max);
  const step = percent ? 0.1 : 1;
  const snap = (display: number): string =>
    String(percent ? Math.round(display * 10) / 10 : Math.round(display));
  return (
    <div className="mt-1" data-testid="main-stat-slider">
      <input
        aria-label="Main stat slider"
        type="range"
        min={toDisplay(range.min)}
        max={toDisplay(range.max)}
        step={step}
        value={Math.min(Math.max(displayValue, toDisplay(range.min)), toDisplay(range.max))}
        onChange={(e) => onPick(snap(Number(e.target.value)))}
        className="w-full accent-slate-100"
      />
      <p className="text-xs text-slate-500">
        5★ Lv25 reference: {toDisplayValue(stat, range.min)} – {toDisplayValue(stat, range.max)}
      </p>
    </div>
  );
}

/**
 * Substat tier slider — snaps to the exact discrete roll values.
 * Renders nothing for stats without tiers (free numeric input covers them).
 */
function SubstatTierSlider({ index, stat, valueText, onPick }: {
  index: number;
  stat: StatKey;
  valueText: string;
  onPick: (valueText: string) => void;
}) {
  const tiers = SUB_STAT_TIERS[stat];
  if (!tiers) return null;
  const parsed = Number(valueText.trim());
  const target = Number.isFinite(parsed)
    ? isPercentStat(stat) ? parsed / 100 : parsed
    : tiers[0];
  let closest = 0;
  for (let t = 1; t < tiers.length; t += 1) {
    if (Math.abs(tiers[t] - target) < Math.abs(tiers[closest] - target)) closest = t;
  }
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        aria-label={`Substat ${index + 1} tier slider`}
        type="range"
        min={0}
        max={tiers.length - 1}
        step={1}
        value={closest}
        onChange={(e) => onPick(toDisplayValue(stat, tiers[Number(e.target.value)]))}
        className="w-full accent-slate-100"
      />
      <span className="shrink-0 text-xs text-slate-400">
        {toDisplayValue(stat, tiers[closest])} (tier {closest + 1}/{tiers.length})
      </span>
    </div>
  );
}
