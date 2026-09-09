import type { Attribute, DamageType, OwnedEcho, StatKey } from '../data/schema.ts';
import type { ObjectiveSpec } from '../domain/objectives.ts';

/**
 * Optimizer layer: dominance pruning (reference doc §7, step 2).
 *
 * An echo is pruned when another echo of the SAME cost meets-or-beats it on
 * every objective-relevant stat and strictly beats it on at least one.
 * Objective-relative by design: stats outside the relevant set are ignored,
 * so ties (and off-objective strengths) always survive. Pure functions.
 */

/**
 * Stats that can move the needle for an objective. `kind` is the motion's
 * own bonus bucket (DamageList.Type), not the parent skill kind; `scaling`
 * selects which ability-stat family matters. Unknown/`forte` buckets
 * conservatively include every action bucket — weaker pruning, never wrong.
 */
export function relevantStatsForObjective(
  spec: ObjectiveSpec,
  attribute: Attribute,
  kind: DamageType | 'forte',
  extraKeys: StatKey[],
  scaling: 'ATK' | 'HP' | 'DEF' = 'ATK',
): StatKey[] {
  const keys = new Set<StatKey>(extraKeys);
  if (spec.kind === 'max-stat') {
    keys.add(spec.stat);
    return [...keys];
  }
  const addScalingStats = (): void => {
    if (scaling === 'HP') {
      keys.add('hp');
      keys.add('hpPct');
    } else if (scaling === 'DEF') {
      keys.add('def');
      keys.add('defPct');
    } else {
      keys.add('atk');
      keys.add('atkPct');
    }
  };
  if (spec.kind === 'rotation-dpr') {
    // Blocks span unverified-at-search-time kinds/scalings, and buffs can
    // mod any stat — include every ability stat + every action bucket plus
    // every buff-modded stat. Weaker pruning, never wrong.
    keys.add('atk');
    keys.add('atkPct');
    keys.add('hp');
    keys.add('hpPct');
    keys.add('def');
    keys.add('defPct');
    keys.add('critRate');
    keys.add('critDmg');
    keys.add(`dmgBonus:${attribute}`);
    for (const bucket of ['basic', 'heavy', 'skill', 'liberation', 'intro', 'outro', 'echo'] as const) {
      keys.add(`dmgBonus:${bucket}`);
    }
    keys.add('defIgnore');
    keys.add('resistancePenetration');
    keys.add('amplify');
    keys.add('negativeStatusAmplify');
    keys.add('specialBase');
    keys.add('specialBonus');
    for (const buff of spec.buffs) {
      for (const mod of buff.mods) keys.add(mod.stat);
    }
    return [...keys];
  }
  addScalingStats();
  keys.add('critRate');
  keys.add('critDmg');
  keys.add(`dmgBonus:${attribute}`);
  if (kind === 'forte') {
    for (const bucket of ['basic', 'heavy', 'skill', 'liberation', 'intro'] as const) {
      keys.add(`dmgBonus:${bucket}`);
    }
  } else {
    keys.add(`dmgBonus:${kind}`);
  }
  keys.add('defIgnore');
  keys.add('resistancePenetration');
  keys.add('amplify');
  keys.add('specialBase');
  keys.add('specialBonus');
  return [...keys];
}

export interface PruneResult {
  kept: OwnedEcho[];
  /** Ids dropped as strictly dominated. */
  pruned: string[];
}

/** Drop strictly-dominated echoes, comparing within equal cost only. */
export function pruneDominated(echoes: OwnedEcho[], relevantStats: StatKey[]): PruneResult {
  const contributions = new Map(echoes.map((e) => [e.id, contributionsOf(e)] as const));
  const pruned = new Set<string>();
  for (const challenger of echoes) {
    for (const incumbent of echoes) {
      if (challenger.id === incumbent.id) continue;
      if (challenger.cost !== incumbent.cost) continue;
      if (pruned.has(incumbent.id)) continue;
      if (
        dominates(
          contributions.get(challenger.id)!,
          contributions.get(incumbent.id)!,
          relevantStats,
        )
      ) {
        pruned.add(incumbent.id);
      }
    }
  }
  return { kept: echoes.filter((e) => !pruned.has(e.id)), pruned: [...pruned] };
}

/** Total per-stat contribution: main + secondary + substats. */
function contributionsOf(echo: OwnedEcho): Map<StatKey, number> {
  const map = new Map<StatKey, number>();
  const add = (stat: StatKey, value: number): void => {
    map.set(stat, (map.get(stat) ?? 0) + value);
  };
  add(echo.mainStat.stat, echo.mainStat.value);
  if (echo.secondMainStat) add(echo.secondMainStat.stat, echo.secondMainStat.value);
  for (const sub of echo.substats) add(sub.stat, sub.value);
  return map;
}

/** True when `a` meets-or-beats `b` on every relevant stat and strictly beats it on one. */
function dominates(a: Map<StatKey, number>, b: Map<StatKey, number>, relevant: StatKey[]): boolean {
  let strict = false;
  for (const stat of relevant) {
    const av = a.get(stat) ?? 0;
    const bv = b.get(stat) ?? 0;
    if (av < bv) return false;
    if (av > bv) strict = true;
  }
  return strict;
}
