/**
 * Manual optimizer benchmark (NOT a unit test — wall-clock timing is flaky
 * by nature). Generates deterministic inventories and times the exact
 * search (`searchExhaustive`: cost patterns + branch-and-bound) against the
 * brute-force oracle (`searchReference`) where the oracle is still
 * affordable, checking the two agree build for build.
 *
 * Inventories:
 * - synthetic: the original generator (random mains of any cost, 2–4
 *   random substats) — kept so numbers stay comparable across versions.
 * - realistic: Lv25 echoes built from the repo's data tables — main stat
 *   from the cost's pool (`MAIN_STAT_POOLS`) at its Lv25 maximum
 *   (`MAIN_STAT_RANGES`), the fixed secondary (`SECONDARY_MAIN_STAT_MAX`),
 *   five distinct substats at random tiers (`SUB_STAT_TIERS`).
 *
 * Run: npm run bench                                   (both inventories, n = 12..300)
 *      npx tsx scripts/bench-optimizer.ts 50 100       (pick sizes)
 *      INVENTORY=realistic npm run bench               (synthetic | realistic | both)
 *      REFERENCE_MAX=30 npm run bench                  (oracle up to n=30 only; default 50)
 *      WORKERS=4 npm run bench                         (also time 4 shards on worker threads)
 */
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { MAIN_STAT_RANGES, SECONDARY_MAIN_STAT_MAX, SUB_STAT_TIERS } from '../src/data/echoStats.ts';
import { MAIN_STAT_POOLS } from '../src/data/placeholders.ts';
import { snapshotSchema, type Snapshot } from '../src/data/schema.ts';
import type { OwnedEcho, StatKey } from '../src/data/schema.ts';
import { standardMob } from '../src/domain/damage.ts';
import {
  mergeShardResults,
  searchExhaustive,
  searchReference,
  type OptimizeRequest,
  type SearchData,
  type SearchResult,
  type SearchShard,
} from '../src/optimizer/search.ts';

/** Deterministic PRNG (mulberry32) so runs are comparable. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUB_STATS: StatKey[] = ['atkPct', 'critRate', 'critDmg', 'energyRegen', 'hpPct', 'defPct'];
const MAINS: StatKey[] = ['atkPct', 'critRate', 'critDmg', 'dmgBonus:Aero', 'energyRegen', 'hpPct'];

function makeSyntheticInventory(n: number): OwnedEcho[] {
  const rand = rng(42);
  const costs: (1 | 3 | 4)[] = [4, 3, 3, 1, 1];
  const echoes: OwnedEcho[] = [];
  for (let i = 0; i < n; i += 1) {
    const subCount = 2 + Math.floor(rand() * 3);
    const used = new Set<StatKey>();
    const substats: OwnedEcho['substats'] = [];
    for (let s = 0; s < subCount; s += 1) {
      const stat = SUB_STATS[Math.floor(rand() * SUB_STATS.length)];
      if (used.has(stat)) continue;
      used.add(stat);
      substats.push({ stat, value: 0.02 + rand() * 0.15 });
    }
    echoes.push({
      id: `bench-${i}`,
      label: `Bench ${i}`,
      echoDefId: `bench-def-${i}`,
      sonataId: i % 2 === 0 ? 'sierra-gale' : 'rejuvenating-glow',
      cost: costs[i % costs.length],
      level: 25,
      rarity: 5,
      mainStat: { stat: MAINS[Math.floor(rand() * MAINS.length)], value: 0.1 + rand() * 0.3 },
      substats,
      equippedTo: null,
      origin: 'bench',
    });
  }
  return echoes;
}

/** Sonata sets and echo defs (some with Jiyan main-slot bonuses) to draw from. */
const REALISTIC_SETS = ['sierra-gale', 'lingering-tunes', 'rejuvenating-glow', 'moonlit-clouds'];
const REALISTIC_DEFS = ['kerasaur', 'nameless-explorer', 'reactor-husk', 'def-a', 'def-b', 'def-c', 'def-d', 'def-e'];

function makeRealisticInventory(n: number): OwnedEcho[] {
  const rand = rng(7);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  const costs: (1 | 3 | 4)[] = [4, 3, 3, 1, 1];
  const subKeys = Object.keys(SUB_STAT_TIERS) as StatKey[];
  return Array.from({ length: n }, (_, i) => {
    const cost = costs[i % costs.length];
    const main = pick(MAIN_STAT_POOLS[cost].primary);
    const substats: OwnedEcho['substats'] = [];
    const used = new Set<StatKey>();
    while (substats.length < 5) {
      const stat = pick(subKeys);
      if (used.has(stat)) continue;
      used.add(stat);
      substats.push({ stat, value: pick(SUB_STAT_TIERS[stat]!) });
    }
    return {
      id: `real-${i}`,
      label: `Real ${i}`,
      echoDefId: pick(REALISTIC_DEFS),
      sonataId: pick(REALISTIC_SETS),
      cost,
      level: 25,
      rarity: 5,
      mainStat: { stat: main, value: MAIN_STAT_RANGES[cost][main]?.max ?? 0 },
      secondMainStat: SECONDARY_MAIN_STAT_MAX[cost],
      substats,
      equippedTo: null,
      origin: 'bench',
    };
  });
}

type InventoryKind = 'synthetic' | 'realistic';

function loadSnapshot(): Snapshot {
  return snapshotSchema.parse(JSON.parse(readFileSync('src/data/generated/snapshot.json', 'utf8')) as unknown);
}

function benchCase(snapshot: Snapshot, kind: InventoryKind, n: number): { data: SearchData; request: OptimizeRequest } {
  const character = snapshot.characters.find((c) => c.id === 'jiyan')!;
  const weapon = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
  const liberation = character.skills.find((s) => s.kind === 'liberation')!;
  return {
    data: {
      character,
      weapon,
      roster: {
        characterId: 'jiyan',
        level: 90,
        ascension: 6,
        resonanceChain: 0,
        forteLevels: { [liberation.id]: 10 },
        weaponId: 'verdant-summit',
        weaponLevel: 90,
        weaponRank: 1,
      },
      echoes: kind === 'synthetic' ? makeSyntheticInventory(n) : makeRealisticInventory(n),
      sonataSets: snapshot.sonataSets,
      enemy: standardMob(90),
    },
    request: {
      costBudget: 12,
      sonataLock: { mode: 'none' },
      objective: {
        kind: 'expected-damage',
        skillId: liberation.id,
        motionName: liberation.motionValues[0].name,
        forteLevel: 10,
        crit: 'expected',
      },
      topN: 5,
    },
  };
}

function sameBuilds(a: SearchResult, b: SearchResult): boolean {
  return (
    a.builds.length === b.builds.length &&
    a.builds.every((build, i) => {
      const other = b.builds[i];
      return (
        build.score === other.score &&
        build.echoIds.join() === other.echoIds.join() &&
        build.mainEchoId === other.mainEchoId
      );
    })
  );
}

interface ShardJob {
  kind: InventoryKind;
  n: number;
  shard: SearchShard;
}

/** Time `count` shards on worker threads (what the browser does with Web Workers). */
async function runSharded(kind: InventoryKind, n: number, count: number): Promise<SearchResult[]> {
  return Promise.all(
    Array.from({ length: count }, (_, index) => {
      const job: ShardJob = { kind, n, shard: { index, count } };
      const worker = new Worker(new URL(import.meta.url), { workerData: job, execArgv: ['--import', 'tsx'] });
      return new Promise<SearchResult>((resolve, reject) => {
        worker.once('message', (result: SearchResult) => {
          void worker.terminate();
          resolve(result);
        });
        worker.once('error', reject);
      });
    }),
  );
}

async function main(): Promise<void> {
  const t0 = performance.now();
  const snapshot = loadSnapshot();
  const parseMs = performance.now() - t0;
  const sizes = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n >= 5);
  const referenceMax = Number(process.env.REFERENCE_MAX ?? 50);
  const workers = Number(process.env.WORKERS ?? 0);
  const inventory = process.env.INVENTORY ?? 'both';
  const kinds: InventoryKind[] =
    inventory === 'synthetic' || inventory === 'realistic' ? [inventory] : ['synthetic', 'realistic'];

  console.log(`snapshot parse+validate: ${parseMs.toFixed(0)}ms`);
  for (const kind of kinds) {
    console.log(`\n${kind} inventory`);
    console.log(
      `n\tpruned\tlegal combos\tscored\tms\tlegal/sec\treference ms\tsame top-N${workers > 1 ? `\t${workers} workers ms\tsame` : ''}`,
    );
    for (const n of sizes.length > 0 ? sizes : [12, 20, 30, 50, 100, 200, 300]) {
      const { data, request } = benchCase(snapshot, kind, n);
      const start = performance.now();
      const result = searchExhaustive(data, request);
      const ms = performance.now() - start;
      let referenceCell = '-';
      let sameCell = '-';
      if (n <= referenceMax) {
        const refStart = performance.now();
        const reference = searchReference(data, request);
        referenceCell = (performance.now() - refStart).toFixed(0);
        sameCell = sameBuilds(result, reference) && result.evaluated === reference.evaluated ? 'yes' : 'NO';
      }
      let workerCells = '';
      if (workers > 1) {
        const parStart = performance.now();
        const merged = mergeShardResults(data, request.topN, await runSharded(kind, n, workers));
        const parMs = performance.now() - parStart;
        workerCells = `\t${parMs.toFixed(0)}\t${sameBuilds(merged, result) ? 'yes' : 'NO'}`;
      }
      console.log(
        `${n}\t${result.prunedEchoes.length}\t${result.evaluated}\t${result.scored}\t${ms.toFixed(0)}\t${(result.evaluated / (ms / 1000)).toFixed(0)}\t${referenceCell}\t${sameCell}${workerCells}`,
      );
    }
  }
}

if (isMainThread) {
  void main();
} else {
  const job = workerData as ShardJob;
  const { data, request } = benchCase(loadSnapshot(), job.kind, job.n);
  parentPort!.postMessage(searchExhaustive(data, request, undefined, job.shard));
}
