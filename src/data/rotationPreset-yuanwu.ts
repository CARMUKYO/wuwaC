import type { RotationPreset } from './rotationPresets.ts';

/**
 * Yuanwu presets. Transcribed from the Rotation section, Ability Priority
 * (verified live 2026-09-19). The page states Yuanwu has no set rotation;
 * this priority list (assigned for calculations) is the closest
 * equivalent. Each step scores its cast hit only: Thunder Wedge
 * coordinated ticks and the Ultimate/Forte detonation effects are not
 * separately listed steps. The Echo step is omitted as user
 * echo-dependent. No other rotation is detailed on the page.
 */
export const YUANWU_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'yuanwu-prydwen-ability-priority',
    characterId: 'yuanwu',
    label: 'Ability Priority',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/yuanwu',
    notes:
      'Transcribed from the Rotation section, Ability Priority (verified live 2026-09-19). ' +
      'Steps score their cast hits only; Wedge coordinated ticks and detonation effects are not listed steps. ' +
      'Omitted: the Echo step (user echo-dependent). ' +
      'No other rotation is detailed on the page.',
    steps: [
      {
        skillId: '1001606',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: Intro, if available.',
      },
      { skillId: '1001602', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001603',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: detonates the Thunderwedge (detonation scored only via the cast hit).',
      },
      { skillId: '1001602', motionName: 'Rumbling Spark Damage', forteLevel: 10 },
      { skillId: '1001602', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Outro (If Available)". Motion-less outro skill: buff-carrier block (0 damage).
      {
        skillId: '1001609',
        motionName: '',
        forteLevel: 10,
        note: 'Guide: Outro, if available.',
      },
      {
        skillId: '1001602',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: re-place the Thunderwedge as needed to keep it active and on top of enemies.',
      },
    ],
  },
];
