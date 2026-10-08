import { z } from 'zod';
import {
  applyEchoCostOverride,
  applyMotionTypeOverride,
  bonusKindFromDamageType,
  dedupeMotions,
  echoCostFromIntensity,
  echoCostFromRarity,
  echoSkipReasonForName,
  isHealingAttribute,
  isScalingAttribute,
  parseAttribute,
  parseMotionText,
  parsePercentText,
  partitionUsableMotions,
  resolveMotionBonusKind,
  resolveMotionScaling,
  scalingFromPropertyName,
  skillKindFromType,
  slugify,
  statEffectFromBonusLine,
  statKeyFromForteTitle,
  statKeyFromPropertyName,
  stripHtml,
} from './encore.ts';
import { MAIN_STAT_POOLS } from './placeholders.ts';
import {
  SNAPSHOT_VERSION,
  snapshotSchema,
  type CharacterData,
  type EchoDefData,
  type Snapshot,
  type SonataSetData,
  type StatKey,
  type WeaponData,
} from './schema.ts';

/**
 * Data layer: shared encore.moe fetch + normalize pipeline.
 *
 * ONE pipeline serves both the offline CLI sync (`scripts/sync-gamedata.ts`)
 * and the in-browser background refresh (`./activeSnapshot.ts`): same list
 * parsing, same per-record normalization, same zod validation. The CLI keeps
 * only its flags, partial carry-over, file write, and exit codes.
 *
 * Browser-safe by construction: no `node:` imports, fetch injected by the
 * caller, all logging through the injected reporter (the browser passes a
 * silent one — ~370 detail records must not spam the console).
 */

export const PROVIDER_API_BASE = 'https://api-v2.encore.moe/api/en';

/** Polite-client gap between detail fetches (reference doc §8.2). */
export const DETAIL_DELAY_MS = 200;

/** Per-record problems skip-and-report; unexpected failures still surface. */
export interface SyncReporter {
  info(message: string): void;
  warn(message: string): void;
  skip(name: string, reason: string): void;
  fallback(name: string, reason: string): void;
  fail(name: string, error: string): void;
  progress(detailCount: number): void;
}

export interface CollectedSyncReport {
  reporter: SyncReporter;
  warnings: string[];
  skips: { name: string; reason: string }[];
  fallbacks: { name: string; reason: string }[];
  failures: { name: string; error: string }[];
}

/** Collecting reporter for the CLI (prints its own summaries from the arrays). */
export function createCollectingReporter(callbacks?: {
  onInfo?: (message: string) => void;
  onWarn?: (message: string) => void;
  onProgress?: (detailCount: number) => void;
}): CollectedSyncReport {
  const warnings: string[] = [];
  const skips: { name: string; reason: string }[] = [];
  const fallbacks: { name: string; reason: string }[] = [];
  const failures: { name: string; error: string }[] = [];
  const reporter: SyncReporter = {
    info: (message) => {
      callbacks?.onInfo?.(message);
    },
    warn: (message) => {
      warnings.push(message);
      callbacks?.onWarn?.(message);
    },
    skip: (name, reason) => {
      skips.push({ name, reason });
    },
    fallback: (name, reason) => {
      fallbacks.push({ name, reason });
    },
    fail: (name, error) => {
      failures.push({ name, error });
    },
    progress: (detailCount) => {
      callbacks?.onProgress?.(detailCount);
    },
  };
  return { reporter, warnings, skips, fallbacks, failures };
}

/** Silent reporter for the in-browser background refresh. */
export function createSilentReporter(): SyncReporter {
  return {
    info: () => {},
    warn: () => {},
    skip: () => {},
    fallback: () => {},
    fail: () => {},
    progress: () => {},
  };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Default fetcher over global `fetch` (Node 18+ and browsers). */
export async function fetchJsonFromProvider(path: string): Promise<unknown> {
  const res = await fetch(`${PROVIDER_API_BASE}${path}`);
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

function normalizeCharacter(
  raw: unknown,
  fetchedAt: string,
  reporter: SyncReporter,
  iconUrl?: string,
): {
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
          reporter.warn(`${name}: inherent skill with empty name (id ${s.SkillId}), dropped`);
        } else if (prose === '') {
          reporter.warn(`${name}.${s.SkillName}: inherent skill has no prose, dropped`);
        } else {
          inherentSkills.push({ id: String(s.SkillId), name: s.SkillName, description: prose });
        }
      }
      skippedSkills += 1;
      continue;
    }
    const scalingRaw = s.DamageList[0]?.PropertyName ?? 'ATK';
    const scaling = scalingRaw === 'HP' || scalingRaw === 'DEF' ? scalingRaw : 'ATK';
    if (scalingRaw !== scaling) reporter.warn(`${name}.${s.SkillName}: unknown scaling ${JSON.stringify(scalingRaw)}, assumed ATK`);
    const scalingSet = new Set(
      s.DamageList.map((d) => scalingFromPropertyName(d.PropertyName ?? '')).filter((p) => p !== null),
    );
    if (scalingSet.size > 1) {
      reporter.warn(`${name}.${s.SkillName}: mixed scaling ${JSON.stringify([...scalingSet])}, resolving per-motion`);
    }
    const damageEntries = s.DamageList.filter(
      (d): d is { Type: string; RateLv: string[] } & typeof d =>
        typeof d.Type === 'string' && Array.isArray(d.RateLv) && d.RateLv.length > 0,
    ).map((d) => ({ type: d.Type, rateLevelOne: d.RateLv[0] }));
    const damageTypes = new Set(
      damageEntries.map((d) => bonusKindFromDamageType(d.type)).filter((k) => k !== null),
    );
    if (damageEntries.length > 0 && damageTypes.size > 1) {
      reporter.warn(`${name}.${s.SkillName}: mixed DamageList types ${JSON.stringify([...new Set(damageEntries.map((d) => d.type))])}, resolving per-motion`);
    }
    for (const d of s.DamageList) {
      if (d.Type !== undefined && bonusKindFromDamageType(d.Type) === null) {
        reporter.warn(`${name}.${s.SkillName}: unknown DamageList Type ${JSON.stringify(d.Type)}, falls back to skill kind`);
        break;
      }
    }
    const motionValues = s.SkillAttributes.filter((a) => {
      const keep = isScalingAttribute(a.attributeName, a.values);
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
        dmgType: applyMotionTypeOverride(
          String(s.SkillId),
          a.attributeName,
          resolveMotionBonusKind(s.SkillType, a.values[0] ?? '', damageEntries),
        ),
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
    const { kept, dropped } = partitionUsableMotions(motionValues);
    for (const d of dropped) {
      reporter.warn(`${name}.${s.SkillName}.${d.name}: ${d.values.length} values, need >= 10 for forte levels 1-10, skipped`);
      skippedAttributes += 1;
    }
    motionValues.splice(0, motionValues.length, ...kept);
    const { kept: deduped, dropped: duplicates } = dedupeMotions(motionValues);
    for (const d of duplicates) {
      reporter.warn(`${name}.${s.SkillName}.${d.name}: duplicate row dropped, kept first (${d.values.length} values, Lv1 ratio ${d.values[0] ?? 'n/a'})`);
      skippedAttributes += 1;
    }
    motionValues.splice(0, motionValues.length, ...deduped);
    for (const m of motionValues) {
      if (m.values.length > 0 && m.values.every((v) => v === 0)) {
        reporter.warn(`${name}.${s.SkillName}.${m.name}: all-zero ratios kept (Lv1 flat ${m.flatValues?.[0] ?? 0}) — triage if new`);
      }
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
      reporter.warn(`${name}: unmapped forte node ${JSON.stringify(node.PropertyNodeTitle)}, skipped`);
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

  reporter.info(`  ${name}: ${skills.length} skills (+${inherentSkills.length} inherent), ${forteNodes.length} forte nodes, 6 chain ranks (${skippedSkills} passive skills, ${skippedAttributes} metadata attributes skipped)`);
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

function normalizeWeapon(
  raw: unknown,
  fetchedAt: string,
  apiId: number,
  reporter: SyncReporter,
  iconUrl?: string,
): WeaponData {
  const w = rawWeaponDetail.parse(raw);
  const id = slugify(w.WeaponName);
  const atkCurve = curveValues(w.Properties[0], `${w.WeaponName}.ATK`).map((e) => {
    const parsed = numberFromRaw(e.raw, `${w.WeaponName}.ATK`);
    if (parsed.isPercent) throw new Error(`${w.WeaponName}: ATK curve must be flat`);
    return { level: e.level, value: parsed.value };
  });
  const secondaryRaw = w.Properties[1];
  if (secondaryRaw === undefined) {
    reporter.warn(`${w.WeaponName}: no secondary stat, stored as null`);
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
  reporter.info(`  ${w.WeaponName}: ATK ${atkCurve[0].value}->${atkCurve.at(-1)!.value}, secondary ${secondaryStat ?? 'none'}`);
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
 * skips. Main-stat pools are the cost-tier pools from placeholders.ts
 * (docs/echostats.md) — the Handbook pool text is not parsed.
 */
function normalizeEchoDef(
  entry: EchoListEntry,
  raw: unknown,
  groupIdToSonata: Map<number, string>,
  fetchedAt: string,
  slugTaken: (slug: string) => boolean,
  reporter: SyncReporter,
): EchoDefData | EchoSkip {
  const excluded = echoSkipReasonForName(entry.Name);
  if (excluded !== null) return { status: 'skip', reason: excluded };
  const detail = rawEchoDetail.parse(raw);
  const intensity = detail.Handbook?.Intensity ?? '';
  let cost = intensity === '' ? null : echoCostFromIntensity(intensity);
  if (cost === null && detail.Rarity !== undefined) {
    cost = echoCostFromRarity(detail.Rarity);
    if (cost !== null) {
      reporter.fallback(entry.Name, `cost ${cost} from Rarity (no Handbook intensity)`);
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
      reporter.warn(`${entry.Name}: Handbook cost ${cost} vs Rarity cost ${viaRarity}, kept Handbook`);
    }
  }
  const overridden = applyEchoCostOverride(String(entry.Id), cost);
  if (overridden !== cost) {
    reporter.warn(`${entry.Name}: cost override ${cost} -> ${overridden} (verified Handbook contradiction)`);
    cost = overridden;
  }
  // Provider-internal corroboration: MainProp.RandGroupId identifies the
  // main-stat pool family (501 = 4-cost pool, 502 = 3-cost pool, calibrated
  // against Reminiscence: Fenrico and Kronaclaw on 2026-09-12). Unknown
  // groups stay silent; mismatches on known groups warn loudly.
  const randGroup = detail.MainProp?.RandGroupId;
  if (randGroup === 501 && cost !== 4) {
    reporter.warn(`${entry.Name}: RandGroupId 501 (4-cost pool) vs resolved cost ${cost}`);
  } else if (randGroup === 502 && cost !== 3) {
    reporter.warn(`${entry.Name}: RandGroupId 502 (3-cost pool) vs resolved cost ${cost}`);
  }
  const allowed: StatKey[] = [...MAIN_STAT_POOLS[cost].primary];
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
    // Provider "Physical" (element Id 0, Zero icon) marks element-less
    // echoes — the game has no Physical element, so none is stored.
    if (elementName === 'Physical') element = undefined;
    else throw new Error(`unknown element: ${JSON.stringify(elementName)}`);
  }
  let id = slugify(entry.Name);
  if (slugTaken(id)) {
    id = `${id}-${entry.Id}`;
    reporter.warn(`echo slug clash for ${JSON.stringify(entry.Name)}, using ${JSON.stringify(id)}`);
  }
  const skillDesc = detail.Skill?.DescriptionEx ?? detail.Skill?.SimplyDescription;
  const skillDescription = skillDesc ? stripHtml(skillDesc) : undefined;
  const iconUrl = cleanIconUrl(entry.IconSmall) ?? cleanIconUrl(entry.IconMiddle);
  return {
    id,
    name: entry.Name,
    ...(iconUrl ? { iconUrl } : {}),
    ...(element !== undefined ? { element } : {}),
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

function normalizeSonataSets(raw: unknown, fetchedAt: string, reporter: SyncReporter): SonataSetData[] {
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
  reporter.info(`  sonata sets: ${sets.length} (${structured} structured 2pc effects, rest kept as prose)`);
  return sets;
}

export interface GameDataParts {
  characters: CharacterData[];
  weapons: WeaponData[];
  sonataSets: SonataSetData[];
  echoDefs: EchoDefData[];
}

export interface FetchGameDataOptions {
  /** Path-scoped fetcher (`/character`, `/weapon/3`, …). Injectable for tests. */
  fetchJson: (path: string) => Promise<unknown>;
  /** Stamp for every normalized record. Defaults to now. */
  fetchedAt?: string;
  /** Polite-client gap between detail fetches. Defaults to DETAIL_DELAY_MS. */
  detailDelayMs?: number;
  /** Category filter for partial CLI syncs. Defaults to everything. */
  categories?: { chars: boolean; weapons: boolean; echoes: boolean };
  /** Exact provider names to include (CLI `--only`). Defaults to all. */
  only?: Set<string> | null;
  reporter?: SyncReporter;
  signal?: AbortSignal;
}

/**
 * Fetch + normalize every requested category from the provider.
 * Sequential requests with a politeness delay; per-record problems
 * skip-and-report (expected gaps vs unexpected parse failures).
 */
export async function fetchGameDataParts(options: FetchGameDataOptions): Promise<GameDataParts> {
  const {
    fetchJson,
    fetchedAt = new Date().toISOString(),
    detailDelayMs = DETAIL_DELAY_MS,
    categories = { chars: true, weapons: true, echoes: true },
    only = null,
    reporter = createSilentReporter(),
    signal,
  } = options;
  const wanted = (name: string): boolean => only === null || only.has(name);
  let detailCount = 0;
  const fetchDetail = async (path: string): Promise<unknown> => {
    signal?.throwIfAborted();
    await sleep(detailDelayMs);
    const json = await fetchJson(path);
    detailCount += 1;
    reporter.progress(detailCount);
    return json;
  };

  const characters: CharacterData[] = [];
  if (categories.chars) {
    reporter.info('characters…');
    const charList = z.looseObject({ roleList: z.array(z.looseObject({ Id: z.number(), Name: z.string(), RoleHeadIcon: z.string().optional() })) }).parse(await fetchJson('/character'));
    const seenSlugs = new Map<string, number>(); // slug -> index in characters
    for (const entry of charList.roleList) {
      signal?.throwIfAborted();
      if (!wanted(entry.Name)) continue;
      try {
        const { character, roleBody } = normalizeCharacter(
          await fetchDetail(`/character/${entry.Id}`),
          fetchedAt,
          reporter,
          cleanIconUrl(entry.RoleHeadIcon),
        );
        if (roleBody !== undefined && roleBody !== 'MaleM' && /rover/i.test(character.name)) {
          reporter.skip(character.name, `female Rover variant (${roleBody})`);
          continue;
        }
        const existingIdx = seenSlugs.get(character.id);
        if (existingIdx !== undefined) {
          if (roleBody === 'MaleM') {
            characters[existingIdx] = character; // prefer the male variant record
            reporter.warn(`${character.name}: duplicate slug, kept male variant`);
          } else {
            throw new Error(`slug collision for ${JSON.stringify(character.name)}`);
          }
          continue;
        }
        seenSlugs.set(character.id, characters.length);
        characters.push(character);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('slug collision')) throw err;
        reporter.fail(entry.Name, err instanceof Error ? err.message : String(err));
      }
    }
  }

  const weapons: WeaponData[] = [];
  if (categories.weapons) {
    reporter.info('weapons…');
    const weaponList = z.looseObject({ weapons: z.array(z.looseObject({ Id: z.number(), Name: z.string(), Icon: z.string().optional() })) }).parse(await fetchJson('/weapon'));
    for (const entry of weaponList.weapons) {
      signal?.throwIfAborted();
      if (!wanted(entry.Name)) continue;
      try {
        weapons.push(normalizeWeapon(await fetchDetail(`/weapon/${entry.Id}`), fetchedAt, entry.Id, reporter, cleanIconUrl(entry.Icon)));
      } catch (err) {
        reporter.fail(entry.Name, err instanceof Error ? err.message : String(err));
      }
    }
  }

  let sonataSets: SonataSetData[] = [];
  const echoDefs: EchoDefData[] = [];
  if (categories.echoes) {
    reporter.info('sonata sets…');
    const echoListRaw = await fetchJson('/echo');
    sonataSets = normalizeSonataSets(echoListRaw, fetchedAt, reporter);

    reporter.info('echo defs…');
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
        reporter.skip(entry.Name, excluded);
        return;
      }
      try {
        const def = normalizeEchoDef(entry, await fetchDetail(`/echo/${entry.Id}`), groupIdToSonata, fetchedAt, (slug) => takenSlugs.has(slug), reporter);
        if ('status' in def) {
          reporter.skip(entry.Name, def.reason);
          return;
        }
        takenSlugs.add(def.id);
        echoDefs.push(def);
      } catch (err) {
        reporter.fail(entry.Name, err instanceof Error ? err.message : String(err));
      }
    };
    // PhantomType 2 records are cosmetic variants of the same echo: process
    // the primary records first, then variants only when no same-named def
    // was accepted (a variant never displaces or duplicates a primary).
    const [primary, variants] = [echoList.Echo.filter((e) => e.PhantomType !== 2), echoList.Echo.filter((e) => e.PhantomType === 2)];
    for (const entry of primary) await processEntry(entry);
    for (const entry of variants) {
      if (takenSlugs.has(slugify(entry.Name))) {
        reporter.skip(entry.Name, 'PhantomType variant of an included echo');
        continue;
      }
      await processEntry(entry);
    }
    reporter.info(`  echo defs: ${echoDefs.length} of ${echoList.Echo.length} list entries`);
  }

  return { characters, weapons, sonataSets, echoDefs };
}

/** Validate fetched parts into a shippable snapshot (throws on bad shape). */
export function assembleSnapshot(parts: GameDataParts, fetchedAt: string): Snapshot {
  return snapshotSchema.parse({
    snapshotVersion: SNAPSHOT_VERSION,
    fetchedAt,
    provider: 'encore.moe',
    characters: parts.characters,
    weapons: parts.weapons,
    sonataSets: parts.sonataSets,
    echoDefs: parts.echoDefs,
  });
}
