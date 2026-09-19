import type { RotationPreset } from './rotationPresets.ts';

/**
 * Baizhi presets. Transcribed from Prydwen's Rotation > Rotation S0R0 (the
 * base rotation; the S0R3 variant needs a refined Concerto weapon).
 */
export const BAIZHI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'baizhi-prydwen-s0r0',
    characterId: 'baizhi',
    label: 'Rotation S0R0 [Time (regular): 6.50s | (R1): 5.50s]',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/baizhi',
    notes:
      'Transcribed from the Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Echo step (echo-skill, user echo-dependent); the Euphonia pickup by the DPS (teammate action). ' +
      'Healing rows are never mapped: Intro maps to the Skill DMG row, Skill to Skill DMG, Ultimate to one Remnant Entities Damage block. ' +
      'The page also details a Rotation S0R3 (not transcribed).',
    steps: [
      { skillId: '1000406', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000401', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000401', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000401', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000401', motionName: 'Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1000402',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: Skill (swap, collect Euphonia with your DPS) — teammate pickup omitted.',
      },
      {
        skillId: '1000403',
        motionName: 'Remnant Entities Damage',
        forteLevel: 10,
        note:
          'Guide: Ultimate (delayed to cancel her slow swap-in attack). Single block for the cast; coordinated entity hits are not enumerated by the guide.',
      },
      { skillId: '1000401', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000401', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000401', motionName: 'Stage 3 DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000409', motionName: '', forteLevel: 10 },
    ],
  },
];
