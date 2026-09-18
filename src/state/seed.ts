import { loadBundledSnapshot } from '../data/index.ts';
import { MAIN_STAT_RANGES, SUB_STAT_TIERS } from '../data/echoStats.ts';
import { ownedEchoSchema, type EchoDefData, type OwnedEcho } from '../data/schema.ts';
import { SUBSTAT_POOL } from '../data/placeholders.ts';
import { db } from './db.ts';
import { useInventoryStore } from './inventory.ts';

/**
 * DEV-only inventory seeder (random echoes for optimizer testing).
 * Builds rows from real synced echo defs (cost/sonata/pools) with LEGAL
 * maxed values — mains at the cost-tier 5★ Lv25 maximum (mains scale
 * deterministically, so max is the only legal Lv25 value) and substats
 * snapped to rolled tiers (docs/echostats.md) — never shipped to
 * production UI except behind `import.meta.env.DEV`.
 */

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

/** Pure row builder (testable without Dexie). Throws if a row fails validation. */
export function buildSeedEchoes(
  defs: readonly EchoDefData[],
  count: number,
  rand: () => number = Math.random,
  sonataId?: string,
): OwnedEcho[] {
  if (defs.length === 0) throw new Error('no echo defs available for seeding');
  const candidates = sonataId === undefined ? defs : defs.filter((d) => d.sonataIds.includes(sonataId));
  if (candidates.length === 0) throw new Error(`no echo defs belong to sonata set ${JSON.stringify(sonataId)}`);
  const rows: OwnedEcho[] = [];
  for (let i = 0; i < count; i += 1) {
    const def = pick(candidates, rand);
    // Only mains with a documented Lv25 value are seedable — 1-cost flats
    // have no reference entry, so 1-cost seeds roll the % mains.
    const mainPool = def.allowedMainStats.filter((s) => MAIN_STAT_RANGES[def.cost][s] !== undefined);
    if (mainPool.length === 0) throw new Error(`no documented main stats for ${def.name} (cost ${def.cost})`);
    const mainStat = pick(mainPool, rand);
    const subCount = 3 + Math.floor(rand() * 3); // 3–5
    const pool = SUBSTAT_POOL.filter((s) => s !== mainStat && SUB_STAT_TIERS[s] !== undefined);
    const substats: OwnedEcho['substats'] = [];
    for (let s = 0; s < subCount && pool.length > 0; s += 1) {
      const idx = Math.floor(rand() * pool.length);
      const [stat] = pool.splice(idx, 1);
      substats.push({ stat, value: pick(SUB_STAT_TIERS[stat]!, rand) });
    }
    rows.push(
      ownedEchoSchema.parse({
        id: crypto.randomUUID(),
        label: def.name,
        echoDefId: def.id,
        sonataId: sonataId ?? pick(def.sonataIds, rand),
        cost: def.cost,
        level: 25,
        rarity: 5,
        mainStat: { stat: mainStat, value: MAIN_STAT_RANGES[def.cost][mainStat]!.max },
        // TODO: the flat-ATK secondary has no documented Lv25 value in
        // docs/echostats.md — omitted until a real source is verified.
        substats,
        equippedTo: null,
        origin: 'seed',
      }),
    );
  }
  return rows;
}

/** Bulk-writes random echoes into the inventory store. DEV only. */
export async function seedInventory(count = 30, sonataId?: string): Promise<number> {
  const rows = buildSeedEchoes(loadBundledSnapshot().echoDefs, count, Math.random, sonataId);
  await db.ownedEchoes.bulkAdd(rows);
  useInventoryStore.setState((s) => ({ echoes: [...s.echoes, ...rows], loaded: true }));
  return rows.length;
}
