import type { RotationPreset } from './rotationPresets.ts';

/**
 * Yangyang presets. Transcribed from the Rotation section, STANDARD
 * CONCERTO ROTATION (verified live 2026-09-19). No Intro is transcribed:
 * the guide recommends skipping it for a faster rotation. The Jump skill
 * cancel is non-damaging movement and the Impermanence Heron timing is
 * user echo-dependent; both are omitted. No other rotation is detailed on
 * the page.
 */
export const YANGYANG_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'yangyang-prydwen-standard-concerto',
    characterId: 'yangyang',
    label: 'STANDARD CONCERTO ROTATION',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/yangyang',
    notes:
      'Transcribed from the Rotation section, STANDARD CONCERTO ROTATION (verified live 2026-09-19). ' +
      'No Intro is transcribed per the guide recommendation. ' +
      'Omitted: the Jump skill cancel (movement) and the Impermanence Heron timing (user echo-dependent). ' +
      'No other rotation is detailed on the page.',
    steps: [
      { skillId: '1000101', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000101', motionName: 'Heavy Attack DMG', forteLevel: 10 },
      { skillId: '1000101', motionName: 'Zephyr Song Damage', forteLevel: 10 },
      {
        skillId: '1000103',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: used to cancel the Zephyr Song endlag (no cancel model; full motion scores).',
      },
      { skillId: '1000101', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000101', motionName: 'Heavy Attack DMG', forteLevel: 10 },
      { skillId: '1000101', motionName: 'Zephyr Song Damage', forteLevel: 10 },
      {
        skillId: '1000102',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: used to cancel the Zephyr Song endlag; Jump-cancelled in turn (no cancel model; full motion scores).',
      },
      { skillId: '1000107', motionName: 'Feather Release Damage', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000109', motionName: '', forteLevel: 10 },
    ],
  },
];
