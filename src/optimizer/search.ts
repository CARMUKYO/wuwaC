import type {
  CharacterData,
  CharacterSkill,
  OwnedEcho,
  RosterEntry,
  SonataSetData,
  StatKey,
  WeaponData,
} from '../data/schema.ts';
import type { ResonanceMode } from '../domain/characterMods.ts';
import type { EnemyProfile } from '../domain/damage.ts';
import type { ObjectiveSpec } from '../domain/objectives.ts';
import type { ComputeStatsResult, StatSheet } from '../domain/stats.ts';
import { computeStats, hasMainEchoBonus } from '../domain/stats.ts';
import { resolveObjectiveSkill, scoreSheet } from '../domain/objectives.ts';
import { pruneDominated, relevantStatsForObjective } from './prune.ts';

/**
 * Optimizer layer: Echo-combination search (reference doc §7).
 * Pure functions over domain math; hosted off the main thread by worker.ts.
 */

export type SonataLock =
  | { mode: 'none' }
  | { mode: 'five'; setId: string }
  | { mode: 'twoPlusTwo'; setIdA: string; setIdB: string };

/** Optional kit state for expected-damage objectives (same fields as ScoreContext). */
export interface KitStateRequest {
  targetStatusStacks?: number;
  conviction?: number;
  targetHavocBaneStacks?: number;
  blazesConsumed?: number;
  nightfallBlazes?: number;
  ringsConsumed?: number;
  voiceFlux?: boolean;
  wovenMyriad?: boolean;
  tuneStrainStacks?: number;
}

export interface OptimizeRequest {
  costBudget: 10 | 12;
  sonataLock: SonataLock;
  objective: ObjectiveSpec;
  /** Sheet-level minimums (e.g. critRate >= 0.7). Empty/absent = no filter. */
  minStats?: Partial<Record<StatKey, number>>;
  topN: number;
  /** Exhaustive baseline can skip pruning (tests, debugging). Default true. */
  prune?: boolean;
  /** Kit state for expected-damage scoring. Absent = zeros = context-free. */
  kitState?: KitStateRequest;
}

export interface SearchData {
  character: CharacterData;
  weapon: WeaponData;
  roster: RosterEntry;
  /** Candidate pool (ownership pre-filtered by the caller). */
  echoes: OwnedEcho[];
  sonataSets: SonataSetData[];
  enemy: EnemyProfile;
  /** Required when the character has Resonance Modes (dual-mode kits). */
  resonanceMode?: ResonanceMode;
}

export interface RankedBuild {
  /** Exactly 5 echo ids, sorted for determinism. */
  echoIds: string[];
  score: number;
  sheet: StatSheet;
  warnings: string[];
  /** Transcribed assumptions applied to the sheet (from computeStats). */
  appliedAssumptions: string[];
  /** Winning slot-1 echo id when a main-slot bonus improved the score. */
  mainEchoId?: string;
}

export interface SearchResult {
  builds: RankedBuild[];
  /** Combos fully scored (post-prune, post-cost/lock, pre-minStats). */
  evaluated: number;
  /** Candidate ids dropped by dominance pruning. */
  prunedEchoes: string[];
}

export interface ProgressUpdate {
  evaluated: number;
  total: number;
}

/**
 * Exhaustive search over unordered 5-echo combos with dominance pruning.
 * Throws on malformed requests; returns empty builds when no combo qualifies.
 *
 * Scaling (measured 2026-09-12, `npm run bench`): n=50 scores 92k combos
 * in ~1.4s (~65k combos/s). Pruning is same-cost-and-set-only for
 * soundness (a cross-set swap can lose a set threshold), so it keeps ~3x
 * more combos than the old unsound cross-set rule at identical per-combo
 * cost; the cost budget remains the main filter. Adversarial dense
 * inventories (50 fully-tuned, mutually non-dominated echoes) approach
 * ~1M+ scored combos and tens of seconds; that case wants branch-and-bound
 * (deferred, reference doc §7 step 3) rather than a cap, so exactness holds.
 */
export function searchExhaustive(
  data: SearchData,
  request: OptimizeRequest,
  onProgress?: (update: ProgressUpdate) => void,
): SearchResult {
  if (!Number.isInteger(request.topN) || request.topN < 1) {
    throw new Error(`topN must be a positive integer, got ${request.topN}`);
  }
  if (request.costBudget !== 10 && request.costBudget !== 12) {
    throw new Error(`cost budget must be 10 or 12, got ${request.costBudget}`);
  }
  const { character, weapon, roster, enemy } = data;
  const skill =
    request.objective.kind === 'expected-damage'
      ? resolveObjectiveSkill(character.skills, request.objective)
      : undefined;
  // Pruning follows the motion's own bonus bucket (DamageList.Type), not the
  // parent skill kind — with a skill-kind fallback for legacy specs.
  let motionForPrune: CharacterSkill['motionValues'][number] | undefined;
  if (request.objective.kind === 'expected-damage' && skill !== undefined) {
    const wantedMotion = request.objective.motionName;
    motionForPrune = skill.motionValues.find((m) => m.name === wantedMotion);
  }
  const minEntries = Object.entries(request.minStats ?? {}) as [StatKey, number][];
  const relevant = relevantStatsForObjective(
    request.objective,
    character.attribute,
    motionForPrune?.dmgType ?? skill?.kind ?? 'basic',
    minEntries.map(([stat]) => stat),
    motionForPrune?.scaling ?? skill?.scaling ?? 'ATK',
  );

  const { kept, pruned } = request.prune ?? true
    ? pruneDominated(data.echoes, relevant)
    : { kept: data.echoes, pruned: [] as string[] };

  const total = binomial(kept.length, 5);
  onProgress?.({ evaluated: 0, total });
  const top: RankedBuild[] = [];
  let evaluated = 0;

  const scoreContext = {
    skill,
    skills: character.skills,
    characterId: character.id,
    attribute: character.attribute,
    resonanceChain: roster.resonanceChain,
    attackerLevel: roster.level,
    enemy,
    resonanceMode: data.resonanceMode,
    ...request.kitState,
  };

  const consider = (combo: OwnedEcho[]): void => {
    if (combo.reduce((sum, e) => sum + e.cost, 0) > request.costBudget) return;
    if (!satisfiesLock(combo, request)) return;
    const scoreWithMain = (mainEcho: OwnedEcho | undefined): { result: ComputeStatsResult; score: number } => {
      const result = computeStats({
        character,
        weapon,
        roster,
        echoes: combo,
        sonataSets: data.sonataSets,
        mainEcho,
      });
      const score = scoreSheet(request.objective, result.sheet, {
        ...scoreContext,
        baseAtk: result.baseAtk,
        baseHp: result.baseHp,
        baseDef: result.baseDef,
      });
      return { result, score };
    };
    // Best-main selection: the baseline plus one rescore per distinct
    // carrier definition (transcribed main-slot bonus for this character).
    // Bonuses are strictly non-negative, so ties keep the baseline.
    let best = scoreWithMain(undefined);
    let mainEchoId: string | undefined;
    const seenDefs = new Set<string>();
    for (const candidate of combo) {
      if (seenDefs.has(candidate.echoDefId)) continue;
      seenDefs.add(candidate.echoDefId);
      if (!hasMainEchoBonus(character.id, candidate.echoDefId)) continue;
      const rescored = scoreWithMain(candidate);
      if (rescored.score > best.score) {
        best = rescored;
        mainEchoId = candidate.id;
      }
    }
    evaluated += 1;
    onProgress?.({ evaluated, total });
    for (const [stat, minimum] of minEntries) {
      if (best.result.sheet[stat] < minimum) return;
    }
    insertBounded(top, {
      echoIds: combo.map((e) => e.id).sort(),
      score: best.score,
      sheet: best.result.sheet,
      warnings: best.result.warnings,
      appliedAssumptions: best.result.appliedAssumptions,
      ...(mainEchoId === undefined ? {} : { mainEchoId }),
    }, request.topN);
  };

  const n = kept.length;
  for (let a = 0; a < n - 4; a += 1) {
    for (let b = a + 1; b < n - 3; b += 1) {
      for (let c = b + 1; c < n - 2; c += 1) {
        for (let d = c + 1; d < n - 1; d += 1) {
          for (let e = d + 1; e < n; e += 1) {
            consider([kept[a], kept[b], kept[c], kept[d], kept[e]]);
          }
        }
      }
    }
  }
  return { builds: top, evaluated, prunedEchoes: pruned };
}

/** Bounded descending leaderboard; ties keep the incumbent (lexicographic combo order wins). */
function insertBounded(top: RankedBuild[], build: RankedBuild, topN: number): void {
  if (top.length < topN) {
    top.push(build);
    top.sort((x, y) => y.score - x.score);
    return;
  }
  if (build.score > top[top.length - 1].score) {
    top[top.length - 1] = build;
    top.sort((x, y) => y.score - x.score);
  }
}

/** Sonata piece counts use distinct Echo definitions (reference doc §3). */
function sonataCounts(combo: OwnedEcho[]): Map<string, number> {
  const defsBySonata = new Map<string, Set<string>>();
  for (const echo of combo) {
    let defs = defsBySonata.get(echo.sonataId);
    if (!defs) {
      defs = new Set();
      defsBySonata.set(echo.sonataId, defs);
    }
    defs.add(echo.echoDefId);
  }
  return new Map([...defsBySonata].map(([sonata, defs]) => [sonata, defs.size] as const));
}

function satisfiesLock(combo: OwnedEcho[], request: OptimizeRequest): boolean {
  const lock = request.sonataLock;
  if (lock.mode === 'none') return true;
  const counts = sonataCounts(combo);
  if (lock.mode === 'five') return (counts.get(lock.setId) ?? 0) >= 5;
  return (counts.get(lock.setIdA) ?? 0) >= 2 && (counts.get(lock.setIdB) ?? 0) >= 2;
}

function binomial(n: number, k: number): number {
  if (n < k) return 0;
  let result = 1;
  for (let i = 0; i < k; i += 1) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}
