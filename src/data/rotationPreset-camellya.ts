import type { RotationPreset } from './rotationPresets.ts';

/**
 * Camellya presets. Transcribed from Prydwen's Rotation > Standard Rotation
 * (the page's highest-loop-DPS base rotation; S6 and White Hair variants
 * are situational).
 */
export const CAMELLYA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'camellya-prydwen-standard-rotation',
    characterId: 'camellya',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/camellya',
    notes:
      'Transcribed from the Rotation > Standard Rotation section (verified live 2026-09-19). ' +
      'Omitted: 3 Echo steps (echo-skill, user echo-dependent) and 2 Dash lines (non-damaging movement, no snapshot skill). ' +
      'The page also details an S6 Rotation and a White Hair Rotation (not transcribed).',
    steps: [
      { skillId: '1001306', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001302',
        motionName: 'Crimson Blossom DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Echo (no cancel model; full motion scores).',
      },
      { skillId: '1001302', motionName: 'Vining Waltz 1 DMG', forteLevel: 10 },
      { skillId: '1001302', motionName: 'Vining Waltz 2 DMG', forteLevel: 10 },
      { skillId: '1001302', motionName: 'Vining Waltz 3 DMG', forteLevel: 10 },
      { skillId: '1001302', motionName: 'Blazing Waltz DMG', forteLevel: 10 },
      {
        skillId: '1001302',
        motionName: 'Vining Waltz 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Echo (no cancel model; full motion scores).',
      },
      { skillId: '1001303', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001302',
        motionName: 'Vining Waltz 1 DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Vining Waltz 1, cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1001307',
        motionName: 'Ephemeral DMG',
        forteLevel: 10,
        note: 'Guide: Skill: Ephemeral (forte cast on the Skill button).',
      },
      { skillId: '1001302', motionName: 'Vining Waltz 1 DMG', forteLevel: 10 },
      { skillId: '1001302', motionName: 'Vining Waltz 2 DMG', forteLevel: 10 },
      { skillId: '1001302', motionName: 'Vining Waltz 3 DMG', forteLevel: 10 },
      { skillId: '1001302', motionName: 'Blazing Waltz DMG', forteLevel: 10 },
      {
        skillId: '1001302',
        motionName: 'Vining Waltz 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      { skillId: '1001302', motionName: 'Floral Ravage DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001309', motionName: '', forteLevel: 10 },
    ],
  },
];
