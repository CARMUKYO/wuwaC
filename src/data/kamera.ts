import type { OwnedEcho, Snapshot, StatKey } from './schema.ts';

/**
 * Data layer: WuWa Inventory Kamera echo file interop (reference doc §8.3).
 *
 * Source shape (inspected 2026-09-18):
 * https://raw.githubusercontent.com/Psycho-Marcus/WuWa_Inventory_Kamera/master/README.md
 * Top level is an array of single-key objects; the key is the numeric game
 * monsterID, or a flatcase echo name when the scanner's OCR failed. Each row:
 * `{ level, tuneLv, sonata, rarity, stats: { main, sub } }`, where `sonata`
 * is flatcase (e.g. "havoceclipse") and stat keys are short codes with a `%`
 * suffix when percent (`"cr%": 22.0` = 22% Crit Rate, `"atk": 150` = 150
 * flat ATK). Only this documented shape is accepted — nothing is guessed.
 *
 * Identity (user decision 2026-09-18): rows keyed by echo NAME import
 * (flatcase-normalized against snapshot echo defs; exact slug ids accepted
 * too). Numeric game-id keys have no snapshot crosswalk — the snapshot only
 * carries provider-internal apiIds — so those rows are skipped with a
 * per-row error, never silently mis-imported. Export keys rows by flatcase
 * echo name, a form Kamera's own format already permits.
 *
 * Realm of this file is *format*, not math — values are converted, never
 * scored. All mapping failures are per-row issues; only a non-array file
 * (or unparseable JSON) throws, since there are no rows to report against.
 */

/** `origin` tag for Kamera-imported rows (see the convention in schema.ts). */
export const KAMERA_ORIGIN = 'import:wuwa-inventory-kamera';

/** Draft content for one importable row; the store derives `id`/`origin`. */
export type KameraDraft = Omit<OwnedEcho, 'id' | 'origin'>;

export interface KameraRowIssue {
  /** 1-based row number within the file's top-level array. */
  row: number;
  /** The row's echo key (or a placeholder when the row has none). */
  key: string;
  message: string;
}

export interface KameraImportResult {
  drafts: KameraDraft[];
  issues: KameraRowIssue[];
}

interface StatMapping {
  stat: StatKey;
  /** True when the code is inherently ratio-style (bare code accepted too). */
  percentOnly: boolean;
}

/**
 * Kamera short code (without any `%` suffix) -> sheet stat. From the
 * README's "Echo stats" table: hp, atk, critrate->cr, critdmg->cd, def,
 * energyregen->er, resonanceskilldmgbonus->skillDmg,
 * basicattackdmgbonus->basicAttack, heavyattackdmgbonus->heavyAttack,
 * resonanceliberationdmgbonus->liberationDmg, six `<element>dmgbonus`, and
 * healingbonus->healing. hp/atk/def are flat-or-percent by suffix; every
 * other code is ratio-only (a bare code still reads as a ratio — game
 * semantics disambiguate, so `cr` and `cr%` both mean Crit Rate).
 */
const KAMERA_STAT_CODES: Record<string, StatMapping> = {
  hp: { stat: 'hp', percentOnly: false },
  atk: { stat: 'atk', percentOnly: false },
  def: { stat: 'def', percentOnly: false },
  cr: { stat: 'critRate', percentOnly: true },
  cd: { stat: 'critDmg', percentOnly: true },
  er: { stat: 'energyRegen', percentOnly: true },
  healing: { stat: 'healingBonus', percentOnly: true },
  skillDmg: { stat: 'dmgBonus:skill', percentOnly: true },
  basicAttack: { stat: 'dmgBonus:basic', percentOnly: true },
  heavyAttack: { stat: 'dmgBonus:heavy', percentOnly: true },
  liberationDmg: { stat: 'dmgBonus:liberation', percentOnly: true },
  glacio: { stat: 'dmgBonus:Glacio', percentOnly: true },
  fusion: { stat: 'dmgBonus:Fusion', percentOnly: true },
  electro: { stat: 'dmgBonus:Electro', percentOnly: true },
  aero: { stat: 'dmgBonus:Aero', percentOnly: true },
  spectro: { stat: 'dmgBonus:Spectro', percentOnly: true },
  havoc: { stat: 'dmgBonus:Havoc', percentOnly: true },
};

/** StatKey -> Kamera short code (percent-style stats gain `%` on export). */
const STAT_TO_KAMERA_CODE: Partial<Record<StatKey, string>> = {
  hp: 'hp',
  hpPct: 'hp%',
  atk: 'atk',
  atkPct: 'atk%',
  def: 'def',
  defPct: 'def%',
  critRate: 'cr%',
  critDmg: 'cd%',
  energyRegen: 'er%',
  healingBonus: 'healing%',
  'dmgBonus:skill': 'skillDmg%',
  'dmgBonus:basic': 'basicAttack%',
  'dmgBonus:heavy': 'heavyAttack%',
  'dmgBonus:liberation': 'liberationDmg%',
  'dmgBonus:Glacio': 'glacio%',
  'dmgBonus:Fusion': 'fusion%',
  'dmgBonus:Electro': 'electro%',
  'dmgBonus:Aero': 'aero%',
  'dmgBonus:Spectro': 'spectro%',
  'dmgBonus:Havoc': 'havoc%',
};

/** Kamera flatcase: lowercase with all non-alphanumerics stripped. */
export function toFlatcase(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Stored ratio -> human % number, trimming float dust (mirrors format.ts). */
function toHumanPercent(stored: number): number {
  return Math.round(stored * 100 * 1e6) / 1e6;
}

/**
 * Parse raw file text into top-level rows. Throws when the text is not
 * JSON or the top level is not an array — file-level failures with no
 * rows to attach issues to.
 */
export function parseKameraEchoFile(text: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('not a JSON file — pick an echoes export (array of echo rows)');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('not a Kamera echoes file — the top level must be an array of echo rows');
  }
  return parsed;
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

interface MappedStat {
  stat: StatKey;
  value: number;
}

/** Map one Kamera stat entry to a sheet stat. Null = unknown code. */
function mapStatCode(code: string, rawValue: unknown): MappedStat | null {
  const base = code.endsWith('%') ? code.slice(0, -1) : code;
  const mapping = KAMERA_STAT_CODES[base];
  if (!mapping) return null;
  const num = asNumber(rawValue);
  if (num === null || num < 0) return null;
  if (code.endsWith('%') || mapping.percentOnly) {
    const pctStat: StatKey =
      mapping.stat === 'hp' ? 'hpPct' : mapping.stat === 'atk' ? 'atkPct' : mapping.stat === 'def' ? 'defPct' : mapping.stat;
    return { stat: pctStat, value: num / 100 };
  }
  return { stat: mapping.stat, value: num };
}

function statError(code: string, rawValue: unknown): string {
  const base = code.endsWith('%') ? code.slice(0, -1) : code;
  if (!KAMERA_STAT_CODES[base]) return `unknown stat code ${JSON.stringify(code)}`;
  return `stat ${JSON.stringify(code)} has no usable value (${JSON.stringify(rawValue) ?? 'missing'})`;
}

/**
 * Map validated file rows to echo drafts, skipping unmatchable rows with
 * per-row issues. Pure and total: every input row yields drafts, issues,
 * or both — nothing is silently dropped except Kamera's own `_comment`
 * annotation keys.
 */
export function mapKameraEchoes(rows: unknown[], snapshot: Snapshot): KameraImportResult {
  const drafts: KameraDraft[] = [];
  const issues: KameraRowIssue[] = [];
  rows.forEach((entry, index) => {
    const row = index + 1;
    if (!isRecord(entry)) {
      issues.push({ row, key: `#${row}`, message: `row ${row} is not an object — skipped` });
      return;
    }
    const keys = Object.keys(entry).filter((k) => k !== '_comment');
    if (keys.length === 0) {
      issues.push({ row, key: `#${row}`, message: `row ${row} has no echo entries — skipped` });
      return;
    }
    for (const key of keys) {
      mapOneRow(row, key, entry[key], snapshot, drafts, issues);
    }
  });
  return { drafts, issues };
}

function mapOneRow(
  row: number,
  key: string,
  raw: unknown,
  snapshot: Snapshot,
  drafts: KameraDraft[],
  issues: KameraRowIssue[],
): void {
  const fail = (message: string): void => {
    issues.push({ row, key, message });
  };
  const def =
    snapshot.echoDefs.find((d) => d.id === key) ??
    matchByName(key, snapshot, fail);
  if (!def) return;
  if (!isRecord(raw)) {
    fail(`echo ${JSON.stringify(key)} has no data object — skipped`);
    return;
  }
  const level = asInt(raw['level']);
  if (level === null || level < 0 || level > 25) {
    fail(`echo ${JSON.stringify(key)} has no level 0–25 — skipped`);
    return;
  }
  const rarity = asInt(raw['rarity']);
  if (rarity === null || rarity < 1 || rarity > 5) {
    fail(`echo ${JSON.stringify(key)} has no rarity 1–5 — skipped`);
    return;
  }
  if (typeof raw['sonata'] !== 'string') {
    fail(`echo ${JSON.stringify(key)} has no sonata name — skipped`);
    return;
  }
  const sonata = snapshot.sonataSets.find(
    (s) => toFlatcase(s.name) === toFlatcase(raw['sonata'] as string) || toFlatcase(s.id) === toFlatcase(raw['sonata'] as string),
  );
  if (!sonata) {
    fail(`echo ${JSON.stringify(key)} names unknown sonata ${JSON.stringify(raw['sonata'])} — skipped`);
    return;
  }
  if (!def.sonataIds.includes(sonata.id)) {
    const allowed = def.sonataIds
      .map((id) => snapshot.sonataSets.find((s) => s.id === id)?.name ?? id)
      .join(' / ');
    fail(`${def.name} cannot roll ${sonata.name} (rolls ${allowed}) — skipped`);
    return;
  }
  if (!isRecord(raw['stats'])) {
    fail(`echo ${JSON.stringify(key)} has no stats block — skipped`);
    return;
  }
  const mainRaw = (raw['stats'] as Record<string, unknown>)['main'];
  if (!isRecord(mainRaw)) {
    fail(`echo ${JSON.stringify(key)} has no main stats — skipped`);
    return;
  }
  const mainEntries = Object.entries(mainRaw);
  const mapped: MappedStat[] = [];
  for (const [code, value] of mainEntries) {
    if (code === '_comment') continue;
    const stat = mapStatCode(code, value);
    if (!stat) {
      fail(`echo ${JSON.stringify(key)}: ${statError(code, value)} — skipped`);
      return;
    }
    mapped.push(stat);
  }
  // Fixed secondaries (reference doc §2): flat ATK on 3/4-cost echoes,
  // flat HP on 1-cost echoes. Anything else in main entries is the primary.
  const secondaryStat = def.cost === 1 ? 'hp' : 'atk';
  const primary = mapped.filter((m) => m.stat !== secondaryStat);
  const secondary = mapped.filter((m) => m.stat === secondaryStat);
  if (primary.length !== 1 || secondary.length > 1) {
    fail(`echo ${JSON.stringify(key)} has ${mainEntries.length} main-stat entries, expected 1 (+ fixed ${secondaryStat} secondary) — skipped`);
    return;
  }
  if (!def.allowedMainStats.includes(primary[0].stat)) {
    fail(`${def.name} cannot roll ${primary[0].stat} as a main stat — skipped`);
    return;
  }
  const subRaw = (raw['stats'] as Record<string, unknown>)['sub'];
  const substats: MappedStat[] = [];
  if (subRaw !== undefined) {
    if (!isRecord(subRaw)) {
      fail(`echo ${JSON.stringify(key)} has malformed substats — skipped`);
      return;
    }
    for (const [code, value] of Object.entries(subRaw)) {
      if (code === '_comment') continue;
      const stat = mapStatCode(code, value);
      if (!stat) {
        fail(`echo ${JSON.stringify(key)}: ${statError(code, value)} — skipped`);
        return;
      }
      substats.push(stat);
    }
    if (substats.length > 5) {
      fail(`echo ${JSON.stringify(key)} has ${substats.length} substats, at most 5 — skipped`);
      return;
    }
    const seen = new Set(substats.map((s) => s.stat));
    if (seen.size !== substats.length) {
      fail(`echo ${JSON.stringify(key)} has duplicate substats after mapping — skipped`);
      return;
    }
  }
  drafts.push({
    echoDefId: def.id,
    sonataId: sonata.id,
    cost: def.cost,
    level,
    rarity,
    mainStat: { stat: primary[0].stat, value: primary[0].value },
    ...(secondary.length === 1
      ? { secondMainStat: { stat: secondary[0].stat, value: secondary[0].value } }
      : {}),
    substats: substats.map((s) => ({ stat: s.stat, value: s.value })),
    equippedTo: null,
  });
}

function matchByName(
  key: string,
  snapshot: Snapshot,
  fail: (message: string) => void,
): Snapshot['echoDefs'][number] | undefined {
  const flat = toFlatcase(key);
  const matches = snapshot.echoDefs.filter((d) => toFlatcase(d.name) === flat);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    fail(`echo name ${JSON.stringify(key)} matches ${matches.map((m) => m.name).join(', ')} — skipped as ambiguous`);
    return undefined;
  }
  if (/^\d+$/.test(key)) {
    fail(
      `echo ${JSON.stringify(key)} is a numeric game id, which has no snapshot crosswalk — ` +
        'rename the key to the echo name to import this row',
    );
    return undefined;
  }
  fail(`unknown echo ${JSON.stringify(key)} — no snapshot echo has that name`);
  return undefined;
}

/**
 * Export owned echoes in the Kamera file shape (array of single-key
 * objects), keyed by flatcase echo name. Throws on rows that cannot be
 * represented (unknown def without a label, unmappable stats) — export
 * fails loudly, never silently drops rows.
 */
export function exportKameraEchoes(echoes: OwnedEcho[], snapshot: Snapshot): unknown[] {
  return echoes.map((echo) => {
    const def = snapshot.echoDefs.find((d) => d.id === echo.echoDefId);
    const name = def?.name ?? echo.label;
    if (!name) {
      throw new Error(`cannot export echo ${JSON.stringify(echo.id)}: unknown def and no label for the row key`);
    }
    const sonata = snapshot.sonataSets.find((s) => s.id === echo.sonataId);
    const main: Record<string, number> = {
      [toKameraCode(echo.mainStat.stat, name)]: toHumanValue(echo.mainStat.stat, echo.mainStat.value),
    };
    if (echo.secondMainStat) {
      main[toKameraCode(echo.secondMainStat.stat, name)] = toHumanValue(
        echo.secondMainStat.stat,
        echo.secondMainStat.value,
      );
    }
    const sub: Record<string, number> = {};
    for (const s of echo.substats) {
      sub[toKameraCode(s.stat, name)] = toHumanValue(s.stat, s.value);
    }
    return {
      [toFlatcase(name)]: {
        level: echo.level,
        // One substat per tune (doc §2), so the count is the tune level.
        tuneLv: echo.substats.length,
        sonata: toFlatcase(sonata?.name ?? echo.sonataId),
        rarity: echo.rarity,
        stats: { main, sub },
      },
    };
  });
}

function toKameraCode(stat: StatKey, echoName: string): string {
  const code = STAT_TO_KAMERA_CODE[stat];
  if (!code) {
    throw new Error(`cannot export ${echoName}: ${stat} has no Kamera stat code`);
  }
  return code;
}

function toHumanValue(stat: StatKey, stored: number): number {
  return stat === 'hp' || stat === 'atk' || stat === 'def' ? stored : toHumanPercent(stored);
}
