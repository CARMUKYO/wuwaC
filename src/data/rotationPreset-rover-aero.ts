import type { RotationPreset } from './rotationPresets.ts';

/**
 * Rover: Aero presets. Transcribed from the Rotation section, STANDARD
 * ROTATION (verified live 2026-09-19). Rover variants live on split
 * Prydwen pages; this preset is from the Rover (Aero) page. Same-character
 * damage only: the Echo Usage step is omitted. The page also details an
 * OPENER ROTATION (not transcribed).
 */
export const ROVER_AERO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'rover-aero-prydwen-standard',
    characterId: 'rover-aero',
    label: 'STANDARD ROTATION',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/rover-aero',
    notes:
      'Transcribed from the Rotation section, STANDARD ROTATION (verified live 2026-09-19). ' +
      'Omitted: the Echo Usage step (user echo-dependent). ' +
      'The page also details an OPENER ROTATION (not transcribed).',
    steps: [
      { skillId: '1003206', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1003207', motionName: 'Cloudburst Dance Stage 1 DMG', forteLevel: 10 },
      { skillId: '1003207', motionName: 'Cloudburst Dance Stage 2 DMG', forteLevel: 10 },
      // Guide: "Ultimate". Healing row omitted per the no-healing-rows rule.
      { skillId: '1003203', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1003202', motionName: 'Awakening Gale DMG', forteLevel: 10 },
      { skillId: '1003207', motionName: 'Cloudburst Dance Stage 1 DMG', forteLevel: 10 },
      { skillId: '1003207', motionName: 'Cloudburst Dance Stage 2 DMG', forteLevel: 10 },
      {
        skillId: '1003202',
        motionName: 'Skyfall Severance DMG',
        forteLevel: 10,
        note: 'Guide: optional — skip when the team has no interest in Ailments.',
      },
      { skillId: '1003201', motionName: 'Mid-air Attack DMG', forteLevel: 10 },
      {
        skillId: '1003207',
        motionName: 'Unbound Flow Stage 1 DMG',
        forteLevel: 10,
        note: 'Guide: switch out after this step.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003209', motionName: '', forteLevel: 10 },
      {
        skillId: '1003207',
        motionName: 'Unbound Flow Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: happens automatically off-field after the swap (forte skill prose).',
      },
    ],
  },
];
