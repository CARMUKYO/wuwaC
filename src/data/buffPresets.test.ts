import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import {
  BUFF_PRESETS,
  isAutoApplied,
  resolvePresetMods,
  type BuffPreset,
} from './buffPresets.ts';

const snapshot = loadBundledSnapshot();
const byId = new Map<string, BuffPreset>(BUFF_PRESETS.map((p) => [p.id, p]));

function preset(id: string): BuffPreset {
  const found = byId.get(id);
  if (!found) throw new Error(`missing preset ${id}`);
  return found;
}

describe('buff presets', () => {
  it('uses unique preset ids', () => {
    expect(byId.size).toBe(BUFF_PRESETS.length);
  });

  it('resolves every sourceRef against the bundled snapshot', () => {
    const missing: string[] = [];
    for (const p of BUFF_PRESETS) {
      const ok =
        p.source === 'Echo'
          ? snapshot.echoDefs.some((d) => d.id === p.sourceRef)
          : p.source === 'Sonata'
            ? snapshot.sonataSets.some((s) => s.id === p.sourceRef)
            : snapshot.weapons.some((w) => w.id === p.sourceRef);
      if (!ok) missing.push(`${p.id} -> ${p.sourceRef}`);
    }
    expect(missing).toEqual([]);
  });

  it('never duplicates a sonata stat bonus that computeStats already applies', () => {
    const dupes: string[] = [];
    for (const p of BUFF_PRESETS) {
      if (p.source !== 'Sonata') continue;
      const set = snapshot.sonataSets.find((s) => s.id === p.sourceRef)!;
      const auto: string[] = [];
      for (const b of set.bonuses) {
        if (b.effect.kind === 'stat') auto.push(`${b.effect.stat}@${b.effect.value}`);
      }
      for (const mod of resolvePresetMods(p, {})) {
        if (auto.includes(`${mod.stat}@${mod.value}`)) dupes.push(p.id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('keeps every mod value in a sane range', () => {
    for (const p of BUFF_PRESETS) {
      for (const mod of p.mods) {
        const values = mod.valuesByRank ?? [mod.value];
        for (const v of values) {
          // tuneBreakBoost is documented raw points (schema.ts), not a
          // ratio — it carries its own bound instead of the ratio bound.
          if (mod.stat === 'tuneBreakBoost') {
            expect(v).toBeGreaterThan(0);
            expect(v).toBeLessThanOrEqual(99);
            continue;
          }
          // resistancePenetration is signed (shred goes negative) — the
          // shred-sign test in damage.test.ts pins the convention.
          if (mod.stat === 'resistancePenetration') {
            expect(v).toBeGreaterThanOrEqual(-1);
            expect(v).toBeLessThanOrEqual(1);
            continue;
          }
          expect(v).toBeGreaterThan(0);
          // Stacked branches legitimately exceed 100% (Red Spring Basic
          // reaches 140% at R5, 2026-09-17) — the bound guards against
          // order-of-magnitude slips, not stacked maxima.
          expect(v).toBeLessThanOrEqual(1.5);
        }
      }
    }
  });

  it('requires live-source provenance wherever the snapshot note still has {N} placeholders', () => {
    const missing: string[] = [];
    for (const p of BUFF_PRESETS) {
      if (p.source !== 'Sonata' || p.sonataPieceCount === undefined) continue;
      const set = snapshot.sonataSets.find((s) => s.id === p.sourceRef)!;
      const bonus = set.bonuses.find((b) => b.pieceCount === p.sonataPieceCount)!;
      const text =
        bonus.effect.kind === 'custom'
          ? bonus.effect.note
          : bonus.effect.kind === 'conditional'
            ? bonus.effect.condition
            : null;
      if (text !== null && text.includes('{') && p.liveSource === undefined) {
        missing.push(p.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('resolves weapon rank series (Autumntrace R1 vs R5)', () => {
    const atk = (rank: number): number =>
      resolvePresetMods(preset('weapon-autumntrace'), { weaponRank: rank })[0].value;
    expect(atk(1)).toBeCloseTo(0.2, 10);
    expect(atk(5)).toBeCloseTo(0.64, 10);
    expect(atk(5)).toBeCloseTo(5 * 0.128, 10);
  });

  it('resolves dmgBonus:character to the scored attribute (Verdant Summit)', () => {
    const mods = resolvePresetMods(preset('weapon-verdant-summit'), {
      weaponRank: 5,
      attribute: 'Spectro',
    });
    expect(mods).toContainEqual({ stat: 'dmgBonus:Spectro', value: 0.24 });
    expect(mods).toContainEqual({ stat: 'dmgBonus:heavy', value: 0.96 });
  });

  it('marks wielder effects auto-applied and team/incoming manual', () => {
    expect(isAutoApplied(preset('weapon-autumntrace'))).toBe(true);
    expect(isAutoApplied(preset('sonata-sierra-gale-5pc'))).toBe(true);
    expect(isAutoApplied(preset('echo-lorelei'))).toBe(true);
    expect(isAutoApplied(preset('weapon-static-mist-outro'))).toBe(false);
    expect(isAutoApplied(preset('sonata-moonlit-clouds-5pc'))).toBe(false);
    expect(isAutoApplied(preset('sonata-rejuvenating-glow-5pc'))).toBe(true);
    expect(isAutoApplied(preset('echo-denia-outro'))).toBe(false);
    expect(isAutoApplied(preset('echo-hyvatia-outro'))).toBe(false);
  });

  it('gives every auto-applied sonata preset a piece threshold', () => {
    for (const p of BUFF_PRESETS) {
      if (p.source === 'Sonata' && isAutoApplied(p)) {
        expect(p.sonataPieceCount).toBeDefined();
      }
    }
  });

  it('transcribes spot-checked echo and sonata values', () => {
    expect(resolvePresetMods(preset('echo-reminiscence-fleurdelys'), {})).toEqual([
      { stat: 'dmgBonus:Aero', value: 0.1 },
    ]);
    expect(resolvePresetMods(preset('echo-lorelei'), {})).toEqual([
      { stat: 'dmgBonus:Havoc', value: 0.12 },
      { stat: 'dmgBonus:basic', value: 0.12 },
    ]);
    expect(resolvePresetMods(preset('sonata-moonlit-clouds-5pc'), {})).toEqual([
      { stat: 'atkPct', value: 0.225 },
    ]);
    expect(resolvePresetMods(preset('sonata-lingering-tunes-5pc'), {})).toEqual([
      { stat: 'atkPct', value: 0.2 },
      { stat: 'dmgBonus:outro', value: 0.6 },
    ]);
    expect(resolvePresetMods(preset('echo-glommoth-outro'), {})).toEqual([
      { stat: 'dmgBonus:Glacio', value: 0.12 },
    ]);
    expect(resolvePresetMods(preset('echo-voidwing-moth-outro'), {})).toEqual([
      { stat: 'atkPct', value: 0.12 },
    ]);
    // Hyvatia: 10% All-Attribute to the next resonator resolves to the
    // incoming attribute (orchestrator catch: same class as the audit's
    // outro follow-ups, missed as "needs per-recipient attributes").
    expect(resolvePresetMods(preset('echo-hyvatia-outro'), { attribute: 'Glacio' })).toEqual([
      { stat: 'dmgBonus:Glacio', value: 0.1 },
    ]);
    // Jué Blessing of Time stays untranscribed: wielder cast-buffs cannot
    // carry windows (auto-applied presets take effect full-uptime; windows
    // only work through the manual picker) — a model gap, not data.
  });

  it('pins weapon-audit fixes (snapshot descriptions, verified 2026-09-19)', () => {
    const byId = new Map(BUFF_PRESETS.map((entry) => [entry.id, entry]));
    // Ages of Harvest: Ageless Marking [24..48] + Ethereal Endowment [24..48]
    // are two named co-active buffs with no same-name exclusion, so they sum:
    // R1 0.24 + 0.24 = 0.48, R5 0.48 + 0.48 = 0.96.
    const agesSkill = byId
      .get('weapon-ages-of-harvest')
      ?.mods.find((mod) => mod.stat === 'dmgBonus:skill');
    expect(agesSkill?.valuesByRank).toEqual([0.48, 0.6, 0.72, 0.84, 0.96]);
    // Bloodpact's Pledge: the Unbound-Flow Aero rider covers "nearby
    // Resonators on the field", which includes a Rover: Aero wielder, so the
    // wielder preset carries it gated to Rover: Aero (teammates stay manual).
    const aero = byId.get('weapon-bloodpact-s-pledge-aero');
    expect(aero?.target).toBe('wielder');
    expect(aero?.requiresCharacterIds).toEqual(['rover-aero']);
    expect(aero?.mods).toHaveLength(1);
    expect(aero?.mods[0]?.stat).toBe('dmgBonus:Aero');
    expect(aero?.mods[0]?.valuesByRank).toEqual([0.1, 0.14, 0.18, 0.22, 0.26]);
    // Pistols#26 label matches the snapshot weapon name exactly.
    expect(byId.get('weapon-pistols-26')?.label).toBe('Pistols#26');
  });

  it('transcribes the live-source wave values (Game8 list, inspected 2026-09-16)', () => {
    // Frosty Resolve 5pc: 22.5% Glacio + 2 x 18% Skill at full stacks.
    expect(resolvePresetMods(preset('sonata-frosty-resolve-5pc'), {})).toEqual([
      { stat: 'dmgBonus:Glacio', value: 0.225 },
      { stat: 'dmgBonus:skill', value: 0.36 },
    ]);
    // Dream of the Lost 3pc: 20% Crit Rate + 35% Echo Skill at 0 energy.
    expect(resolvePresetMods(preset('sonata-dream-of-the-lost-3pc'), {})).toEqual([
      { stat: 'critRate', value: 0.2 },
      { stat: 'dmgBonus:echo', value: 0.35 },
    ]);
    // Shadow of Shattered Dreams 1pc: 35% Basic + 35% Heavy.
    expect(resolvePresetMods(preset('sonata-shadow-of-shattered-dreams-1pc'), {})).toEqual([
      { stat: 'dmgBonus:basic', value: 0.35 },
      { stat: 'dmgBonus:heavy', value: 0.35 },
    ]);
    // Reel of Spliced Memories 5pc: 20 raw Tune Break Boost points.
    expect(resolvePresetMods(preset('sonata-reel-of-spliced-memories-5pc'), {})).toEqual([
      { stat: 'tuneBreakBoost', value: 20 },
    ]);
    // Crown of Valor 3pc: 5 x 6% ATK + 5 x 4% Crit DMG at full stacks.
    expect(resolvePresetMods(preset('sonata-crown-of-valor-3pc'), {})).toEqual([
      { stat: 'atkPct', value: 0.3 },
      { stat: 'critDmg', value: 0.2 },
    ]);
  });

  it('transcribes RES-shred riders as negative penetration (Woodland Aria R1/R5)', () => {
    const shred = (rank: number): number =>
      resolvePresetMods(preset('weapon-woodland-aria'), { weaponRank: rank }).find(
        (m) => m.stat === 'resistancePenetration',
      )!.value;
    expect(shred(1)).toBeCloseTo(-0.1, 10);
    expect(shred(5)).toBeCloseTo(-0.16, 10);
  });

  it('transcribes coordinated-attack bonuses to the coordinated bucket', () => {
    expect(resolvePresetMods(preset('echo-hecate'), {})).toEqual([
      { stat: 'dmgBonus:coordinated', value: 0.4 },
    ]);
    expect(resolvePresetMods(preset('echo-nightmare-lampylumen-myriad'), {})).toEqual([
      { stat: 'dmgBonus:Glacio', value: 0.12 },
      { stat: 'dmgBonus:coordinated', value: 0.3 },
    ]);
    expect(resolvePresetMods(preset('sonata-empyrean-anthem-5pc'), {})).toEqual([
      { stat: 'dmgBonus:coordinated', value: 0.8 },
    ]);
    expect(isAutoApplied(preset('echo-hecate'))).toBe(true);
    expect(isAutoApplied(preset('sonata-empyrean-anthem-5pc'))).toBe(true);
  });

  it('closes the weapon gap closure batch (pistols-26, HP wielders, luminous team)', () => {
    // pistols-26: 2 x untouched stacks.
    expect(resolvePresetMods(preset('weapon-pistols-26'), { weaponRank: 1 })).toEqual([
      { stat: 'atkPct', value: 0.12 },
    ]);
    expect(resolvePresetMods(preset('weapon-pistols-26'), { weaponRank: 5 })).toEqual([
      { stat: 'atkPct', value: 0.24 },
    ]);
    // Stellar Symphony + Firstlight's Herald: wielder HP auto-applies.
    expect(resolvePresetMods(preset('weapon-stellar-symphony'), {})).toEqual([
      { stat: 'hpPct', value: 0.24 },
    ]);
    expect(resolvePresetMods(preset('weapon-firstlight-s-herald'), {})).toEqual([
      { stat: 'hpPct', value: 0.24 },
      { stat: 'atkPct', value: 0.4 },
    ]);
    expect(isAutoApplied(preset('weapon-stellar-symphony'))).toBe(true);
    expect(isAutoApplied(preset('weapon-stellar-symphony-team'))).toBe(false);
    // Luminous Hymn team Frazzle amp resolves at R1/R5.
    const amp = (rank: number): number =>
      resolvePresetMods(preset('weapon-luminous-hymn-team'), { weaponRank: rank })[0].value;
    expect(amp(1)).toBeCloseTo(0.3, 10);
    expect(amp(5)).toBeCloseTo(0.6, 10);
  });

  it('fixes confirmed weapon mis-transcriptions (Boson base ATK, Red Spring rider)', () => {
    // Boson Astrolabe: base ATK plus Tune-Break branch ATK.
    const bosonAtk = (rank: number): number =>
      resolvePresetMods(preset('weapon-boson-astrolabe'), { weaponRank: rank }).find(
        (m) => m.stat === 'atkPct',
      )!.value;
    expect(bosonAtk(1)).toBeCloseTo(0.24, 10);
    expect(bosonAtk(5)).toBeCloseTo(0.42, 10);
    // Red Spring: 3 x Basic stacks plus the Concerto-consumption rider.
    const redBasic = (rank: number): number =>
      resolvePresetMods(preset('weapon-red-spring'), { weaponRank: rank }).find(
        (m) => m.stat === 'dmgBonus:basic',
      )!.value;
    expect(redBasic(1)).toBeCloseTo(0.7, 10);
    expect(redBasic(5)).toBeCloseTo(1.4, 10);
  });

  it('applies wearer-total team riders without double-apply paths', () => {
    // Skull Thrasher R5: base 0.24 + team 0.48 = 0.72 ATK on the wearer.
    const skullAtk = resolvePresetMods(preset('weapon-skull-thrasher'), {})
      .filter((m) => m.stat === 'atkPct')
      .reduce((sum, m) => sum + m.value, 0);
    expect(skullAtk).toBeCloseTo(0.72, 10);
    // The manual team preset stays manual (teammate path intact).
    expect(isAutoApplied(preset('weapon-skull-thrasher'))).toBe(true);
    expect(isAutoApplied(preset('weapon-skull-thrasher-team'))).toBe(false);
    expect(resolvePresetMods(preset('weapon-skull-thrasher-team'), {})).toEqual([
      { stat: 'atkPct', value: 0.48 },
    ]);
    // Emerald Sentence wearer picks up the party Echo bonus too.
    const emeraldEcho = resolvePresetMods(preset('weapon-emerald-sentence'), {}).find(
      (m) => m.stat === 'dmgBonus:echo',
    )!.value;
    expect(emeraldEcho).toBeCloseTo(0.4, 10);
  });

  it('accounts every weapon: transcribed or explicitly excluded', () => {
    const excluded = new Set([
      // Energy-restore/heal-only passives with no sheet bucket (2026-09-17).
      'cadenza', 'discord', 'marcato', 'overture', 'variation',
      'broadblade-of-voyager', 'gauntlets-of-voyager', 'pistols-of-voyager',
      'rectifier-of-voyager', 'sword-of-voyager',
      'originite-type-i', 'originite-type-ii', 'originite-type-iii',
      'originite-type-iv', 'originite-type-v',
      'beguiling-melody',
    ]);
    const covered = new Set(
      BUFF_PRESETS.filter((p) => p.source === 'Weapon').map((p) => p.sourceRef),
    );
    const unaccounted = snapshot.weapons
      .map((w) => w.id)
      .filter((id) => !covered.has(id) && !excluded.has(id));
    expect(unaccounted).toEqual([]);
    // The exclusion list itself stays honest: every name must be a real weapon.
    for (const id of excluded) {
      expect(snapshot.weapons.some((w) => w.id === id)).toBe(true);
    }
    // Pin the list size: adding or removing an exclusion is a conscious
    // audit decision (texts read 2026-09-17), not silent drift.
    expect(excluded.size).toBe(16);
  });

  it('keeps every rank series at exactly 5 entries (solar-flame guard)', () => {
    const bad: string[] = [];
    for (const p of BUFF_PRESETS) {
      for (const mod of p.mods) {
        if (mod.valuesByRank !== undefined && mod.valuesByRank.length !== 5) {
          bad.push(`${p.id}:${mod.stat}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('reconciles gated DEF-ignore riders (small in, large out)', () => {
    // Azure Oath R1/R5: Heavy-gated DEF ignore scored sheet-wide.
    const azureDef = (rank: number): number =>
      resolvePresetMods(preset('weapon-azure-oath'), { weaponRank: rank }).find(
        (m) => m.stat === 'defIgnore',
      )!.value;
    expect(azureDef(1)).toBeCloseTo(0.12, 10);
    expect(azureDef(5)).toBeCloseTo(0.24, 10);
    // Frostburn R5: Liberation-gated DEF ignore plus the Chafe amp.
    const frost = resolvePresetMods(preset('weapon-frostburn'), {});
    expect(frost.find((m) => m.stat === 'defIgnore')!.value).toBeCloseTo(0.2, 10);
    expect(frost.find((m) => m.stat === 'negativeStatusAmplify')!.value).toBeCloseTo(0.4, 10);
  });

  it('auto-applies the 1pc threshold like any other met threshold', () => {
    expect(isAutoApplied(preset('sonata-shadow-of-shattered-dreams-1pc'))).toBe(true);
    expect(isAutoApplied(preset('sonata-midnight-veil-5pc'))).toBe(false);
    expect(isAutoApplied(preset('sonata-pact-of-neonlight-leap-5pc'))).toBe(false);
  });

  it('carries quoted windows only on the audited manual presets (Phase 5 audit)', () => {
    // Unambiguous subset: manual (picker-added) presets whose assumption
    // quotes one concrete duration covering every transcribed mod. Starts
    // default to t=0 at add time (rotation-opening swap, user-editable).
    const expected: [string, number][] = [
      ['echo-denia-outro', 15],
      ['echo-glommoth-outro', 15],
      ['echo-hyvatia-outro', 15],
      ['echo-voidwing-moth-outro', 15],
      ['sonata-midnight-veil-5pc', 15],
      ['sonata-moonlit-clouds-5pc', 15],
      ['sonata-pact-of-neonlight-leap-5pc', 15],
      ['weapon-emerald-sentence-team', 30],
      ['weapon-forged-dwarf-star-team', 15],
      ['weapon-freeze-frame-team', 30],
      ['weapon-kumokiri-team', 15],
      ['weapon-luminous-hymn-team', 30],
      ['weapon-skull-thrasher-team', 30],
      ['weapon-starfield-calibrator-team', 4],
      ['weapon-static-mist-outro', 14],
      ['weapon-stellar-symphony-team', 30],
      ['weapon-unspoken-rue-team', 30],
      ['weapon-wildfire-mark-team', 30],
    ];
    const actual: [string, number][] = [];
    for (const p of BUFF_PRESETS) {
      if (p.windowSeconds === undefined) continue;
      // Windows only take effect through the manual picker — an
      // auto-applied preset carrying one would be dead data.
      expect(isAutoApplied(p), `${p.id} carries a dead window`).toBe(false);
      actual.push([p.id, p.windowSeconds]);
    }
    actual.sort(([a], [b]) => (a < b ? -1 : 1));
    expect(actual).toEqual(expected);
  });
});

describe('2026-10-03 sync arrivals', () => {
  it('transcribes Unspoken Rue wielder + team branches', () => {
    expect(resolvePresetMods(preset('weapon-unspoken-rue'), {})).toEqual([
      { stat: 'atkPct', value: 0.24 },
      { stat: 'dmgBonus:Electro', value: 0.6 },
    ]);
    const team = preset('weapon-unspoken-rue-team');
    expect(team.windowSeconds).toBe(30);
    expect(resolvePresetMods(team, {})).toEqual([{ stat: 'dmgBonus:Electro', value: 0.48 }]);
    // Rank 1 resolves the first series entry, not the R5 default.
    expect(resolvePresetMods(team, { weaponRank: 1 })).toEqual([
      { stat: 'dmgBonus:Electro', value: 0.24 },
    ]);
  });

  it('transcribes Blooming Jadehaven with the RES gate scored sheet-wide', () => {
    expect(resolvePresetMods(preset('weapon-blooming-jadehaven'), {})).toEqual([
      { stat: 'dmgBonus:Havoc', value: 0.24 },
      { stat: 'dmgBonus:skill', value: 0.72 },
      { stat: 'resistancePenetration', value: -0.24 },
      { stat: 'negativeStatusAmplify', value: 0.6 },
    ]);
  });
});
