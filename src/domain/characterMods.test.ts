import { describe, expect, it } from 'vitest';
import { CHAIN_PRESETS } from '../data/chainPresets.ts';
import { loadBundledSnapshot } from '../data/index.ts';
import {
  chainMotionEntryMatches,
  characterCoordinatedMotions,
  characterResonanceModes,
  characterSkillMods,
  characterStatusBlocks,
  characterTuneRuptureResponses,
  characterUsesHavocBane,
  characterUsesTuneStrain,
  isBuffOnlySkill,
  isCoordinatedMotion,
  isParameterMotionRow,
  tuneResponseStackRate,
} from './characterMods.ts';
import { computeDamage, standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const zani = snapshot.characters.find((c) => c.id === 'zani')!;
const liberation = zani.skills.find((s) => s.kind === 'liberation')!;

describe('characterSkillMods', () => {
  it('routes Zani motions with Blaze inputs', () => {
    const mods = characterSkillMods('zani', 3, liberation, 'The Last Stand DMG', 'liberation', 10, { blazesConsumed: 50 });
    expect(mods).toEqual({ motionMultiplier: 5, dmgBonusExtra: 0, amplifyExtra: 0, critRateExtra: 0, critDmgExtra: 0, defIgnoreExtra: 0 });
  });

  it('returns neutral mods for unknown characters and undefined', () => {
    expect(characterSkillMods('jiyan', 6, liberation, 'The Last Stand DMG', 'liberation', 10, { blazesConsumed: 50 }))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0, amplifyExtra: 0, critRateExtra: 0, critDmgExtra: 0, defIgnoreExtra: 0 });
    expect(characterSkillMods(undefined, 6, liberation, 'The Last Stand DMG', 'liberation', 10))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0, amplifyExtra: 0, critRateExtra: 0, critDmgExtra: 0, defIgnoreExtra: 0 });
  });
});

describe('chain motion entries', () => {
  const yangyang = snapshot.characters.find((c) => c.id === 'yangyang')!;
  const chixia = snapshot.characters.find((c) => c.id === 'chixia')!;
  const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;

  it('matches every catalog motion entry to at least one real motion (dead-pattern guard)', () => {
    for (const entry of CHAIN_PRESETS) {
      if (entry.scope !== 'motion') continue;
      const character = snapshot.characters.find((c) => c.id === entry.characterId)!;
      const matched = character.skills.some((s) =>
        s.motionValues.some((m) => chainMotionEntryMatches(entry, s.kind, m.name, m.dmgType)),
      );
      expect(matched, `${entry.characterId} S${entry.rank}: dead pattern`).toBe(true);
    }
  });

  it('gates Yangyang S4 to Feather Release with rank gating', () => {
    const forte = yangyang.skills.find((s) => s.kind === 'forte')!;
    const feather = characterSkillMods('yangyang', 4, forte, 'Feather Release Damage', 'basic', 10);
    expect(feather.motionMultiplier).toBeCloseTo(1.95, 10);
    // Sibling motion on the same skill stays neutral...
    expect(characterSkillMods('yangyang', 4, forte, 'Stormy Strike Damage', 'heavy', 10).motionMultiplier).toBe(1);
    // ...as does Feather Release below S4.
    expect(characterSkillMods('yangyang', 3, forte, 'Feather Release Damage', 'basic', 10).motionMultiplier).toBe(1);
  });

  it('resolves pilot motion multipliers end to end through computeDamage', () => {
    const run = (
      characterId: string,
      skillId: string,
      motionName: string,
      resonanceChain: number,
    ): number => {
      const character = snapshot.characters.find((c) => c.id === characterId)!;
      const skill = character.skills.find((s) => s.id === skillId)!;
      return computeDamage({
        sheet: emptySheet(),
        baseAtk: { character: 100, weapon: 0 },
        baseHp: { character: 10000 },
        baseDef: { character: 100 },
        attackerLevel: 90,
        skill,
        motionName,
        forteLevel: 10,
        enemy: standardMob(90),
        crit: 'nonCrit',
        characterId,
        resonanceChain,
      }).damage;
    };
    const yyLib = yangyang.skills.find((s) => s.kind === 'liberation')!;
    expect(run('yangyang', yyLib.id, 'Skill DMG', 5) / run('yangyang', yyLib.id, 'Skill DMG', 4)).toBeCloseTo(1.85, 10);
    const cxLib = chixia.skills.find((s) => s.kind === 'liberation')!;
    expect(run('chixia', cxLib.id, 'Skill DMG', 3) / run('chixia', cxLib.id, 'Skill DMG', 2)).toBeCloseTo(1.4, 10);
    const jyForte = jiyan.skills.find((s) => s.kind === 'forte')!;
    expect(
      run('jiyan', jyForte.id, 'Emerald Storm: Finale Damage', 6) /
        run('jiyan', jyForte.id, 'Emerald Storm: Finale Damage', 5),
    ).toBeCloseTo(3.4, 10);
  });

  it('guarantees Chixia S1 Boom Boom crits without touching sibling motions', () => {
    const forte = chixia.skills.find((s) => s.kind === 'forte')!;
    const boom = characterSkillMods('chixia', 1, forte, 'Boom Boom Damage', 'skill', 10);
    expect(boom.critRateExtra).toBe(1);
    expect(boom.motionMultiplier).toBe(1);
    const sibling = characterSkillMods('chixia', 1, forte, 'Thermobaric Bullets Damage', 'skill', 10);
    expect(sibling.critRateExtra).toBe(0);
    expect(characterSkillMods('chixia', 0, forte, 'Boom Boom Damage', 'skill', 10).critRateExtra).toBe(0);
  });

  it('resolves the S1 guaranteed crit end to end in expected mode', () => {
    const forte = chixia.skills.find((s) => s.kind === 'forte')!;
    const run = (motionName: string, resonanceChain: number): number =>
      computeDamage({
        sheet: (() => {
          const sheet = emptySheet();
          sheet.critRate = 0.05;
          sheet.critDmg = 1.5;
          return sheet;
        })(),
        baseAtk: { character: 100, weapon: 0 },
        baseHp: { character: 10000 },
        baseDef: { character: 100 },
        attackerLevel: 90,
        skill: forte,
        motionName,
        forteLevel: 10,
        enemy: standardMob(90),
        crit: 'expected',
        characterId: 'chixia',
        resonanceChain,
      }).damage;
    // S0: 0.05 × 1.5 + 0.95 × 1 = 1.025. S1: rate clamps to 1 → 1.5.
    expect(run('Boom Boom Damage', 1) / run('Boom Boom Damage', 0)).toBeCloseTo(1.5 / 1.025, 10);
    expect(run('Thermobaric Bullets Damage', 1) / run('Thermobaric Bullets Damage', 0)).toBeCloseTo(1, 10);
  });

  it('resolves Wave-2 global, bucket-scoped, and stacked multipliers end to end', () => {
    const run = (
      characterId: string,
      skillKind: string,
      motionName: string,
      resonanceChain: number,
    ): number => {
      const character = snapshot.characters.find((c) => c.id === characterId)!;
      const skill = character.skills.find((s) => s.kind === skillKind)!;
      return computeDamage({
        sheet: emptySheet(),
        baseAtk: { character: 100, weapon: 0 },
        baseHp: { character: 10000 },
        baseDef: { character: 100 },
        attackerLevel: 90,
        skill,
        motionName,
        forteLevel: 10,
        enemy: standardMob(90),
        crit: 'nonCrit',
        characterId,
        resonanceChain,
      }).damage;
    };
    // Sanhua S3 is unscoped: every motion gains ×1.35 (HP gate assumed met).
    expect(run('sanhua', 'basic', 'Stage 1 DMG', 3) / run('sanhua', 'basic', 'Stage 1 DMG', 2)).toBeCloseTo(1.35, 10);
    expect(run('sanhua', 'liberation', 'Skill DMG', 3) / run('sanhua', 'liberation', 'Skill DMG', 2)).toBeCloseTo(1.35, 10);
    // Jingran S2 stacks two same-rank entries multiplicatively on Soul Raid.
    expect(
      run('jingran', 'forte', 'Heavy Attack - Soul Raid DMG', 2) /
        run('jingran', 'forte', 'Heavy Attack - Soul Raid DMG', 1),
    ).toBeCloseTo(1.46 * 2.8, 10);
    // Jingran S6 heavy-taken hits heavy motions only; Chimei gets both parts.
    expect(
      run('jingran', 'forte', 'Heavy Attack - Soul Raid DMG', 6) /
        run('jingran', 'forte', 'Heavy Attack - Soul Raid DMG', 5),
    ).toBeCloseTo(1.4, 10);
    expect(
      run('jingran', 'basic', 'Basic Attack - Drink Soul Stage 1 DMG', 6) /
        run('jingran', 'basic', 'Basic Attack - Drink Soul Stage 1 DMG', 5),
    ).toBeCloseTo(1, 10);
    expect(
      run('jingran', 'liberation', 'Chimei Wangliang DMG', 6) /
        run('jingran', 'liberation', 'Chimei Wangliang DMG', 5),
    ).toBeCloseTo(1.4 * 1.8, 10);
    // Xiangli S5 names the liberation skill: cast hit and follow-ups double.
    expect(
      run('xiangli-yao', 'liberation', 'Cogitation Model DMG', 5) /
        run('xiangli-yao', 'liberation', 'Cogitation Model DMG', 4),
    ).toBeCloseTo(2, 10);
    expect(
      run('xiangli-yao', 'liberation', 'Pivot - Impale Stage 1 DMG', 5) /
        run('xiangli-yao', 'liberation', 'Pivot - Impale Stage 1 DMG', 4),
    ).toBeCloseTo(2, 10);
    // Lucilla S6 consumes 3 Remembrance stacks (+200% each) on cast.
    expect(
      run('lucilla', 'liberation', 'Letting It Go DMG', 6) /
        run('lucilla', 'liberation', 'Letting It Go DMG', 5),
    ).toBeCloseTo(7, 10);
  });

  it('resolves Lucy S3 motion-plus-crit combo in expected mode', () => {
    const lucy = snapshot.characters.find((c) => c.id === 'lucy')!;
    const liberation = lucy.skills.find((s) => s.kind === 'liberation')!;
    const run = (resonanceChain: number): number => {
      const sheet = emptySheet();
      sheet.critRate = 1;
      sheet.critDmg = 1.5;
      return computeDamage({
        sheet,
        baseAtk: { character: 100, weapon: 0 },
        baseHp: { character: 10000 },
        baseDef: { character: 100 },
        attackerLevel: 90,
        skill: liberation,
        motionName: 'Resonance Liberation - Netrunner: Override DMG',
        forteLevel: 10,
        enemy: standardMob(90),
        crit: 'expected',
        characterId: 'lucy',
        resonanceChain,
      }).damage;
    };
    // Guaranteed crit: ×1.5 motion times (1.5 + 1.0) / 1.5 crit factor = ×2.5.
    expect(run(3) / run(2)).toBeCloseTo(2.5, 10);
  });

  it('resolves Taoqi S2 skill-crit extras without touching other skills', () => {
    const taoqi = snapshot.characters.find((c) => c.id === 'taoqi')!;
    const liberation = taoqi.skills.find((s) => s.kind === 'liberation')!;
    const forte = taoqi.skills.find((s) => s.kind === 'forte')!;
    const mods = characterSkillMods('taoqi', 2, liberation, 'Skill DMG', 'liberation', 10);
    expect(mods.critRateExtra).toBeCloseTo(0.2, 10);
    expect(mods.critDmgExtra).toBeCloseTo(0.2, 10);
    expect(mods.defIgnoreExtra).toBe(0);
    const sibling = characterSkillMods('taoqi', 2, forte, 'Timed Counters Stage 1 DMG', 'basic', 10);
    expect(sibling.critRateExtra).toBe(0);
    expect(sibling.critDmgExtra).toBe(0);
  });

  it('resolves motion-scoped DEF ignore end to end (Lumi S2, hand-computed)', () => {
    const lumi = snapshot.characters.find((c) => c.id === 'lumi')!;
    const forte = lumi.skills.find((s) => s.kind === 'forte')!;
    const run = (motionName: string, resonanceChain: number): number =>
      computeDamage({
        sheet: emptySheet(),
        baseAtk: { character: 100, weapon: 0 },
        baseHp: { character: 10000 },
        baseDef: { character: 100 },
        attackerLevel: 90,
        skill: forte,
        motionName,
        forteLevel: 10,
        enemy: standardMob(90),
        crit: 'nonCrit',
        characterId: 'lumi',
        resonanceChain,
      }).damage;
    // Level-90 curve: numerator 1520, enemy DEF 1512. Ignore 0:
    // 1520/3032; ignore 0.2: 1520/(1520 + 1512×0.8) = 1520/2729.6.
    // Everything else cancels, so the damage ratio is 3032/2729.6.
    expect(run('Energized Pounce DMG', 2) / run('Energized Pounce DMG', 1)).toBeCloseTo(
      3032 / 2729.6,
      10,
    );
    expect(run('Glare DMG', 2) / run('Glare DMG', 1)).toBeCloseTo(1, 10);
  });
});

describe('characterStatusBlocks', () => {
  it('offers detonation blocks only where the pipeline is computable', () => {
    expect(characterStatusBlocks('cartethyia')).toEqual(['aeroErosion']);
    expect(characterStatusBlocks('ciaccona')).toEqual(['aeroErosion']);
    expect(characterStatusBlocks('rover-aero')).toEqual(['aeroErosion']);
    expect(characterStatusBlocks('zani')).toEqual(['spectroFrazzle']);
    expect(characterStatusBlocks('phoebe')).toEqual(['spectroFrazzle']);
    expect(characterStatusBlocks('rover-spectro')).toEqual(['spectroFrazzle']);
    expect(characterStatusBlocks('jiyan')).toEqual([]);
    expect(characterStatusBlocks('yangyang-xuanling')).toEqual([]);
    expect(characterStatusBlocks('aemeath')).toEqual([]);
    // Electro/Glacio detonations have no published tables (G1) — no blocks.
    expect(characterStatusBlocks('buling')).toEqual([]);
    expect(characterStatusBlocks('rover-electro')).toEqual([]);
    expect(characterStatusBlocks('hiyuki')).toEqual([]);
    expect(characterStatusBlocks('suisui')).toEqual([]);
  });
});

describe('characterResonanceModes', () => {
  it('lists dual-mode kits and nothing else', () => {
    expect(characterResonanceModes('aemeath')).toEqual(['tuneRupture', 'fusionBurst']);
    expect(characterResonanceModes('denia')).toEqual(['fusionBurst', 'tuneStrain']);
    expect(characterResonanceModes('lynae')).toEqual(['tuneRupture', 'tuneStrain']);
    expect(characterResonanceModes('jiyan')).toEqual([]);
    expect(characterResonanceModes('cartethyia')).toEqual([]);
    // Lucilla's second mode is unverified (G6) — registry stays silent.
    expect(characterResonanceModes('lucilla')).toEqual([]);
  });
});

describe('tune registries', () => {
  it('exposes verified rupture rates and responses only', () => {
    expect(tuneResponseStackRate('aemeath')).toBeCloseTo(0.04, 10);
    expect(tuneResponseStackRate('mornye')).toBeNull();
    expect(tuneResponseStackRate(undefined)).toBeNull();
    expect(characterTuneRuptureResponses('aemeath')).toEqual(['Tune Rupture Response - Starburst DMG']);
    expect(characterTuneRuptureResponses('jiyan')).toEqual([]);
  });

  it('flags the Tune Strain responders', () => {
    for (const id of ['mornye', 'qingxiao', 'luuk-herssen', 'lynae', 'denia']) {
      expect(characterUsesTuneStrain(id)).toBe(true);
    }
    expect(characterUsesTuneStrain('zani')).toBe(false);
    expect(characterUsesTuneStrain('jiyan')).toBe(false);
  });
});

describe('characterUsesHavocBane', () => {
  it('flags the Bane dealers', () => {
    expect(characterUsesHavocBane('yangyang-xuanling')).toBe(true);
    expect(characterUsesHavocBane('chisa')).toBe(true);
    expect(characterUsesHavocBane('zani')).toBe(false);
    expect(characterUsesHavocBane('jiyan')).toBe(false);
  });
});

describe('coordinated-motion registry', () => {
  it('flags the prose-proven coordinated motions', () => {
    expect(characterCoordinatedMotions('yinlin')).toEqual(['Judgment Strike Damage']);
    expect(characterCoordinatedMotions('verina')).toEqual(['Coordinated Attack DMG']);
    expect(characterCoordinatedMotions('yuanwu')).toEqual(['Thunder Wedge Coordinated Attack DMG']);
    expect(characterCoordinatedMotions('mortefi')).toEqual(['Marcato Damage']);
    expect(characterCoordinatedMotions('zhezhi')).toEqual(['Inklit Spirit DMG']);
    expect(characterCoordinatedMotions('cantarella')).toEqual(['Diffusion DMG']);
    expect(characterCoordinatedMotions('baizhi')).toEqual(['Remnant Entities Damage']);
    expect(characterCoordinatedMotions('jiyan')).toEqual([]);
    expect(isCoordinatedMotion('yinlin', 'Judgment Strike Damage')).toBe(true);
    expect(isCoordinatedMotion('yinlin', 'Chameleon Cipher Damage')).toBe(false);
    expect(isCoordinatedMotion('mortefi', 'Violent Finale Damage')).toBe(false);
    expect(isCoordinatedMotion('cantarella', 'Phantom Sting Stage 3 DMG')).toBe(false);
    expect(isCoordinatedMotion(undefined, 'Judgment Strike Damage')).toBe(false);
  });

  it('resolves every registry entry against the snapshot', () => {
    const missing: string[] = [];
    for (const id of ['yinlin', 'verina', 'yuanwu', 'mortefi', 'zhezhi', 'cantarella', 'baizhi']) {
      const character = snapshot.characters.find((c) => c.id === id)!;
      const names = new Set(character.skills.flatMap((s) => s.motionValues.map((m) => m.name)));
      for (const motion of characterCoordinatedMotions(id)) {
        if (!names.has(motion)) missing.push(`${id}:${motion}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('treats Jiyan outro as damage, every other motion-less skill as buff-only', () => {
    const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
    const outro = jiyan.skills.find((s) => s.kind === 'outro')!;
    const basic = jiyan.skills.find((s) => s.kind === 'basic')!;
    expect(outro.motionValues).toHaveLength(0);
    expect(isBuffOnlySkill('jiyan', outro)).toBe(false);
    expect(isBuffOnlySkill('yinlin', outro)).toBe(true);
    expect(isBuffOnlySkill('jiyan', basic)).toBe(false);
    const yinlin = snapshot.characters.find((c) => c.id === 'yinlin')!;
    const yinlinOutro = yinlin.skills.find((s) => s.kind === 'outro')!;
    expect(isBuffOnlySkill('yinlin', yinlinOutro)).toBe(yinlinOutro.motionValues.length === 0);
  });
});

describe('wave 2 chain motion composition (Jingran/Phrolova/Augusta)', () => {
  const jingran = snapshot.characters.find((c) => c.id === 'jingran')!;
  const jSkill = jingran.skills.find((s) => s.kind === 'skill')!;
  const jForte = jingran.skills.find((s) => s.kind === 'forte')!;
  const jLib = jingran.skills.find((s) => s.kind === 'liberation')!;
  const phrolova = snapshot.characters.find((c) => c.id === 'phrolova')!;
  const pBasic = phrolova.skills.find((s) => s.kind === 'basic')!;
  const pForte = phrolova.skills.find((s) => s.kind === 'forte')!;
  const pLib = phrolova.skills.find((s) => s.kind === 'liberation')!;
  const augusta = snapshot.characters.find((c) => c.id === 'augusta')!;
  const aBasic = augusta.skills.find((s) => s.kind === 'basic')!;
  const aForte = augusta.skills.find((s) => s.kind === 'forte')!;
  const aLib = augusta.skills.find((s) => s.kind === 'liberation')!;

  it('stacks Jingran S1+S6 on heavy-typed skill motions only', () => {
    // S1: +80% on all four skill motions; S6: +40% taken on heavy-typed hits.
    expect(characterSkillMods('jingran', 1, jSkill, 'Encroaching Yin DMG', 'skill', 10).motionMultiplier).toBeCloseTo(1.8, 10);
    expect(characterSkillMods('jingran', 6, jSkill, 'Encroaching Yin DMG', 'skill', 10).motionMultiplier).toBeCloseTo(1.8, 10);
    expect(characterSkillMods('jingran', 6, jSkill, 'Netherworld Traverse DMG', 'heavy', 10).motionMultiplier).toBeCloseTo(
      1.8 * 1.4, 10,
    );
  });

  it('covers Jingran S2 base +46% and Fire-of-Life +46% with one factor each', () => {
    // 1.46 (S2 base) x 2.8 (Netherworld's Boon full uptime) = 4.088 on the
    // base motion AND the per-HP Fire-of-Life motion (substring match).
    for (const motion of [
      'Heavy Attack - Soul Raid DMG',
      'Heavy Attack - Soul Raid DMG Increase per 1,000 Max HP',
      'Heavy Attack - Stardome Meander DMG',
      'Heavy Attack - Stardome Meander DMG Increase per 1,000 Max HP',
    ]) {
      expect(characterSkillMods('jingran', 2, jForte, motion, 'heavy', 10).motionMultiplier).toBeCloseTo(4.088, 10);
      expect(characterSkillMods('jingran', 1, jForte, motion, 'heavy', 10).motionMultiplier).toBe(1);
    }
    expect(characterSkillMods('jingran', 6, jForte, 'Heavy Attack - Soul Raid DMG', 'heavy', 10).motionMultiplier).toBeCloseTo(
      4.088 * 1.4, 10,
    );
  });

  it('stacks Jingran S6 Chimei +80% with the heavy taken amp', () => {
    // Chimei: 1.8 x 1.4 = 2.52; the Liberation cast hit takes only the 1.4.
    expect(characterSkillMods('jingran', 6, jLib, 'Chimei Wangliang DMG', 'heavy', 10).motionMultiplier).toBeCloseTo(2.52, 10);
    expect(characterSkillMods('jingran', 5, jLib, 'Chimei Wangliang DMG', 'heavy', 10).motionMultiplier).toBe(1);
    expect(characterSkillMods('jingran', 6, jLib, 'Burial of Thousand Souls DMG', 'heavy', 10).motionMultiplier).toBeCloseTo(
      1.4, 10,
    );
  });

  it('pins Phrolova S2 additive stacking on Scarlet Coda only', () => {
    // 1 + 0.75 (base) + 0.75 (Aftersound flat) = 2.5; the per-stack motion
    // keeps its base rate (S2 grants stacks, it does not raise the rate).
    expect(characterSkillMods('phrolova', 2, pBasic, 'Scarlet Coda DMG', 'skill', 10).motionMultiplier).toBeCloseTo(2.5, 10);
    expect(characterSkillMods('phrolova', 1, pBasic, 'Scarlet Coda DMG', 'skill', 10).motionMultiplier).toBe(1);
    expect(
      characterSkillMods('phrolova', 2, pBasic, 'DMG Multiplier Increase per Aftersound', 'skill', 10).motionMultiplier,
    ).toBe(1);
  });

  it('gates Phrolova S1/S6 motion entries to their named motions', () => {
    expect(characterSkillMods('phrolova', 1, pForte, 'Movement of Fate and Finality DMG', 'skill', 10).motionMultiplier).toBeCloseTo(
      1.8, 10,
    );
    expect(characterSkillMods('phrolova', 1, pForte, 'Murmurs in a Haunting Dream DMG', 'skill', 10).motionMultiplier).toBeCloseTo(
      1.8, 10,
    );
    expect(
      characterSkillMods('phrolova', 6, pLib, 'Enhanced Attack - Hecate: Strings DMG', 'echo', 10).motionMultiplier,
    ).toBeCloseTo(1.24, 10);
    expect(characterSkillMods('phrolova', 6, pLib, 'Curtain Call DMG', 'liberation', 10).motionMultiplier).toBe(1);
  });

  it('covers every Augusta S3 motion including the dodge-counter backstep', () => {
    for (const [skill, motion, dmgType] of [
      [aBasic, 'Heavy Attack - Thunderoar: Backstep DMG', 'heavy'],
      [aBasic, 'Dodge Counter - Thunderoar: Backstep DMG', 'heavy'],
      [aBasic, 'Heavy Attack - Thunderoar: Spinslash DMG', 'heavy'],
      [aBasic, 'Heavy Attack - Thunderoar: Uppercut DMG', 'heavy'],
      [aForte, 'Resonance Skill - Undying Sunlight: Plunge DMG', 'heavy'],
      [aLib, 'Sublime is the Sun - Sunborne DMG', 'heavy'],
      [aLib, 'Sublime is the Sun - Everbright Protector DMG', 'heavy'],
    ] as const) {
      expect(characterSkillMods('augusta', 3, skill, motion, dmgType, 10).motionMultiplier).toBeCloseTo(1.25, 10);
    }
    // Siblings outside the S3 list stay neutral.
    expect(characterSkillMods('augusta', 3, aBasic, 'Heavy Attack: Steelclash DMG', 'heavy', 10).motionMultiplier).toBe(1);
    expect(
      characterSkillMods('augusta', 3, aLib, 'Resonance Liberation - Sword of Eternal Oath DMG', 'heavy', 10).motionMultiplier,
    ).toBe(1);
  });
});
describe('isParameterMotionRow', () => {
  it('flags Chisa per-Ring parameter row, nothing else', () => {
    expect(isParameterMotionRow('chisa', 'Bonus DMG Multiplier per Ring of Chainsaw')).toBe(true);
    expect(isParameterMotionRow('chisa', 'Sawring - Eradication DMG')).toBe(false);
    expect(isParameterMotionRow('jiyan', 'Bonus DMG Multiplier per Ring of Chainsaw')).toBe(false);
    expect(isParameterMotionRow('jiyan', 'Stage 1 DMG')).toBe(false);
  });
});

