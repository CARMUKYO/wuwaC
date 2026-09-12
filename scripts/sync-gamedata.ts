/**
 * Offline game-data sync (reference doc §8.2).
 *
 * Fetches character/weapon/echo data from the encore.moe community API,
 * validates and normalizes it into this project's internal shapes, and
 * writes a versioned JSON snapshot to `src/data/generated/`. That snapshot
 * — not a live API call — is what ships with the app.
 *
 * Run manually (game patches ~every 6 weeks; no need for automation yet):
 *   npm run sync                          # everything (~500 requests)
 *   npm run sync -- --chars               # characters only
 *   npm run sync -- --weapons             # weapons only
 *   npm run sync -- --echoes              # echo defs (+ sonata sets) only
 *   npm run sync -- --only Jiyan Verina   # filter by exact name
 *
 * Partial syncs carry untouched categories over from the committed
 * snapshot, so `--echoes` never empties characters/weapons.
 * Echo coverage: cost prefers Handbook intensity with a detail-Rarity
 * fallback ({0:1, 1:3, 2:4, 3:4}, cross-checked against Handbook costs
 * and RandGroupId pool families); pools prefer Handbook tokens
 * with a cost-tier fallback. Fallback records are logged, never silent.
 * Excluded up front (skipped before the detail fetch): `Phantom: ...`
 * shiny variants and unreleased `MonsterInfo_<id>_Name` placeholders —
 * neither is a separately farmable echo (see echoSkipReasonForName).
 *
 * Polite-client rules: sequential requests with a small delay between
 * detail fetches, no refetch loops. Per-record problems skip-and-report
 * (expected gaps like female Rover variants vs unexpected parse failures);
 * unexpected failures still write the partial snapshot but exit non-zero.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import {
  bonusKindFromDamageType,
  echoCostFromIntensity,
  echoCostFromRarity,
  echoSkipReasonForName,
  isHealingAttribute,
  isScalingAttribute,
  parseAttribute,
  parseMotionText,
  parsePercentText,
  resolveMotionBonusKind,
  resolveMotionScaling,
  scalingFromPropertyName,
  skillKindFromType,
  slugify,
  statEffectFromBonusLine,
  statKeyFromForteTitle,
  statKeyFromPropertyName,
  statKeysFromMainStatToken,
  stripHtml,
} from '../src/data/encore.ts';
import { MAIN_STAT_POOLS } from '../src/data/placeholders.ts';
import {
  SNAPSHOT_VERSION,
  snapshotSchema,
  type CharacterData,
  type EchoDefData,
  type Snapshot,
  type SonataSetData,
  type StatKey,
  type WeaponData,
} from '../src/data/schema.ts';

const API = 'https://api-v2.encore.moe/api/en';
const DETAIL_DELAY_MS = 200;

const warnings: string[] = [];
function warn(message: string): void {
  warnings.push(message);
  console.warn(`  warning: ${message}`);
}

/** Expected gaps (reported, exit code unaffected). */
const skips: { name: string; reason: string }[] = [];
/** Records included via fallback data (tier pools, Rarity costs) — auditable, exit code unaffected. */
const fallbacks: { name: string; reason: string }[] = [];
/** Unexpected per-record failures (reported, exit code 1). */
const failures: { name: string; error: string }[] = [];

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json() as Promise<unknown>;
}

// Loose raw shapes: validate only the fields consumed, so provider-side
// additions/renames elsewhere fail loudly here instead of corrupting data.
const rawGrowthEntry = z.looseObject({ level: z.number().optional(), Level: z.number().optional(), value: z.unknown().optional(), Value: z.unknown().optional() });
const rawProperty = z.looseObject({ Name: z.string(), GrowthValues: z.array(rawGrowthEntry) });
const rawSkillAttribute = z.looseObject({ attributeName: z.string(), values: z.array(z.string()) });
const rawDamageEntry = z.looseObject({
  PropertyName: z.string().optional(),
  Type: z.string().optional(),
  RateLv: z.array(z.string()).optional(),
});
const rawSkill = z.looseObject({
  SkillId: z.number(),
  SkillType: z.string(),
  SkillName: z.string(),
  SkillDescribe: z.string().optional(),
  SkillAttributes: z.array(rawSkillAttribute),
  DamageList: z.array(rawDamageEntry),
});
const rawForteNode = z.looseObject({ Id: z.number(), PropertyNodeTitle: z.string(), PropertyNodeDescribe: z.string() });
const rawChainNode = z.looseObject({ GroupIndex: z.number(), NodeName: z.string(), AttributesDescription: z.string() });
const rawCharacter = z.looseObject({
  Id: z.number(),
  Name: z.object({ Content: z.string() }),
  QualityId: z.number(),
  ElementName: z.string(),
  WeaponTypeName: z.string(),
  /** Present on Rover variants ("MaleM"/"FemaleM"); absent otherwise. */
  RoleBody: z.string().optional(),
  Properties: z.array(rawProperty),
  Skills: z.array(rawSkill),
  SkillTree: z.array(rawForteNode),
  ResonantChain: z.array(rawChainNode),
});
const rawWeaponDetail = z.looseObject({
  WeaponName: z.string(),
  WeaponTypeName: z.string(),
  QualityId: z.number(),
  Properties: z.array(rawProperty).min(1),
  ResonName: z.string(),
  Desc: z.string(),
  DescParams: z.array(z.looseObject({ ArrayString: z.array(z.string()) })),
});
const rawFetter = z.looseObject({ Key: z.number(), Name: z.string(), EffectDescription: z.string() });
const rawFetterGroup = z.looseObject({ Id: z.number(), Name: z.string(), Fetters: z.array(rawFetter) });
const rawEcho = z.looseObject({ FetterGroups: z.array(rawFetterGroup) });

function curveValues(prop: z.infer<typeof rawProperty>, what: string): { level: number; raw: unknown }[] {
  return prop.GrowthValues.map((g, i) => {
    const level = g.level ?? g.Level;
    const raw = g.value ?? g.Value;
    if (level === undefined || raw === undefined) {
      throw new Error(`${what}: growth entry ${i} has no level/value`);
    }
    return { level, raw };
  });
}

function numberFromRaw(raw: unknown, what: string): { value: number; isPercent: boolean } {
  if (typeof raw === 'number') return { value: raw, isPercent: false };
  if (typeof raw === 'string' && raw.trim().endsWith('%')) {
    return { value: parsePercentText(raw), isPercent: true };
  }
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return { value: Number(raw), isPercent: false };
  }
  throw new Error(`${what}: cannot parse curve value ${JSON.stringify(raw)}`);
}

/**
 * Keep only usable remote icon URLs. Anything else becomes `undefined` so
 * the snapshot schema (url-validated) never rejects a record over artwork.
 */
function cleanIconUrl(value: unknown): string | undefined {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : undefined;
}

function normalizeCharacter(raw: unknown, fetchedAt: string, iconUrl?: string): {
  character: CharacterData;
  /** Rover-variant disambiguator ("MaleM"/"FemaleM"); undefined otherwise. */
  roleBody: string | undefined;
} {
  const c = rawCharacter.parse(raw);
  const name = c.Name.Content;
  const id = slugify(name);
  const attribute = parseAttribute(c.ElementName);

  if (c.QualityId !== 4 && c.QualityId !== 5) {
    throw new Error(`${name}: unexpected QualityId ${c.QualityId}`);
  }

  const propByName = new Map(c.Properties.map((p) => [p.Name, p]));
  for (const need of ['HP', 'ATK', 'DEF']) {
    if (!propByName.has(need)) throw new Error(`${name}: missing property ${need}`);
  }
  const curves = ['HP', 'ATK', 'DEF'].map((n) => curveValues(propByName.get(n)!, `${name}.${n}`));
  const n = curves[0].length;
  if (!curves.every((cv) => cv.length === n)) {
    throw new Error(`${name}: stat curve lengths diverge`);
  }
  const baseStats = curves[0].map((hpEntry, i) => {
    const atkEntry = curves[1][i];
    const defEntry = curves[2][i];
    if (atkEntry.level !== hpEntry.level || defEntry.level !== hpEntry.level) {
      throw new Error(`${name}: stat curve levels misaligned at index ${i}`);
    }
    const hp = numberFromRaw(hpEntry.raw, `${name}.HP`);
    const atk = numberFromRaw(atkEntry.raw, `${name}.ATK`);
    const def = numberFromRaw(defEntry.raw, `${name}.DEF`);
    if (hp.isPercent || atk.isPercent || def.isPercent) {
      throw new Error(`${name}: base HP/ATK/DEF must be flat values`);
    }
    return { level: hpEntry.level, hp: hp.value, atk: atk.value, def: def.value };
  });

  let skippedSkills = 0;
  let skippedAttributes = 0;
  const skills: CharacterData['skills'] = [];
  const inherentSkills: CharacterData['inherentSkills'] = [];
  for (const s of c.Skills) {
    const kind = skillKindFromType(s.SkillType);
    if (kind === null) {
      // Inherent Skills carry the mode/stack rules hand modules are built
      // from — capture the prose, but they are not scored skills.
      if (s.SkillType === 'Inherent Skill') {
        const prose = stripHtml(s.SkillDescribe ?? '');
        if (s.SkillName === 'Skillful Cooking') {
          // Ubiquitous cooking passive, identical on every character.
        } else if (s.SkillName === '') {
          warn(`${name}: inherent skill with empty name (id ${s.SkillId}), dropped`);
        } else if (prose === '') {
          warn(`${name}.${s.SkillName}: inherent skill has no prose, dropped`);
        } else {
          inherentSkills.push({ id: String(s.SkillId), name: s.SkillName, description: prose });
        }
      }
      skippedSkills += 1;
      continue;
    }
    const scalingRaw = s.DamageList[0]?.PropertyName ?? 'ATK';
    const scaling = scalingRaw === 'HP' || scalingRaw === 'DEF' ? scalingRaw : 'ATK';
    if (scalingRaw !== scaling) warn(`${name}.${s.SkillName}: unknown scaling ${JSON.stringify(scalingRaw)}, assumed ATK`);
    const scalingSet = new Set(
      s.DamageList.map((d) => scalingFromPropertyName(d.PropertyName ?? '')).filter((p) => p !== null),
    );
    if (scalingSet.size > 1) {
      warn(`${name}.${s.SkillName}: mixed scaling ${JSON.stringify([...scalingSet])}, resolving per-motion`);
    }
    const damageEntries = s.DamageList.filter(
      (d): d is { Type: string; RateLv: string[] } & typeof d =>
        typeof d.Type === 'string' && Array.isArray(d.RateLv) && d.RateLv.length > 0,
    ).map((d) => ({ type: d.Type, rateLevelOne: d.RateLv[0] }));
    const damageTypes = new Set(
      damageEntries.map((d) => bonusKindFromDamageType(d.type)).filter((k) => k !== null),
    );
    if (damageEntries.length > 0 && damageTypes.size > 1) {
      warn(`${name}.${s.SkillName}: mixed DamageList types ${JSON.stringify([...new Set(damageEntries.map((d) => d.type))])}, resolving per-motion`);
    }
    for (const d of s.DamageList) {
      if (d.Type !== undefined && bonusKindFromDamageType(d.Type) === null) {
        warn(`${name}.${s.SkillName}: unknown DamageList Type ${JSON.stringify(d.Type)}, falls back to skill kind`);
        break;
      }
    }
    const motionValues = s.SkillAttributes.filter((a) => {
      const keep = isScalingAttribute(a.attributeName);
      if (!keep) skippedAttributes += 1;
      return keep;
    }).map((a) => {
      const parsed = a.values.map((v) => parseMotionText(v));
      const hits = parsed[0]?.hits ?? 1;
      if (parsed.length === 0) throw new Error(`${name}.${s.SkillName}.${a.attributeName}: empty motion array`);
      if (!parsed.every((p) => p.hits === hits)) {
        throw new Error(`${name}.${s.SkillName}.${a.attributeName}: hit counts vary by level`);
      }
      const entry: CharacterData['skills'][number]['motionValues'][number] = {
        name: a.attributeName,
        values: parsed.map((p) => p.ratio),
        hits,
        dmgType: resolveMotionBonusKind(s.SkillType, a.values[0] ?? '', damageEntries),
        scaling: resolveMotionScaling(
          a.values[0] ?? '',
          s.DamageList.filter(
            (d): d is { PropertyName: string; RateLv: string[] } & typeof d =>
              typeof d.PropertyName === 'string' && Array.isArray(d.RateLv) && d.RateLv.length > 0,
          ).map((d) => ({ propertyName: d.PropertyName, rateLevelOne: d.RateLv[0] })),
          scaling,
        ),
        isHealing: isHealingAttribute(a.attributeName),
      };
      if (parsed.some((p) => p.flat !== 0)) {
        entry.flatValues = parsed.map((p) => p.flat);
      }
      return entry;
    });
    const lengths = new Set(motionValues.map((m) => m.values.length));
    if (lengths.size > 1) {
      // Lengths index by forte level, so misaligned arrays cannot be used.
      // Keep the majority length (healing/metadata rows sometimes ship
      // shorter) and skip the rest loudly instead of failing the character.
      const counts = new Map<number, number>();
      for (const m of motionValues) counts.set(m.values.length, (counts.get(m.values.length) ?? 0) + 1);
      const keepLength = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
      const dropped = motionValues.filter((m) => m.values.length !== keepLength);
      for (const d of dropped) {
        warn(`${name}.${s.SkillName}.${d.name}: ${d.values.length} values vs ${keepLength}, skipped`);
        skippedAttributes += 1;
      }
      motionValues.splice(0, motionValues.length, ...motionValues.filter((m) => m.values.length === keepLength));
    }
    const skillProse = stripHtml(s.SkillDescribe ?? '');
    skills.push({
      id: String(s.SkillId),
      kind,
      label: `${s.SkillName} (${s.SkillType})`,
      attribute,
      scaling,
      motionValues,
      ...(skillProse !== '' ? { description: skillProse } : {}),
    });
  }

  const forteNodes: CharacterData['forteNodes'] = [];
  for (const node of c.SkillTree) {
    const stat = statKeyFromForteTitle(node.PropertyNodeTitle);
    if (stat === null) {
      warn(`${name}: unmapped forte node ${JSON.stringify(node.PropertyNodeTitle)}, skipped`);
      continue;
    }
    const pct = /([\d.]+)%/.exec(node.PropertyNodeDescribe);
    if (!pct) throw new Error(`${name}: forte node has no percent value: ${node.PropertyNodeDescribe}`);
    forteNodes.push({ id: String(node.Id), title: node.PropertyNodeTitle, stat, value: parsePercentText(pct[0]) });
  }

  const chain = [...c.ResonantChain].sort((a, b) => a.GroupIndex - b.GroupIndex);
  if (chain.length !== 6 || !chain.every((node, i) => node.GroupIndex === i + 1)) {
    throw new Error(`${name}: expected resonance ranks 1-6, got [${chain.map((x) => x.GroupIndex)}]`);
  }
  const resonanceChain: CharacterData['resonanceChain'] = chain.map((node) => ({
    rank: node.GroupIndex as 1 | 2 | 3 | 4 | 5 | 6,
    name: node.NodeName,
    description: stripHtml(node.AttributesDescription),
    // v1 stores chain effects as display text only — structuring buff
    // mechanics from prose would be fabrication (Agents.md guardrails).
    effect: { kind: 'custom', note: 'Unstructured kit effect — see description.' } as const,
  }));

  console.log(`  ${name}: ${skills.length} skills (+${inherentSkills.length} inherent), ${forteNodes.length} forte nodes, 6 chain ranks (${skippedSkills} passive skills, ${skippedAttributes} metadata attributes skipped)`);
  return {
    character: {
      id,
      name,
      ...(iconUrl ? { iconUrl } : {}),
      rarity: c.QualityId as 4 | 5,
      attribute,
      weaponType: c.WeaponTypeName as CharacterData['weaponType'],
      baseStats,
      skills,
      inherentSkills,
      forteNodes,
      resonanceChain,
      source: { provider: 'encore.moe', fetchedAt, apiId: c.Id },
    },
    roleBody: c.RoleBody,
  };
}

function normalizeWeapon(raw: unknown, fetchedAt: string, apiId: number, iconUrl?: string): WeaponData {
  const w = rawWeaponDetail.parse(raw);
  const id = slugify(w.WeaponName);
  const atkCurve = curveValues(w.Properties[0], `${w.WeaponName}.ATK`).map((e) => {
    const parsed = numberFromRaw(e.raw, `${w.WeaponName}.ATK`);
    if (parsed.isPercent) throw new Error(`${w.WeaponName}: ATK curve must be flat`);
    return { level: e.level, value: parsed.value };
  });
  const secondaryRaw = w.Properties[1];
  if (secondaryRaw === undefined) {
    warn(`${w.WeaponName}: no secondary stat, stored as null`);
  }
  const secondaryCurve = secondaryRaw
    ? curveValues(secondaryRaw, `${w.WeaponName}.secondary`).map((e) => {
        const parsed = numberFromRaw(e.raw, `${w.WeaponName}.secondary`);
        return { level: e.level, ...parsed };
      })
    : [];
  const secondaryStat =
    secondaryRaw === undefined
      ? null
      : statKeyFromPropertyName(secondaryRaw.Name, secondaryCurve[0].isPercent);
  if (secondaryRaw !== undefined && secondaryStat === null) {
    throw new Error(`${w.WeaponName}: unmapped secondary stat ${JSON.stringify(secondaryRaw.Name)}`);
  }
  if (
    secondaryCurve.length > 0 &&
    !secondaryCurve.every((e) => e.isPercent === secondaryCurve[0].isPercent)
  ) {
    throw new Error(`${w.WeaponName}: secondary stat mixes flat and percent values`);
  }
  console.log(`  ${w.WeaponName}: ATK ${atkCurve[0].value}->${atkCurve.at(-1)!.value}, secondary ${secondaryStat ?? 'none'}`);
  return {
    id,
    name: w.WeaponName,
    ...(iconUrl ? { iconUrl } : {}),
    weaponType: w.WeaponTypeName as WeaponData['weaponType'],
    rarity: w.QualityId,
    atkByLevel: atkCurve,
    secondaryStat:
      secondaryStat === null
        ? null
        : {
            stat: secondaryStat,
            byLevel: secondaryCurve.map((e) => ({ level: e.level, value: e.value })),
          },
    passive: {
      name: w.ResonName,
      description: stripHtml(w.Desc),
      paramsByRank: w.DescParams.map((d) => d.ArrayString),
      // Passive mechanics stay prose in v1 — same no-fabrication rule.
      effect: { kind: 'custom', note: 'Unstructured passive — see description.' },
    },
    source: { provider: 'encore.moe', fetchedAt, apiId },
  };
}

const rawEchoSkill = z.looseObject({
  DescriptionEx: z.string().optional(),
  SimplyDescription: z.string().optional(),
  SkillCD: z.number().optional(),
  LevelDescStrArray: z.array(z.looseObject({ ArrayString: z.array(z.string()) })).optional(),
});
const rawEchoDetail = z.looseObject({
  Element: z.looseObject({ Name: z.string() }),
  FetterGroup: z.array(z.number()),
  Rarity: z.number().optional(),
  MainProp: z.looseObject({ RandGroupId: z.number() }).optional(),
  PhantomType: z.number().optional(),
  Handbook: z
    .looseObject({ Intensity: z.string(), Descrtption1: z.string() })
    .optional(),
  Skill: rawEchoSkill.optional(),
});

export interface EchoSkip {
  status: 'skip';
  reason: string;
}

interface EchoListEntry {
  Id: number;
  Name: string;
  PhantomType?: number;
  IconSmall?: string;
  IconMiddle?: string;
}

/**
 * Normalize one echo list entry + its detail record into an EchoDefData,
 * or an expected skip (phantom/unreleased name, no cost source, unknown
 * pool token/sonata/element).
 * Anything structurally unexpected throws (unexpected failure, not a skip).
 *
 * Cost prefers Handbook intensity; detail Rarity ({0:1, 1:3, 2:4, 3:4},
 * cross-checked against every Handbook-derived cost and against
 * MainProp.RandGroupId pool families) fills the gap, and Rarity 4+ still
 * skips. Pools prefer Handbook tokens; without them the cost-tier
 * reference pool applies and the record is logged to `fallbacks`.
 */
function normalizeEchoDef(
  entry: EchoListEntry,
  raw: unknown,
  groupIdToSonata: Map<number, string>,
  fetchedAt: string,
  slugTaken: (slug: string) => boolean,
): EchoDefData | EchoSkip {
  const excluded = echoSkipReasonForName(entry.Name);
  if (excluded !== null) return { status: 'skip', reason: excluded };
  const detail = rawEchoDetail.parse(raw);
  const intensity = detail.Handbook?.Intensity ?? '';
  let cost = intensity === '' ? null : echoCostFromIntensity(intensity);
  if (cost === null && detail.Rarity !== undefined) {
    cost = echoCostFromRarity(detail.Rarity);
    if (cost !== null) {
      fallbacks.push({ name: entry.Name, reason: `cost ${cost} from Rarity (no Handbook intensity)` });
    }
  }
  if (cost === null) {
    if (detail.Rarity !== undefined && echoCostFromRarity(detail.Rarity) === null) {
      return { status: 'skip', reason: `unverified rarity ${detail.Rarity} (no cost mapping)` };
    }
    if (intensity === '') {
      return { status: 'skip', reason: 'no Handbook data (intensity unavailable)' };
    }
    return { status: 'skip', reason: `unknown intensity ${JSON.stringify(intensity)}` };
  }
  if (intensity !== '' && detail.Rarity !== undefined) {
    const viaRarity = echoCostFromRarity(detail.Rarity);
    if (viaRarity !== null && viaRarity !== cost) {
      warn(`${entry.Name}: Handbook cost ${cost} vs Rarity cost ${viaRarity}, kept Handbook`);
    }
  }
  // Provider-internal corroboration: MainProp.RandGroupId identifies the
  // main-stat pool family (501 = 4-cost pool, 502 = 3-cost pool, calibrated
  // against Reminiscence: Fenrico and Kronaclaw on 2026-09-12). Unknown
  // groups stay silent; mismatches on known groups warn loudly.
  const randGroup = detail.MainProp?.RandGroupId;
  if (randGroup === 501 && cost !== 4) {
    warn(`${entry.Name}: RandGroupId 501 (4-cost pool) vs resolved cost ${cost}`);
  } else if (randGroup === 502 && cost !== 3) {
    warn(`${entry.Name}: RandGroupId 502 (3-cost pool) vs resolved cost ${cost}`);
  }
  const handbook = detail.Handbook;
  const tokens = handbook ? [...handbook.Descrtption1.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()) : [];
  let allowed: StatKey[];
  if (tokens.length === 0) {
    allowed = [...MAIN_STAT_POOLS[cost].primary];
    fallbacks.push({ name: entry.Name, reason: `main-stat pool from cost-${cost} tier fallback (no Handbook pool)` });
  } else {
    allowed = [];
    for (const token of tokens) {
      const keys = statKeysFromMainStatToken(token);
      if (keys === null) {
        return { status: 'skip', reason: `unknown pool token ${JSON.stringify(token)}` };
      }
      for (const key of keys) {
        if (!allowed.includes(key)) allowed.push(key);
      }
    }
  }
  if (detail.FetterGroup.length === 0) {
    return { status: 'skip', reason: 'no sonata groups' };
  }
  const sonataIds: string[] = [];
  for (const groupId of detail.FetterGroup) {
    const sonata = groupIdToSonata.get(groupId);
    if (sonata === undefined) {
      return { status: 'skip', reason: `unknown sonata group ${groupId}` };
    }
    if (!sonataIds.includes(sonata)) sonataIds.push(sonata);
  }
  const elementName = detail.Element.Name;
  let element: EchoDefData['element'];
  try {
    element = parseAttribute(elementName);
  } catch {
    // Physical exists only on a handful of 1-cost echoes (see schema docs).
    if (elementName === 'Physical') element = 'Physical';
    else throw new Error(`unknown element: ${JSON.stringify(elementName)}`);
  }
  let id = slugify(entry.Name);
  if (slugTaken(id)) {
    id = `${id}-${entry.Id}`;
    warn(`echo slug clash for ${JSON.stringify(entry.Name)}, using ${JSON.stringify(id)}`);
  }
  const skillDesc = detail.Skill?.DescriptionEx ?? detail.Skill?.SimplyDescription;
  const skillDescription = skillDesc ? stripHtml(skillDesc) : undefined;
  const iconUrl = cleanIconUrl(entry.IconSmall) ?? cleanIconUrl(entry.IconMiddle);
  return {
    id,
    name: entry.Name,
    ...(iconUrl ? { iconUrl } : {}),
    element,
    sonataIds,
    cost,
    allowedMainStats: allowed,
    ...(skillDescription ? { skillDescription } : {}),
    ...(typeof detail.Skill?.SkillCD === 'number' ? { skillCooldown: detail.Skill.SkillCD } : {}),
    ...(detail.Skill?.LevelDescStrArray
      ? { skillRanks: detail.Skill.LevelDescStrArray.map((r) => r.ArrayString) }
      : {}),
    source: { provider: 'encore.moe', fetchedAt, apiId: entry.Id },
  };
}

function normalizeSonataSets(raw: unknown, fetchedAt: string): SonataSetData[] {
  const list = z.looseObject({ Echo: z.array(rawEcho) }).parse(raw);
  const groups = new Map<number, z.infer<typeof rawFetterGroup>>();
  for (const echo of list.Echo) {
    for (const g of echo.FetterGroups) groups.set(g.Id, g);
  }
  const sets: SonataSetData[] = [];
  const seenSlugs = new Map<string, number>();
  for (const g of [...groups.values()].sort((a, b) => a.Id - b.Id)) {
    const id = slugify(g.Name);
    const clash = seenSlugs.get(id);
    if (clash !== undefined && clash !== g.Id) throw new Error(`sonata slug clash: ${g.Name}`);
    seenSlugs.set(id, g.Id);
    const bonuses = [...g.Fetters]
      .sort((a, b) => a.Key - b.Key)
      .map((f) => {
        const parsed = statEffectFromBonusLine(f.EffectDescription);
        return {
          pieceCount: f.Key,
          effect:
            parsed === null
              ? ({ kind: 'custom', note: f.EffectDescription.trim() } as const)
              : ({ kind: 'stat', stat: parsed.stat, value: parsed.value } as const),
        };
      });
    sets.push({ id, name: g.Name, bonuses, source: { provider: 'encore.moe', fetchedAt, apiId: g.Id } });
  }
  const structured = sets.flatMap((s) => s.bonuses).filter((b) => b.effect.kind === 'stat').length;
  console.log(`  sonata sets: ${sets.length} (${structured} structured 2pc effects, rest kept as prose)`);
  return sets;
}

interface SyncFlags {
  chars: boolean;
  weapons: boolean;
  echoes: boolean;
  only: Set<string> | null;
}

function parseFlags(argv: string[]): SyncFlags {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Usage: npm run sync -- [--chars] [--weapons] [--echoes] [--only Name ...]\n' +
        'No flags syncs everything. --only filters by exact provider name.',
    );
    process.exit(0);
  }
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 ? new Set(argv.slice(onlyIdx + 1)) : null;
  const anyCategory =
    argv.includes('--chars') || argv.includes('--weapons') || argv.includes('--echoes');
  return {
    chars: argv.includes('--chars') || !anyCategory,
    weapons: argv.includes('--weapons') || !anyCategory,
    echoes: argv.includes('--echoes') || !anyCategory,
    only,
  };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const fetchedAt = new Date().toISOString();
  console.log(`syncing from ${API} at ${fetchedAt}`);

  const wanted = (name: string): boolean => flags.only === null || flags.only.has(name);
  let detailCount = 0;
  const fetchDetail = async (path: string): Promise<unknown> => {
    await sleep(DETAIL_DELAY_MS);
    const json = await getJson(path);
    detailCount += 1;
    if (detailCount % 25 === 0) console.log(`  …${detailCount} detail records fetched`);
    return json;
  };

  const characters: CharacterData[] = [];
  if (flags.chars) {
    console.log('characters…');
    const charList = z.looseObject({ roleList: z.array(z.looseObject({ Id: z.number(), Name: z.string(), RoleHeadIcon: z.string().optional() })) }).parse(await getJson('/character'));
    const seenSlugs = new Map<string, number>(); // slug -> index in characters
    for (const entry of charList.roleList) {
      if (!wanted(entry.Name)) continue;
      try {
        const { character, roleBody } = normalizeCharacter(
          await fetchDetail(`/character/${entry.Id}`),
          fetchedAt,
          cleanIconUrl(entry.RoleHeadIcon),
        );
        if (roleBody !== undefined && roleBody !== 'MaleM' && /rover/i.test(character.name)) {
          skips.push({ name: character.name, reason: `female Rover variant (${roleBody})` });
          continue;
        }
        const existingIdx = seenSlugs.get(character.id);
        if (existingIdx !== undefined) {
          if (roleBody === 'MaleM') {
            characters[existingIdx] = character; // prefer the male variant record
            warn(`${character.name}: duplicate slug, kept male variant`);
          } else {
            throw new Error(`slug collision for ${JSON.stringify(character.name)}`);
          }
          continue;
        }
        seenSlugs.set(character.id, characters.length);
        characters.push(character);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('slug collision')) throw err;
        failures.push({ name: entry.Name, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  const weapons: WeaponData[] = [];
  if (flags.weapons) {
    console.log('weapons…');
    const weaponList = z.looseObject({ weapons: z.array(z.looseObject({ Id: z.number(), Name: z.string(), Icon: z.string().optional() })) }).parse(await getJson('/weapon'));
    for (const entry of weaponList.weapons) {
      if (!wanted(entry.Name)) continue;
      try {
        weapons.push(normalizeWeapon(await fetchDetail(`/weapon/${entry.Id}`), fetchedAt, entry.Id, cleanIconUrl(entry.Icon)));
      } catch (err) {
        failures.push({ name: entry.Name, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  let sonataSets: SonataSetData[] = [];
  const echoDefs: EchoDefData[] = [];
  if (flags.echoes) {
    console.log('sonata sets…');
    const echoListRaw = await getJson('/echo');
    sonataSets = normalizeSonataSets(echoListRaw, fetchedAt);

    console.log('echo defs…');
    const echoList = z.looseObject({ Echo: z.array(z.looseObject({ Id: z.number(), Name: z.string(), PhantomType: z.number().optional(), IconSmall: z.string().optional(), IconMiddle: z.string().optional() })) }).parse(echoListRaw);
    const groupIdToSonata = new Map<number, string>();
    for (const set of sonataSets) groupIdToSonata.set(set.source.apiId, set.id);
    const takenSlugs = new Set<string>();
    const processEntry = async (entry: EchoListEntry): Promise<void> => {
      if (!wanted(entry.Name)) return;
      // Phantom shiny variants and unreleased placeholders never reach the
      // detail fetch — they are not separately farmable echoes, and most
      // would otherwise slip in via the Rarity-fallback cost.
      const excluded = echoSkipReasonForName(entry.Name);
      if (excluded !== null) {
        skips.push({ name: entry.Name, reason: excluded });
        return;
      }
      try {
        const def = normalizeEchoDef(entry, await fetchDetail(`/echo/${entry.Id}`), groupIdToSonata, fetchedAt, (slug) => takenSlugs.has(slug));
        if ('status' in def) {
          skips.push({ name: entry.Name, reason: def.reason });
          return;
        }
        takenSlugs.add(def.id);
        echoDefs.push(def);
      } catch (err) {
        failures.push({ name: entry.Name, error: err instanceof Error ? err.message : String(err) });
      }
    };
    // PhantomType 2 records are cosmetic variants of the same echo: process
    // the primary records first, then variants only when no same-named def
    // was accepted (a variant never displaces or duplicates a primary).
    const [primary, variants] = [echoList.Echo.filter((e) => e.PhantomType !== 2), echoList.Echo.filter((e) => e.PhantomType === 2)];
    for (const entry of primary) await processEntry(entry);
    for (const entry of variants) {
      if (takenSlugs.has(slugify(entry.Name))) {
        skips.push({ name: entry.Name, reason: 'PhantomType variant of an included echo' });
        continue;
      }
      await processEntry(entry);
    }
    console.log(`  echo defs: ${echoDefs.length} of ${echoList.Echo.length} list entries`);
  }

  // Partial syncs (--echoes etc.) carry the untouched categories over from
  // the committed snapshot instead of writing empty arrays (the schema
  // requires non-empty character/weapon lists).
  let charactersOut = characters;
  let weaponsOut = weapons;
  if (!flags.chars || !flags.weapons) {
    let prev: Snapshot | null = null;
    try {
      prev = snapshotSchema.parse(JSON.parse(readFileSync('src/data/generated/snapshot.json', 'utf8')));
    } catch {
      prev = null;
    }
    if (!flags.chars) {
      if (!prev) throw new Error('no committed snapshot to carry characters over from — run a full sync first');
      charactersOut = prev.characters;
    }
    if (!flags.weapons) {
      if (!prev) throw new Error('no committed snapshot to carry weapons over from — run a full sync first');
      weaponsOut = prev.weapons;
    }
  }

  const snapshot: Snapshot = snapshotSchema.parse({
    snapshotVersion: SNAPSHOT_VERSION,
    fetchedAt,
    provider: 'encore.moe',
    characters: charactersOut,
    weapons: weaponsOut,
    sonataSets,
    echoDefs,
  });
  writeFileSync('src/data/generated/snapshot.json', `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`wrote src/data/generated/snapshot.json (${charactersOut.length} characters, ${weaponsOut.length} weapons, ${sonataSets.length} sonata sets, ${echoDefs.length} echo defs)`);

  if (warnings.length > 0) console.log(`${warnings.length} warning(s)`);
  if (fallbacks.length > 0) {
    const byReason = new Map<string, string[]>();
    for (const fallback of fallbacks) {
      const list = byReason.get(fallback.reason) ?? [];
      list.push(fallback.name);
      byReason.set(fallback.reason, list);
    }
    console.log(`${fallbacks.length} fallback record(s) (auditable, included anyway):`);
    for (const [reason, names] of byReason) {
      console.log(`  - ${reason}: ${names.length} (e.g. ${names.slice(0, 3).join(', ')})`);
    }
  }
  if (skips.length > 0) {
    const byReason = new Map<string, string[]>();
    for (const skip of skips) {
      const list = byReason.get(skip.reason) ?? [];
      list.push(skip.name);
      byReason.set(skip.reason, list);
    }
    console.log(`${skips.length} expected skip(s):`);
    for (const [reason, names] of byReason) {
      console.log(`  - ${reason}: ${names.length} (e.g. ${names.slice(0, 3).join(', ')})`);
    }
  }
  if (failures.length > 0) {
    console.error(`${failures.length} unexpected failure(s):`);
    for (const failure of failures) console.error(`  - ${failure.name}: ${failure.error}`);
    process.exit(1);
  }
  console.log(failures.length === 0 && skips.length === 0 && warnings.length === 0 ? 'clean sync' : 'sync complete');
}

main().catch((err) => {
  console.error(`sync failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
