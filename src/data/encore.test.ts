import { describe, expect, it } from 'vitest';
import {
  applyMotionTypeOverride,
  bonusKindFromDamageType,
  echoCostFromIntensity,
  echoCostFromRarity,
  echoSkipReasonForName,
  isHealingAttribute,
  isScalingAttribute,
  parseAttribute,
  parseMotionText,
  parsePercentText,
  partitionUsableMotions,
  percentTermsOf,
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
} from './encore.ts';

describe('parsePercentText', () => {
  it('parses plain percents to ratios', () => {
    expect(parsePercentText('19.04%')).toBeCloseTo(0.1904, 10);
    expect(parsePercentText('100.00%')).toBe(1);
    expect(parsePercentText(' 12.8% ')).toBeCloseTo(0.128, 10);
  });

  it('rejects placeholders and bare numbers', () => {
    expect(() => parsePercentText('{0}')).toThrow();
    expect(() => parsePercentText('25')).toThrow();
    expect(() => parsePercentText('')).toThrow();
  });
});

describe('parseMotionText', () => {
  it('parses single-hit ratios', () => {
    expect(parseMotionText('36.80%')).toEqual({ ratio: 0.368, flat: 0, hits: 1 });
  });

  it('parses multi-hit and compound expressions', () => {
    expect(parseMotionText('53.50%*4')).toEqual({ ratio: 2.14, flat: 0, hits: 4 });
    expect(parseMotionText('71.88%*2+215.64%')).toEqual({ ratio: 3.594, flat: 0, hits: 3 });
    expect(parseMotionText('100*3')).toEqual({ ratio: 0, flat: 300, hits: 3 });
  });

  it('parses healer flat+ratio formulas', () => {
    expect(parseMotionText('500+11.33%')).toEqual({ ratio: 0.1133, flat: 500, hits: 1 });
  });

  it('treats bare numbers as flat, rejects garbage', () => {
    // Bare numbers only occur in filtered-out metadata attributes; parsing
    // them as flat keeps the parser total without affecting output.
    expect(parseMotionText('25')).toEqual({ ratio: 0, flat: 25, hits: 1 });
    expect(() => parseMotionText('')).toThrow();
    expect(() => parseMotionText('12.87%x2')).toThrow();
  });
});

describe('isScalingAttribute', () => {
  it('keeps damage/healing, drops rotation metadata', () => {
    expect(isScalingAttribute('Stage 1 DMG', ['36.80%'])).toBe(true);
    expect(isScalingAttribute('Emerald Storm: Finale Damage', ['101.20%'])).toBe(true);
    expect(isScalingAttribute('Arboreal Flourish Healing', ['500+11.33%'])).toBe(true);
    expect(isScalingAttribute('Cooldown', ['12'])).toBe(false);
    expect(isScalingAttribute('Concerto Regen', ['8'])).toBe(false);
    expect(isScalingAttribute('Heavy Attack STA Cost', ['30'])).toBe(false);
    expect(isScalingAttribute('Resonance Cost', ['100'])).toBe(false);
  });

  it('keeps bare damage names with percent values (surveyed provider rows)', () => {
    // Each verified live in its provider record (sync items 1-2 + survey).
    expect(isScalingAttribute('Mid-air Attack', ['62.00%'])).toBe(true); // Encore 1203 / Aalto / Iuno
    expect(isScalingAttribute('Heavy Attack', ['14.58%*3+18.75%'])).toBe(true); // Changli 1205 / Lupa
    expect(isScalingAttribute('Mid-air Heavy Attack', ['62.00%'])).toBe(true); // Changli 1205
    expect(isScalingAttribute('Dodge Counter', ['41.57%*3'])).toBe(true); // Changli 1205
    expect(isScalingAttribute('Hounds Roar Stage 2', ['17.72%*2+26.58%*2'])).toBe(true); // Calcharo 1301
    expect(isScalingAttribute('Yellow Light: Basic Attack', ['16.00%*3'])).toBe(true); // Lumi 1504
    expect(isScalingAttribute('Glitter', ['32.00%'])).toBe(true); // Lumi 1504
    expect(isScalingAttribute('Yellow Light: Plunging Attack', ['48.00%'])).toBe(true); // Lumi 1504
    expect(isScalingAttribute('Moonring - Dodge Counter', ['41.29%*2+42.54%'])).toBe(true); // Iuno 1410
    expect(isScalingAttribute('Heavy Attack - Drizzle Stance', ['6.00%*10+60.00%'])).toBe(true); // Suisui 1110
    expect(isScalingAttribute('Basic Attack Stage 1', ['27.20%'])).toBe(true); // Carlotta
    expect(isScalingAttribute('Basic Attack - Polychrome Leap 1', ['17.00%*3'])).toBe(true); // Lynae
    expect(isScalingAttribute('Mid-air Attack 1 Sword Shadow Recalled', ['2.84%'])).toBe(true); // Cartethyia
    expect(isScalingAttribute('Dodge Counter - Purgatory Scourge', ['16.15%*3+113.03%'])).toBe(true); // Galbrena
  });

  it('drops percent-valued metadata: shields, recovery, buffs, parameters', () => {
    expect(isScalingAttribute('Timed Counters Stage 1 Shield', ['300+11.25%'])).toBe(false);
    expect(isScalingAttribute('Minor Zhoutian Final Shield', ['875+34.13%'])).toBe(false);
    expect(isScalingAttribute('HP recovery', ['950+45.00%'])).toBe(false);
    expect(isScalingAttribute('Mist Avatar HP', ['100%'])).toBe(false);
    expect(isScalingAttribute('Gate Of Quandary ATK Increase', ['10%'])).toBe(false);
    expect(isScalingAttribute('Movement Speed Increase', ['40%'])).toBe(false);
    expect(isScalingAttribute('Basic Attack Multiplier Increase', ['25%'])).toBe(false);
    expect(isScalingAttribute('Additional Multiplier Per Blaze', ['5.00%'])).toBe(false);
    expect(isScalingAttribute('Additional multiplier per Incandescence', ['22.40%'])).toBe(false);
  });

  it('drops bare metadata without percents', () => {
    expect(isScalingAttribute('Mystery Counter', [])).toBe(false);
    expect(isScalingAttribute('Skill Duration', ['2.5'])).toBe(false);
  });

  it('drops debuff magnitudes despite the DMG in their names', () => {
    // Taoqi Concealed Edge / Fortified Defense: enemy debuff magnitudes,
    // not damage. Verified 2026-09-19 these are the only *eduction* rows.
    expect(isScalingAttribute('Heavy Attack DMG Reduction', ['35%'])).toBe(false);
    expect(isScalingAttribute('Rocksteady Shield Damage Reduction', ['15%'])).toBe(false);
  });
});

describe('partitionUsableMotions', () => {
  it('keeps 19- and 20-length rows together (Jianxin proved aligned)', () => {
    const motions = [
      { name: 'Stage 1 DMG', values: new Array(19).fill(0.1) },
      { name: 'Stage 2 DMG', values: new Array(20).fill(0.2) },
    ];
    const { kept, dropped } = partitionUsableMotions(motions);
    expect(kept.map((m) => m.name)).toEqual(['Stage 1 DMG', 'Stage 2 DMG']);
    expect(dropped).toEqual([]);
  });

  it('drops rows too short for the forte track', () => {
    const motions = [
      { name: 'Stage 1 DMG', values: new Array(10).fill(0.1) },
      { name: 'Truncated Row', values: new Array(9).fill(0.1) },
    ];
    const { kept, dropped } = partitionUsableMotions(motions);
    expect(kept.map((m) => m.name)).toEqual(['Stage 1 DMG']);
    expect(dropped.map((m) => m.name)).toEqual(['Truncated Row']);
  });
});

describe('applyMotionTypeOverride', () => {
  it('retypes the three prose-verified contradictions', () => {
    expect(applyMotionTypeOverride('1001707', 'Umbra: Thwackblade Damage', 'basic')).toBe('heavy');
    expect(applyMotionTypeOverride('1000617', 'Resonating Spin DMG', 'forte')).toBe('skill');
    expect(applyMotionTypeOverride('1000617', 'Resonating Echoes Stage 2 DMG', 'forte')).toBe('skill');
    expect(applyMotionTypeOverride('1004903', 'Spoofing Program: Cripple Movement DMG', 'heavy')).toBe('liberation');
  });

  it('passes everything else through untouched', () => {
    expect(applyMotionTypeOverride('1001707', 'Umbra: Heavy Attack DMG', 'heavy')).toBe('heavy');
    expect(applyMotionTypeOverride('1000607', 'Resonating Spin DMG', 'skill')).toBe('skill');
    expect(applyMotionTypeOverride('1004903', 'Spoofing Program: Ping DMG', 'heavy')).toBe('heavy');
    expect(applyMotionTypeOverride('9999999', 'Anything', 'basic')).toBe('basic');
  });
});

describe('name mappings', () => {
  it('maps skill types, skipping inherent passives', () => {
    expect(skillKindFromType('Normal Attack')).toBe('basic');
    expect(skillKindFromType('Resonance Liberation')).toBe('liberation');
    expect(skillKindFromType('Forte Circuit')).toBe('forte');
    expect(skillKindFromType('Tune Break')).toBe('tunebreak');
    expect(skillKindFromType('Inherent Skill')).toBeNull();
    expect(skillKindFromType('Something New')).toBeNull();
  });

  it('maps property names with percent disambiguation', () => {
    expect(statKeyFromPropertyName('ATK', false)).toBe('atk');
    expect(statKeyFromPropertyName('ATK', true)).toBe('atkPct');
    expect(statKeyFromPropertyName('Crit. DMG', true)).toBe('critDmg');
    expect(statKeyFromPropertyName('Tune Break Boost', false)).toBeNull();
  });

  it('maps forte titles via strict allowlist', () => {
    expect(statKeyFromForteTitle('ATK+')).toBe('atkPct');
    expect(statKeyFromForteTitle('Healing Bonus+')).toBe('healingBonus');
    expect(statKeyFromForteTitle('HP Up')).toBe('hpPct');
    expect(statKeyFromForteTitle('Crit. Rate Up')).toBe('critRate');
    expect(statKeyFromForteTitle('Aero DMG Bonus+')).toBe('dmgBonus:Aero');
    expect(statKeyFromForteTitle('Fusion DMG Bonus+')).toBe('dmgBonus:Fusion');
    expect(statKeyFromForteTitle('Something New+')).toBeNull();
  });

  it('validates attributes', () => {
    expect(parseAttribute('Aero')).toBe('Aero');
    expect(() => parseAttribute('Wind')).toThrow();
  });

  it('slugifies names', () => {
    expect(slugify('Verdant Summit')).toBe('verdant-summit');
    expect(slugify('Sierra Gale')).toBe('sierra-gale');
  });

  it('strips provider markup', () => {
    expect(stripHtml('ATK <span style="x">+10%</span>')).toBe('ATK +10%');
  });
});

describe('statEffectFromBonusLine', () => {
  it('structures simple 2pc lines', () => {
    expect(statEffectFromBonusLine('ATK +10%')).toEqual({ stat: 'atkPct', value: 0.1 });
    expect(statEffectFromBonusLine('Aero DMG + 10%.')).toEqual({ stat: 'dmgBonus:Aero', value: 0.1 });
    expect(statEffectFromBonusLine('Healing Bonus + 10%.')).toEqual({ stat: 'healingBonus', value: 0.1 });
    expect(statEffectFromBonusLine('Resonance Skill DMG + 10%')).toEqual({ stat: 'dmgBonus:skill', value: 0.1 });
  });

  it('returns null for templated or conditional text', () => {
    expect(statEffectFromBonusLine('Energy Regen + {0}.')).toBeNull();
    expect(statEffectFromBonusLine('Aero DMG + 30% for 15s after releasing Intro Skill.')).toBeNull();
  });
});

describe('bonusKindFromDamageType', () => {
  it('maps provider per-hit types to bonus buckets', () => {
    expect(bonusKindFromDamageType('Basic Attack')).toBe('basic');
    expect(bonusKindFromDamageType('Heavy Attack')).toBe('heavy');
    expect(bonusKindFromDamageType('Resonance Skill')).toBe('skill');
    expect(bonusKindFromDamageType('Resonance Liberation')).toBe('liberation');
    expect(bonusKindFromDamageType('Intro Skill')).toBe('intro');
    expect(bonusKindFromDamageType('Outro Skill')).toBe('outro');
    expect(bonusKindFromDamageType('Echo Skill')).toBe('echo');
  });

  it('returns null for unknown types (caller falls back loudly)', () => {
    expect(bonusKindFromDamageType('Tune Break')).toBeNull();
    expect(bonusKindFromDamageType('')).toBeNull();
  });
});

describe('isHealingAttribute', () => {
  it('flags healing motions for zero-damage scoring', () => {
    expect(isHealingAttribute('Arboreal Flourish Healing')).toBe(true);
    expect(isHealingAttribute('Healing per Plume Step')).toBe(true);
    expect(isHealingAttribute('Skill DMG')).toBe(false);
  });
});

describe('resolveMotionBonusKind', () => {
  it('uses the unanimous Type for uniform skills', () => {
    const entries = [
      { type: 'Basic Attack', rateLevelOne: '375%' },
      { type: 'Basic Attack', rateLevelOne: '25%' },
    ];
    expect(resolveMotionBonusKind('Resonance Liberation', '375.00%+25.00%*5', entries)).toBe('basic');
  });

  it('matches mixed skills per-motion by level-1 rates (Luuk Herssen skill)', () => {
    const entries = [
      { type: 'Resonance Skill', rateLevelOne: '101.2%' },
      { type: 'Basic Attack', rateLevelOne: '13.36%' },
      { type: 'Basic Attack', rateLevelOne: '44.53%' },
    ];
    // Golden Reflux matches the Resonance Skill hit numerically (101.20% == 101.2%).
    expect(resolveMotionBonusKind('Resonance Skill', '101.20%', entries)).toBe('skill');
    // Aureole Ring aggregates the two Basic Attack hits.
    expect(resolveMotionBonusKind('Resonance Skill', '13.36%*5+44.53%', entries)).toBe('basic');
  });

  it('falls back to the parent skill kind with no usable entries', () => {
    expect(resolveMotionBonusKind('Resonance Liberation', '100%', [])).toBe('liberation');
    expect(resolveMotionBonusKind('Forte Circuit', '100%', [{ type: 'Mystery', rateLevelOne: '100%' }])).toBe('forte');
    // Tune Break skills carry no bonus bucket — attribute-only fallback.
    expect(resolveMotionBonusKind('Tune Break', '100%', [])).toBe('forte');
  });

  it('extracts percent terms for hit matching', () => {
    expect(percentTermsOf('13.36%*5+44.53%')).toEqual([13.36, 44.53]);
    expect(percentTermsOf('500+11.33%')).toEqual([11.33]);
  });
});

describe('resolveMotionScaling', () => {
  it('maps ATK/HP/DEF property names, ignoring mechanics', () => {
    expect(scalingFromPropertyName('ATK')).toBe('ATK');
    expect(scalingFromPropertyName('HP')).toBe('HP');
    expect(scalingFromPropertyName('DEF')).toBe('DEF');
    expect(scalingFromPropertyName('Energy Regen')).toBeNull();
  });

  it('uses the unanimous scaling for uniform skills', () => {
    const entries = [
      { propertyName: 'HP', rateLevelOne: '3.27%' },
      { propertyName: 'HP', rateLevelOne: '1.83%' },
    ];
    expect(resolveMotionScaling('3.27%', entries, 'ATK')).toBe('HP');
  });

  it('matches mixed skills per-motion by level-1 rates (Taoqi Power Shift)', () => {
    const entries = [
      { propertyName: 'ATK', rateLevelOne: '105%' },
      { propertyName: 'DEF', rateLevelOne: '43.36%' },
      { propertyName: 'DEF', rateLevelOne: '55.8%' },
    ];
    expect(resolveMotionScaling('43.36%', entries, 'ATK')).toBe('DEF');
    expect(resolveMotionScaling('55.8%', entries, 'ATK')).toBe('DEF');
  });

  it('falls back to the skill scaling with no usable entries', () => {
    expect(resolveMotionScaling('100%', [], 'ATK')).toBe('ATK');
    expect(resolveMotionScaling('100%', [{ propertyName: 'Energy Regen', rateLevelOne: '10' }], 'HP')).toBe('HP');
  });
});

describe('echoCostFromIntensity', () => {
  it('maps Handbook intensity to echo cost', () => {
    expect(echoCostFromIntensity('Common Class')).toBe(1);
    expect(echoCostFromIntensity('Elite Class')).toBe(3);
    expect(echoCostFromIntensity('Overlord Class')).toBe(4);
    expect(echoCostFromIntensity('Calamity Class')).toBe(4);
  });

  it('returns null for empty or unknown intensities', () => {
    expect(echoCostFromIntensity('')).toBeNull();
    expect(echoCostFromIntensity('Something New')).toBeNull();
  });
});

describe('echoCostFromRarity', () => {
  it('maps detail Rarity to echo cost (Hooscamp 0, Hoochief 1)', () => {
    expect(echoCostFromRarity(0)).toBe(1);
    expect(echoCostFromRarity(1)).toBe(3);
    expect(echoCostFromRarity(2)).toBe(4);
  });

  it('maps Rarity 3 to cost 4 (Reminiscence Calamity-class echoes)', () => {
    // Fleurdelys / Leviathan / Denia / Voidborne Construct: provider Rarity
    // 3 with no Handbook data, sharing RandGroupId 501 with the 4-cost
    // Reminiscence: Fenrico (verified 2026-09-12).
    expect(echoCostFromRarity(3)).toBe(4);
  });

  it('returns null for unverified rarities', () => {
    expect(echoCostFromRarity(4)).toBeNull();
    expect(echoCostFromRarity(99)).toBeNull();
  });
});

describe('echoSkipReasonForName', () => {
  it('flags Phantom shiny variants with a reason', () => {
    expect(echoSkipReasonForName('Phantom: Mourning Aix')).toContain('phantom');
    expect(echoSkipReasonForName('Phantom: Dreamless')).toContain('phantom');
    expect(echoSkipReasonForName('Phantom: Nightmare Crownless')).toContain('phantom');
  });

  it('flags unreleased placeholder names with a reason', () => {
    expect(echoSkipReasonForName('MonsterInfo_60200601_Name')).toContain('unreleased');
    expect(echoSkipReasonForName('MonsterInfo_60200501_Name')).toContain('unreleased');
  });

  it('keeps real echoes, including Nightmare and multi-form variants', () => {
    expect(echoSkipReasonForName('Mourning Aix')).toBeNull();
    expect(echoSkipReasonForName('Dreamless')).toBeNull();
    expect(echoSkipReasonForName('Nightmare: Crownless')).toBeNull();
    expect(echoSkipReasonForName('Chop Chop: Headless')).toBeNull();
    expect(echoSkipReasonForName('Twin Nova: Collapsar Blade')).toBeNull();
  });

  it('only matches the exact Phantom prefix and placeholder shape', () => {
    expect(echoSkipReasonForName('Phantom Menace')).toBeNull();
    expect(echoSkipReasonForName('MonsterInfo')).toBeNull();
    expect(echoSkipReasonForName('')).toBeNull();
  });
});

describe('statKeysFromMainStatToken', () => {
  it('maps unambiguous pool tokens to single keys', () => {
    expect(statKeysFromMainStatToken('Crit. Rate')).toEqual(['critRate']);
    expect(statKeysFromMainStatToken('Crit. DMG')).toEqual(['critDmg']);
    expect(statKeysFromMainStatToken('Energy Regen')).toEqual(['energyRegen']);
    expect(statKeysFromMainStatToken('Healing Bonus')).toEqual(['healingBonus']);
    expect(statKeysFromMainStatToken('Aero DMG Bonus')).toEqual(['dmgBonus:Aero']);
    expect(statKeysFromMainStatToken('Havoc DMG Bonus')).toEqual(['dmgBonus:Havoc']);
    expect(statKeysFromMainStatToken('Tune Break Boost')).toEqual(['tuneBreakBoost']);
  });

  it('maps flat/percent-ambiguous tokens to both variants', () => {
    // Handbook pools do not distinguish flat ATK from ATK% — see helper docs.
    expect(statKeysFromMainStatToken('ATK')).toEqual(['atk', 'atkPct']);
    expect(statKeysFromMainStatToken('HP')).toEqual(['hp', 'hpPct']);
    expect(statKeysFromMainStatToken('DEF')).toEqual(['def', 'defPct']);
  });

  it('returns null for unknown tokens', () => {
    expect(statKeysFromMainStatToken('')).toBeNull();
    // No Physical element exists in-game, so this Handbook token has no stat.
    expect(statKeysFromMainStatToken('Physical DMG Bonus')).toBeNull();
  });
});
