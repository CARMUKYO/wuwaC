import type { RotationPreset } from './rotationPresets.ts';

/**
 * Zani presets. Transcribed from the Rotation & How to play section,
 * Standard Rotation (2 Nightfall) — the variant requiring no Quickswap
 * (verified live 2026-09-19). Form-picked: the post-Last-Stand "Skill" is
 * Standard Defense Protocol (outside Inferno Mode with Redundant Energy
 * unfilled, per the skill prose). The Capitaneus summon is omitted as
 * user echo-dependent. The page also details a 3 Nightfall Rotation
 * (S6/Quickswap) and Additional Tips & Tricks (not transcribed).
 */
export const ZANI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'zani-prydwen-standard-2-nightfall',
    characterId: 'zani',
    label: 'Standard Rotation (2 Nightfall)',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/zani',
    notes:
      'Transcribed from the Rotation & How to play section, Standard Rotation (2 Nightfall) (verified live 2026-09-19). ' +
      'Omitted: the Capitaneus summon (user echo-dependent). ' +
      'The page also details a 3 Nightfall Rotation (S6/Quickswap) and Additional Tips & Tricks (not transcribed).',
    steps: [
      { skillId: '1003306', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1003302', motionName: 'Targeted Action DMG', forteLevel: 10 },
      { skillId: '1003303', motionName: 'Rekindle DMG', forteLevel: 10 },
      { skillId: '1003307', motionName: 'Heavy Slash - Daybreak DMG', forteLevel: 10 },
      { skillId: '1003307', motionName: 'Heavy Slash - Dawning DMG', forteLevel: 10 },
      { skillId: '1003307', motionName: 'Heavy Slash - Nightfall DMG', forteLevel: 10 },
      { skillId: '1003307', motionName: 'Heavy Slash - Daybreak DMG', forteLevel: 10 },
      { skillId: '1003307', motionName: 'Heavy Slash - Dawning DMG', forteLevel: 10 },
      {
        skillId: '1003307',
        motionName: 'Heavy Slash - Nightfall DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1003303', motionName: 'The Last Stand DMG', forteLevel: 10 },
      // Guide: "Skill". Form-picked: outside Inferno Mode, so Standard Defense
      // Protocol, not Crisis Response / Targeted Action (skill prose).
      { skillId: '1003302', motionName: 'Standard Defense Protocol DMG', forteLevel: 10 },
      {
        skillId: '1003301',
        motionName: 'Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: Swap after this step.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003309', motionName: '', forteLevel: 10 },
    ],
  },
];
