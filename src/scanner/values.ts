import { MAIN_STAT_RANGES, SECONDARY_MAIN_STAT_MAX, SUB_STAT_TIERS } from '../data/echoStats.ts';
import type { StatKey } from '../data/schema.ts';

/**
 * Scanner layer: read and validate the numbers on an Echo panel.
 *
 * Every value the game can show is constrained — substats are discrete
 * tiers, main stats sit inside per-cost ranges, and at 5★ +25 both main
 * stats are exact maxima. A read is classified, never silently fixed:
 * - `exact`: the OCR text is a value the game can show for this stat.
 * - `repaired`: the text was not valid, but exactly one documented OCR
 *   slip (dropped decimal point, stray/dropped `%`) turns it into a valid
 *   value. The UI flags these for a glance.
 * - `unverified`: plausible (in range) but there is no exact table for it
 *   (e.g. a main stat below +25, where the level curve is unsourced).
 * - `invalid`: nothing valid could be derived; `suggestion` is the
 *   nearest legal value as a pre-fill for review, never auto-accepted.
 */

export type ReadStatus = 'exact' | 'repaired' | 'unverified' | 'invalid';

export interface NumberToken {
  /** Parsed number in display units (22.0% -> 22, 150 -> 150). */
  value: number;
  /** Digits after the decimal point as read. */
  decimals: number;
  percent: boolean;
  raw: string;
}

/** Labels like "ATK" name a flat/percent pair; the value decides which. */
export type StatFamily = { kind: 'single'; stat: StatKey } | { kind: 'pair'; flat: StatKey; pct: StatKey };

export interface StatRead {
  stat: StatKey;
  /** Stored units (ratios as decimals, flats raw) — what `OwnedEcho` holds. */
  value: number;
  status: Exclude<ReadStatus, 'invalid'>;
  note?: string;
}

export type ValueRead = StatRead | { status: 'invalid'; note: string; suggestion?: { stat: StatKey; value: number } };

const FLAT_STATS: ReadonlySet<StatKey> = new Set<StatKey>(['hp', 'atk', 'def']);

/** True for stats stored as raw numbers rather than ratios. */
export function isFlatStat(stat: StatKey): boolean {
  return FLAT_STATS.has(stat);
}

/** Stored units -> display units, trimming float dust (0.094 -> 9.4). */
export function toDisplay(stat: StatKey, stored: number): number {
  return isFlatStat(stat) ? stored : Math.round(stored * 1000) / 10;
}

/** Display units -> stored units (9.4 -> 0.094). */
export function toStored(stat: StatKey, display: number): number {
  return isFlatStat(stat) ? display : Math.round(display * 10) / 1000;
}

const NUMBER_RE = /^(\d{1,4})(?:\.(\d{1,2}))?(%)?$/;

/**
 * Parse one OCR'd value token. Normalizes the slips tesseract makes on
 * this font: letter O for zero, l/I/| for one, comma for the decimal
 * point, a degree sign or space before `%`. Null when the result is not
 * a plain number.
 */
export function parseNumberToken(raw: string): NumberToken | null {
  const cleaned = raw
    .trim()
    .replace(/[Oo]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/,/g, '.')
    .replace(/[°º\s]/g, '')
    .replace(/％/g, '%');
  const m = NUMBER_RE.exec(cleaned);
  if (m === null) return null;
  const decimals = m[2]?.length ?? 0;
  return { value: Number(`${m[1]}${decimals > 0 ? `.${m[2]}` : ''}`), decimals, percent: m[3] === '%', raw };
}

function familyStats(family: StatFamily): StatKey[] {
  return family.kind === 'single' ? [family.stat] : [family.flat, family.pct];
}

function sameDisplay(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

/** Can `token` be a literal reading of a value of `stat` (unit-wise)? */
function unitFits(stat: StatKey, token: NumberToken): boolean {
  return isFlatStat(stat) ? !token.percent && token.decimals === 0 : true;
}

function tierDisplays(stat: StatKey): number[] {
  return (SUB_STAT_TIERS[stat] ?? []).map((t) => toDisplay(stat, t));
}

function nearestTier(stats: StatKey[], value: number): { stat: StatKey; value: number } | undefined {
  let best: { stat: StatKey; value: number; gap: number } | undefined;
  for (const stat of stats) {
    for (const display of tierDisplays(stat)) {
      const gap = Math.abs(display - value) / Math.max(display, 1);
      if (best === undefined || gap < best.gap) best = { stat, value: toStored(stat, display), gap };
    }
  }
  return best === undefined ? undefined : { stat: best.stat, value: best.value };
}

/**
 * Validate a substat value against the discrete tier tables. For a
 * flat/percent pair the tables never overlap (flat ATK 30–60 vs ATK%
 * 6.4–11.6), so a missing `%` is recoverable from magnitude alone.
 */
export function readSubstat(family: StatFamily, token: NumberToken): ValueRead {
  const stats = familyStats(family);
  // 1. Literal reading.
  for (const stat of stats) {
    if (!unitFits(stat, token)) continue;
    if (tierDisplays(stat).some((d) => sameDisplay(d, token.value))) {
      const flatPctNote = family.kind === 'pair' && !isFlatStat(stat) && !token.percent ? '% sign not read; percent inferred from the value' : undefined;
      return flatPctNote === undefined
        ? { stat, value: toStored(stat, token.value), status: 'exact' }
        : { stat, value: toStored(stat, token.value), status: 'repaired', note: flatPctNote };
    }
  }
  // 2. Documented OCR slips.
  const repairs: { stat: StatKey; display: number; note: string }[] = [];
  for (const stat of stats) {
    const tiers = tierDisplays(stat);
    if (!isFlatStat(stat) && token.decimals === 0 && token.value >= 10) {
      const shifted = token.value / 10;
      if (tiers.some((d) => sameDisplay(d, shifted))) {
        repairs.push({ stat, display: shifted, note: `read "${token.raw}" — decimal point missing` });
      }
    }
    if (isFlatStat(stat) && token.percent && token.decimals === 0 && tiers.some((d) => sameDisplay(d, token.value))) {
      repairs.push({ stat, display: token.value, note: `read "${token.raw}" — stray % on a flat value` });
    }
  }
  if (repairs.length === 1) {
    const [r] = repairs;
    return { stat: r.stat, value: toStored(r.stat, r.display), status: 'repaired', note: r.note };
  }
  // 3. Untiered stats (none in today's pool, but tables are partial by design).
  const untiered = stats.filter((s) => (SUB_STAT_TIERS[s] ?? []).length === 0 && unitFits(s, token));
  if (untiered.length === 1) {
    return { stat: untiered[0], value: toStored(untiered[0], token.value), status: 'unverified', note: 'no tier table for this substat' };
  }
  const suggestion = nearestTier(stats, token.value);
  return {
    status: 'invalid',
    note: `"${token.raw}" is not a possible ${stats.join('/')} substat roll`,
    ...(suggestion ? { suggestion } : {}),
  };
}

export interface EchoContext {
  cost: 1 | 3 | 4;
  level: number;
  rarity: number;
}

/** Exact maxima only exist for 5★ at +25 (the reference tables' basis). */
function atReferenceMax(ctx: EchoContext): boolean {
  return ctx.level === 25 && ctx.rarity === 5;
}

/**
 * Validate the primary main stat. Flats are secondary-only (reference
 * doc §2), so a flat/percent family always resolves to the percent stat.
 */
export function readPrimaryMain(family: StatFamily, token: NumberToken, ctx: EchoContext): ValueRead {
  const stat = family.kind === 'single' ? family.stat : family.pct;
  const range = MAIN_STAT_RANGES[ctx.cost][stat];
  if (range === undefined) {
    return { status: 'invalid', note: `${stat} is not a ${ctx.cost}-cost main stat` };
  }
  const min = toDisplay(stat, range.min);
  const max = toDisplay(stat, range.max);
  const candidates: { display: number; note?: string }[] = [{ display: token.value }];
  if (token.decimals === 0 && token.value >= 10) {
    candidates.push({ display: token.value / 10, note: `read "${token.raw}" — decimal point missing` });
  }
  for (const c of candidates) {
    const value = toStored(stat, c.display);
    if (atReferenceMax(ctx)) {
      if (sameDisplay(c.display, max)) {
        return c.note === undefined ? { stat, value, status: 'exact' } : { stat, value, status: 'repaired', note: c.note };
      }
    } else if (c.display >= min - 1e-6 && c.display <= max + 1e-6) {
      return { stat, value, status: c.note === undefined ? 'unverified' : 'repaired', note: c.note ?? 'in range (exact value below +25 is unsourced)' };
    }
  }
  return {
    status: 'invalid',
    note: atReferenceMax(ctx)
      ? `"${token.raw}" is not the 5★ +25 ${stat} main stat (${max})`
      : `"${token.raw}" is outside the ${stat} main-stat range ${min}–${max}`,
    suggestion: { stat, value: toStored(stat, max) },
  };
}

/** Validate the fixed secondary main stat (flat HP on 1-cost, flat ATK on 3/4-cost). */
export function readSecondaryMain(family: StatFamily, token: NumberToken, ctx: EchoContext): ValueRead {
  const expected = SECONDARY_MAIN_STAT_MAX[ctx.cost];
  if (!familyStats(family).includes(expected.stat)) {
    return { status: 'invalid', note: `a ${ctx.cost}-cost Echo's second main stat is flat ${expected.stat}`, suggestion: expected };
  }
  if (!unitFits(expected.stat, token)) {
    return { status: 'invalid', note: `"${token.raw}" is not a flat ${expected.stat} value`, suggestion: expected };
  }
  if (atReferenceMax(ctx)) {
    return sameDisplay(token.value, expected.value)
      ? { stat: expected.stat, value: token.value, status: 'exact' }
      : { status: 'invalid', note: `"${token.raw}" is not the 5★ +25 secondary (${expected.value})`, suggestion: expected };
  }
  return token.value > 0 && token.value <= expected.value
    ? { stat: expected.stat, value: token.value, status: 'unverified', note: 'in range (exact value below +25 is unsourced)' }
    : { status: 'invalid', note: `"${token.raw}" exceeds the +25 secondary (${expected.value})`, suggestion: expected };
}
