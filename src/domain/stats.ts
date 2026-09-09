import {
  statKeySchema,
  type CharacterData,
  type OwnedEcho,
  type RosterEntry,
  type SonataSetData,
  type StatKey,
  type WeaponData,
} from '../data/schema.ts';

/**
 * Domain layer: stat-sheet aggregation (reference doc §1).
 * Pure functions, no React. Units: ratios are decimals, flats are raw.
 */

/** Aggregated combat stats for one character in one loadout. */
export type StatSheet = Record<StatKey, number>;

/** Zeroed sheet. Documented base values (crit 5%/150%) are seeded in `computeStats`, not here. */
export function emptySheet(): StatSheet {
  return Object.fromEntries(statKeySchema.options.map((k) => [k, 0])) as StatSheet;
}

/** Last curve point at or below `level` (ascension `.5` tiers included). Throws when below the first point. */
export function lookupCurve(points: { level: number; value: number }[], level: number): number {
  let found: number | null = null;
  for (const p of points) {
    if (p.level <= level) found = p.value;
    else break;
  }
  if (found === null) throw new Error(`no curve entry at or below level ${level}`);
  return found;
}

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
}

/**
 * Character base stats at (level, ascension).
 *
 * Curves carry duplicate levels at ascension breakpoints (verified:
 * 20/40/50/60/70/80, pre-ascension entry first). The k-th duplicated level
 * (1-based) resolves to its post-ascension entry iff ascension >= k.
 */
export function getBaseStatsAtLevel(
  character: CharacterData,
  level: number,
  ascension: number,
): BaseStats {
  const counts = new Map<number, number>();
  for (const e of character.baseStats) counts.set(e.level, (counts.get(e.level) ?? 0) + 1);
  const dupLevels = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([lv]) => lv)
    .sort((a, b) => a - b);
  const atLevel = character.baseStats.filter((e) => e.level === level);
  if (atLevel.length > 1) {
    const rank = dupLevels.indexOf(level) + 1;
    const entry = ascension >= rank ? atLevel[atLevel.length - 1] : atLevel[0];
    return { hp: entry.hp, atk: entry.atk, def: entry.def };
  }
  const pool =
    atLevel.length > 0 ? atLevel : character.baseStats.filter((e) => e.level <= level);
  if (pool.length === 0) throw new Error(`no base stats at or below level ${level}`);
  const entry = pool[pool.length - 1];
  return { hp: entry.hp, atk: entry.atk, def: entry.def };
}

/**
 * Total ATK (Fandom wiki ATK page, CC-BY-SA):
 * ATK = (BaseATK_character + BaseATK_weapon) × (1 + BonusATKPercent) + FlatBonusATK
 */
export function computeAtk(
  baseCharacterAtk: number,
  baseWeaponAtk: number,
  sheet: StatSheet,
): number {
  return (baseCharacterAtk + baseWeaponAtk) * (1 + sheet.atkPct) + sheet.atk;
}

/**
 * Total Max HP (Fandom wiki HP page, CC-BY-SA):
 * MaxHP = BaseHP_character × (1 + %HPBonus) + HPFlatBonus.
 * No weapon base exists — weapons only contribute via secondary/passive,
 * which already flow into sheet.hpPct/sheet.hp. Parallel to computeAtk,
 * the character base stays OUT of the sheet (see computeStats).
 */
export function computeHp(baseCharacterHp: number, sheet: StatSheet): number {
  return baseCharacterHp * (1 + sheet.hpPct) + sheet.hp;
}

/**
 * Total DEF, parallel to HP (no explicit wiki formula page; Stats page
 * confirms DEF-scaling skills exist and no weapon carries a DEF base —
 * all weapons contribute ATK base + one secondary only):
 * DEF = BaseDEF_character × (1 + %DEFBonus) + DEFFlatBonus.
 */
export function computeDef(baseCharacterDef: number, sheet: StatSheet): number {
  return baseCharacterDef * (1 + sheet.defPct) + sheet.def;
}

/**
 * Ability stat for a scaling tag. ATK includes the weapon base; HP/DEF do
 * not (see computeHp/computeDef). Bases flow separately from the sheet —
 * exactly like computeAtk — so the sheet carries bonuses only.
 */
export function computeAbilityStat(
  scaling: 'ATK' | 'HP' | 'DEF',
  bases: { atkCharacter: number; atkWeapon: number; hpCharacter: number; defCharacter: number },
  sheet: StatSheet,
): number {
  switch (scaling) {
    case 'ATK':
      return computeAtk(bases.atkCharacter, bases.atkWeapon, sheet);
    case 'HP':
      return computeHp(bases.hpCharacter, sheet);
    case 'DEF':
      return computeDef(bases.defCharacter, sheet);
  }
}

export interface ComputeStatsResult {
  sheet: StatSheet;
  /** Base ATK inputs for `computeAtk`, resolved at the roster levels. */
  baseAtk: { character: number; weapon: number };
  /** Base HP/DEF inputs for `computeHp`/`computeDef` (no weapon base exists). */
  baseHp: { character: number };
  baseDef: { character: number };
  /**
   * Effects seen but not applied (conditional/custom sonata bonuses, weapon
   * passive prose, chain ranks). Surfaced, never silently dropped.
   */
  warnings: string[];
}

export interface ComputeStatsInput {
  character: CharacterData;
  weapon: WeaponData;
  roster: RosterEntry;
  echoes: OwnedEcho[];
  sonataSets: SonataSetData[];
}

/**
 * Aggregate a full loadout into a StatSheet: character base + weapon
 * (ATK curve + secondary) + forte nodes + resonance chain + echo
 * main/secondary/substats + triggered Sonata bonuses.
 *
 * Assumptions (TODOs, all warned or documented):
 * - Forte nodes are all active — `RosterEntry` tracks no unlock state yet.
 * - Weapon uses the last curve entry at/below its level (no weapon
 *   ascension tracked yet — same TODO class as character ascension).
 * - Only unconditional `stat` effects apply; `conditional`/`custom` warn.
 */
export function computeStats(input: ComputeStatsInput): ComputeStatsResult {
  const { character, weapon, roster, echoes, sonataSets } = input;
  const sheet = emptySheet();
  const warnings: string[] = [];
  const add = (stat: StatKey, value: number): void => {
    sheet[stat] += value;
  };

  // Documented bases (reference doc §1/§6). Other stats start at 0 —
  // no base Energy Regen etc. is documented, so none is seeded.
  sheet.critRate += 0.05;
  sheet.critDmg += 1.5;

  const base = getBaseStatsAtLevel(character, roster.level, roster.ascension);
  // Character bases stay OUT of the sheet (bonuses only) — they flow through
  // computeAtk/computeHp/computeDef's base × (1+pct) + flat formulas, exactly
  // like base ATK already did. (Previously sheet.hp/sheet.def were seeded
  // with the base; v2 aligns all three stats.)


  const weaponAtk = lookupCurve(weapon.atkByLevel, roster.weaponLevel);
  if (weapon.secondaryStat) {
    add(weapon.secondaryStat.stat, lookupCurve(weapon.secondaryStat.byLevel, roster.weaponLevel));
  }
  if (weapon.passive.effect.kind === 'stat') {
    add(weapon.passive.effect.stat, scaledByRank(weapon.passive.effect.value, roster.weaponRank));
  } else {
    warnings.push(`weapon passive "${weapon.passive.name}" not applied (${weapon.passive.effect.kind})`);
  }

  // TODO: forte unlock state is untracked — all synced nodes count as active.
  for (const node of character.forteNodes) add(node.stat, node.value);

  for (const rank of character.resonanceChain) {
    if (rank.rank > roster.resonanceChain) continue;
    if (rank.effect.kind === 'stat') add(rank.effect.stat, rank.effect.value);
    else warnings.push(`resonance chain S${rank.rank} "${rank.name}" not applied (${rank.effect.kind})`);
  }

  for (const echo of echoes) {
    add(echo.mainStat.stat, echo.mainStat.value);
    if (echo.secondMainStat) add(echo.secondMainStat.stat, echo.secondMainStat.value);
    for (const sub of echo.substats) add(sub.stat, sub.value);
  }

  // Sonata piece counts use distinct Echo definitions — duplicate copies of
  // the exact same Echo do not count twice (reference doc §3).
  const piecesBySonata = new Map<string, Set<string>>();
  for (const echo of echoes) {
    let set = piecesBySonata.get(echo.sonataId);
    if (!set) {
      set = new Set();
      piecesBySonata.set(echo.sonataId, set);
    }
    set.add(echo.echoDefId);
  }
  for (const set of sonataSets) {
    const pieces = piecesBySonata.get(set.id)?.size ?? 0;
    if (pieces === 0) continue;
    for (const bonus of set.bonuses) {
      if (bonus.pieceCount > pieces) continue;
      if (bonus.effect.kind === 'stat') add(bonus.effect.stat, bonus.effect.value);
      else warnings.push(`sonata "${set.name}" ${bonus.pieceCount}pc not applied (${bonus.effect.kind})`);
    }
  }

  return {
    sheet,
    baseAtk: { character: base.atk, weapon: weaponAtk },
    baseHp: { character: base.hp },
    baseDef: { character: base.def },
    warnings,
  };
}

/**
 * Scale a rank-1 structured value to the owned refinement rank.
 * Structured passives are stored at rank 1; refinement scaling is linear
 * in the count of owned copies — TODO: verify linearity per weapon once a
 * structured passive ships (today every passive is `custom`, so this is
 * forward-looking scaffolding, exercised by unit tests).
 */
export function scaledByRank(rankOneValue: number, rank: number): number {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) {
    throw new Error(`weapon rank must be 1-5, got ${rank}`);
  }
  return rankOneValue * rank;
}
