import type { RotationPreset } from './rotationPresets.ts';

/**
 * Verina presets. Transcribed from the Rotation section, Rotation (S0)
 * (verified live 2026-09-19). The Liberation step scores the initial hit
 * only; the Photosynthesis Mark coordinated triggers and all healing rows
 * are omitted (teammate-triggered / no-healing-rows). The Jump is
 * non-damaging movement and the end-of-rotation Echo is user
 * echo-dependent; both are omitted. The guide recommends skipping her
 * Intro, so none is transcribed. The page also details a Rotation (S2)
 * (not transcribed).
 */
export const VERINA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'verina-prydwen-s0',
    characterId: 'verina',
    label: 'Rotation (S0)',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/verina',
    notes:
      'Transcribed from the Rotation section, Rotation (S0), 3.75s (verified live 2026-09-19). ' +
      'Omitted: the Jump (movement), the end-of-rotation Echo (user echo-dependent), and the Photosynthesis Mark coordinated triggers (teammate-triggered). ' +
      'No Intro is transcribed per the guide recommendation. ' +
      'The page also details a Rotation (S2) (not transcribed).',
    steps: [
      {
        skillId: '1000301',
        motionName: 'Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: swap in without an Intro.',
      },
      { skillId: '1000301', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1000301', motionName: 'Stage 5 DMG', forteLevel: 10 },
      {
        skillId: '1000302',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: immediately cancelled by Ultimate, so the hit may not come out (no cancel model; full motion scores).',
      },
      { skillId: '1000303', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000307', motionName: 'Mid-air Attack: Starflower Blooms Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000307', motionName: 'Mid-air Attack: Starflower Blooms Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000307', motionName: 'Mid-air Attack: Starflower Blooms Stage 3 DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000309', motionName: '', forteLevel: 10 },
    ],
  },
];
