import { describe, expect, it } from 'vitest';
import { CHAIN_COVERAGE, CHAIN_PRESETS } from './chainPresets.ts';
import { loadBundledSnapshot } from './index.ts';
import { skillKindSchema, statKeySchema } from './schema.ts';

const snapshot = loadBundledSnapshot();

describe('chain presets', () => {
  it('resolves every entry to a snapshot character and rank', () => {
    expect(CHAIN_PRESETS.length).toBeGreaterThan(0);
    for (const entry of CHAIN_PRESETS) {
      const character = snapshot.characters.find((c) => c.id === entry.characterId);
      expect(character, `${entry.characterId} S${entry.rank}: unknown character`).toBeDefined();
      expect(character?.resonanceChain.some((r) => r.rank === entry.rank)).toBe(true);
    }
  });

  it('accounts every rank 1-6 of every covered character', () => {
    for (const id of CHAIN_COVERAGE) {
      expect(snapshot.characters.some((c) => c.id === id), `coverage lists unknown ${id}`).toBe(true);
    }
    expect(new Set(CHAIN_COVERAGE).size).toBe(CHAIN_COVERAGE.length);
    for (const id of CHAIN_COVERAGE) {
      for (let rank = 1; rank <= 6; rank += 1) {
        const entries = CHAIN_PRESETS.filter((e) => e.characterId === id && e.rank === rank);
        expect(entries.length, `${id} S${rank} unaccounted`).toBeGreaterThan(0);
      }
    }
  });

  it('gives motion entries at least one mechanic and sane bounds', () => {
    for (const entry of CHAIN_PRESETS) {
      if (entry.scope !== 'motion') continue;
      const mechanics = [entry.motionMultiplier, entry.critRateExtra, entry.critDmgExtra, entry.defIgnoreExtra].filter(
        (v) => v !== undefined,
      );
      expect(mechanics.length, `${entry.characterId} S${entry.rank}: motion entry without mechanics`).toBeGreaterThan(0);
      if (entry.motionMultiplier !== undefined) expect(entry.motionMultiplier).toBeGreaterThan(1);
      if (entry.critRateExtra !== undefined) {
        // Rates clamp at the seam — storing more than 1 is pointless.
        expect(entry.critRateExtra).toBeGreaterThanOrEqual(0);
        expect(entry.critRateExtra).toBeLessThanOrEqual(1);
      }
      if (entry.critDmgExtra !== undefined) {
        // Damage ratios have no ceiling (base crit DMG is already 1.5).
        expect(entry.critDmgExtra).toBeGreaterThan(0);
      }
      if (entry.defIgnoreExtra !== undefined) {
        expect(entry.defIgnoreExtra).toBeGreaterThan(0);
        expect(entry.defIgnoreExtra).toBeLessThanOrEqual(1);
      }
      if (entry.skillKind !== undefined) {
        expect(skillKindSchema.safeParse(entry.skillKind).success).toBe(true);
      }
      if (entry.motionNameIncludes !== undefined) {
        expect(entry.motionNameIncludes.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps sheet/team mods on valid stat keys with finite values', () => {
    for (const entry of CHAIN_PRESETS) {
      if (entry.scope !== 'sheet' && entry.scope !== 'team') continue;
      expect(entry.mods.length).toBeGreaterThan(0);
      for (const mod of entry.mods) {
        expect(statKeySchema.safeParse(mod.stat).success).toBe(true);
        expect(Number.isFinite(mod.value)).toBe(true);
      }
    }
  });

  it('pairs every team entry with an equal wielder sheet entry (wearer-total)', () => {
    for (const entry of CHAIN_PRESETS) {
      if (entry.scope !== 'team') continue;
      expect(entry.label.trim().length).toBeGreaterThan(0);
      // A rank may carry several sheet entries (Rebecca S2) — one must
      // match the team part's mods exactly.
      const sibling = CHAIN_PRESETS.find(
        (e) =>
          e.scope === 'sheet' &&
          e.characterId === entry.characterId &&
          e.rank === entry.rank &&
          JSON.stringify(e.mods) === JSON.stringify(entry.mods),
      );
      expect(sibling, `${entry.characterId} S${entry.rank}: team entry without equal wielder sheet part`).toBeDefined();
    }
  });

  it('transcribes Cartethyia S4 as a 20% all-attribute sheet/team pair', () => {
    // Snapshot S4 text ("Sacrifice Made for Salvation") + verbatim match on
    // https://wuthering.gg/characters/cartethyia: after any team Resonator
    // inflicts a Negative Status, all Resonators gain 20% DMG Bonus for all
    // Attributes for 20s. The wielder part auto-applies via computeStats
    // (full uptime); the team part resolves via resolveTeamBuffs.
    const entries = CHAIN_PRESETS.filter((e) => e.characterId === 'cartethyia' && e.rank === 4);
    expect(entries).toHaveLength(2);
    const sheet = entries.find((e) => e.scope === 'sheet');
    const team = entries.find((e) => e.scope === 'team');
    expect(sheet).toBeDefined();
    expect(team).toBeDefined();
    const expected = [
      { stat: 'dmgBonus:Glacio', value: 0.2 },
      { stat: 'dmgBonus:Fusion', value: 0.2 },
      { stat: 'dmgBonus:Electro', value: 0.2 },
      { stat: 'dmgBonus:Aero', value: 0.2 },
      { stat: 'dmgBonus:Spectro', value: 0.2 },
      { stat: 'dmgBonus:Havoc', value: 0.2 },
    ];
    expect(sheet).toMatchObject({ mods: expected });
    expect(team).toMatchObject({
      label: 'Cartethyia S4 (team all-attribute DMG)',
      windowSeconds: 20,
      mods: expected,
    });
  });

  it('transcribes Wave 5 Hsin/Suoming ranks (Unison branches rank-split by Boon cap)', () => {
    const hsin = CHAIN_PRESETS.filter((e) => e.characterId === 'hsin');
    // S1 Manifold (1.45 at 3 Boon) + S2 realm/horizons + S3 Pillars MV/crit +
    // S4 sheet/team + S5 note + S6 Manifold rider/Pillars rider/DEFig.
    expect(hsin.filter((e) => e.scope === 'motion')).toHaveLength(8);
    expect(hsin.filter((e) => e.scope === 'sheet')).toHaveLength(1);
    expect(hsin.filter((e) => e.scope === 'team')).toHaveLength(1);
    expect(hsin.filter((e) => e.scope === 'note')).toHaveLength(1);
    const hsinAt = (rank: number): typeof hsin => hsin.filter((e) => e.rank === rank);
    expect(hsinAt(1)).toHaveLength(1);
    // S6 Manifold rider completes the S1 additive stack: 1.45 x (1.55/1.45) = 1.55.
    const s6Manifold = hsinAt(6).find((e) => e.scope === 'motion' && e.motionNameIncludes === 'manifold unison');
    expect(s6Manifold?.scope === 'motion' ? s6Manifold.motionMultiplier : 0).toBeCloseTo(1.55 / 1.45, 12);
    // S6 DEF ignore is bucket-wide (skill dmgType, no name/kind filter).
    const s6Def = hsinAt(6).find((e) => e.scope === 'motion' && e.defIgnoreExtra === 0.2);
    expect(s6Def?.scope).toBe('motion');
    if (s6Def?.scope === 'motion') {
      expect(s6Def.motionNameIncludes).toBeUndefined();
      expect(s6Def.skillKind).toBeUndefined();
      expect(s6Def.dmgType).toBe('skill');
    }
    const suoming = CHAIN_PRESETS.filter((e) => e.characterId === 'suoming');
    expect(suoming.filter((e) => e.scope === 'motion')).toHaveLength(3);
    expect(suoming.filter((e) => e.scope === 'sheet')).toHaveLength(3);
    expect(suoming.filter((e) => e.scope === 'note')).toHaveLength(0);
    const s1 = suoming.find((e) => e.rank === 1);
    expect(s1?.scope === 'motion' ? s1.motionMultiplier : 0).toBe(1.6);
    const s2 = suoming.find((e) => e.rank === 2);
    expect(s2?.scope === 'sheet' ? s2.mods : []).toEqual([{ stat: 'critDmg', value: 0.4 }]);
    // The incoming-Resonator part documents WHY no team entry exists.
    expect(s2?.scope === 'sheet' ? (s2.assumption ?? '') : '').toContain('equal wielder twin');
  });

  it('transcribes Wave 3 Roccia/Qingxiao/Lynae conversions (snapshot + live prose)', () => {
    // Roccia S4/S6: "Basic Attack Real Fantasy" is the forte skill's whole
    // Stage 1–3 cycle (snapshot 1002707), so skillKind:'forte' with no name
    // filter matches exactly it — verified against
    // https://wuthering.gg/characters/roccia (S4 +60%/12s, S6 60% DEF
    // ignore/12s + Reality Recreation extra form).
    const rocciaS4 = CHAIN_PRESETS.filter((e) => e.characterId === 'roccia' && e.rank === 4);
    expect(rocciaS4).toHaveLength(1);
    expect(rocciaS4[0]).toMatchObject({ scope: 'motion', skillKind: 'forte', motionMultiplier: 1.6 });
    const rocciaS6 = CHAIN_PRESETS.filter((e) => e.characterId === 'roccia' && e.rank === 6);
    expect(rocciaS6).toHaveLength(1);
    expect(rocciaS6[0]).toMatchObject({ scope: 'motion', skillKind: 'forte', defIgnoreExtra: 0.6 });
    // Qingxiao S1 carries a flat +16% Crit Rate beside the Juque extra-hit
    // riders; S3 carries +100% Liberation Crit DMG beside the World in
    // Chorus stack scaling — both verified against
    // https://www.lootbar.com/blog/en/wuthering-waves-qingxiao-build-guide-lb.html
    const qingxiaoS1 = CHAIN_PRESETS.filter((e) => e.characterId === 'qingxiao' && e.rank === 1);
    expect(qingxiaoS1).toHaveLength(1);
    expect(qingxiaoS1[0]).toMatchObject({ scope: 'sheet', mods: [{ stat: 'critRate', value: 0.16 }] });
    const qingxiaoS3 = CHAIN_PRESETS.filter((e) => e.characterId === 'qingxiao' && e.rank === 3);
    expect(qingxiaoS3).toHaveLength(1);
    expect(qingxiaoS3[0]).toMatchObject({ scope: 'motion', skillKind: 'liberation', critDmgExtra: 1 });
    // Lynae S2's Outro rider is a rank-gated team amp (wielder sheet part
    // already exists); S5 names Prismatic Overblast, not the To a Vivid
    // Tomorrow follow-up — both verified against
    // https://game8.co/games/Wuthering-Waves/archives/568211
    const lynaeS2Team = CHAIN_PRESETS.find(
      (e) => e.characterId === 'lynae' && e.rank === 2 && e.scope === 'team',
    );
    expect(lynaeS2Team).toMatchObject({
      label: 'Lynae S2 (team all-DMG amp)',
      windowSeconds: 14,
      mods: [{ stat: 'amplify', value: 0.25 }],
    });
    const lynaeS5 = CHAIN_PRESETS.filter((e) => e.characterId === 'lynae' && e.rank === 5);
    expect(lynaeS5).toHaveLength(1);
    expect(lynaeS5[0]).toMatchObject({
      scope: 'motion',
      skillKind: 'liberation',
      motionNameIncludes: 'prismatic overblast',
      motionMultiplier: 1.7,
    });
  });

  it('keeps note reasons non-empty with cited modules', () => {
    for (const entry of CHAIN_PRESETS) {
      if (entry.scope !== 'note') continue;
      expect(entry.reason.trim().length).toBeGreaterThan(0);
      if (entry.appliedElsewhere !== undefined) {
        expect(entry.appliedElsewhere.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('carries quoted windows only on the audited team entries (Phase 5 audit)', () => {
    // Unambiguous subset: team-scope entries whose assumption quotes one
    // concrete duration. Six team entries stay untimed (Shorekeeper S2,
    // Ciaccona S2, Iuno S2, Buling S6, Qiuyuan S2, Mornye S2 quote no
    // length). Luuk S4 carries its 20s: the chain prose applies the
    // window to all Resonators in the team, not the wielder alone.
    const expected: [string, number][] = [
      ['augusta@4', 30],
      ['baizhi@6', 20],
      ['calcharo@4', 30],
      ['camellya@4', 30],
      ['carlotta@4', 30],
      ['cartethyia@4', 20],
      ['changli@4', 30],
      ['chixia@6', 15],
      ['danjin@6', 20],
      ['encore@4', 30],
      ['hiyuki@4', 30],
      ['hsin@4', 30],
      ['jiyan@4', 30],
      ['lingyang@4', 30],
      ['lumi@6', 20],
      ['lupa@2', 30],
      ['luuk-herssen@4', 20],
      ['lynae@2', 14],
      ['mortefi@6', 20],
      ['phoebe@2', 30],
      ['qingxiao@4', 8],
      ['rebecca@2', 30],
      ['roccia@2', 30],
      ['sanhua@6', 20],
      ['sigrika@4', 20],
      ['suisui@2', 30],
      ['verina@4', 24],
      ['xiangli-yao@4', 30],
      ['yangyang-xuanling@4', 20],
      ['yangyang@6', 20],
      ['yinlin@4', 12],
      ['yuanwu@6', 3],
      ['zani@4', 30],
      ['zhezhi@4', 30],
    ];
    const actual: [string, number][] = [];
    for (const entry of CHAIN_PRESETS) {
      if (entry.scope !== 'team' || entry.windowSeconds === undefined) continue;
      actual.push([`${entry.characterId}@${entry.rank}`, entry.windowSeconds]);
    }
    actual.sort(([a], [b]) => (a < b ? -1 : 1));
    expect(actual).toEqual(expected);
  });
});
