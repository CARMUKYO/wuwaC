import type { RotationPreset } from './rotationPresets.ts';

/**
 * Rover: Electro presets. Transcribed from the Rotation & Gameplay section,
 * Standard Rotation (verified live 2026-09-19). Rover variants live on
 * split Prydwen pages; this preset is from the Rover (Electro) page.
 * Same-character damage only: the Echo step is omitted. No other rotation
 * is detailed on the page.
 */
export const ROVER_ELECTRO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'rover-electro-prydwen-standard',
    characterId: 'rover-electro',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/rover-electro',
    notes:
      'Transcribed from the Rotation & Gameplay section, Standard Rotation (verified live 2026-09-19). ' +
      'Omitted: the Echo (Swap) step (user echo-dependent). ' +
      'No other rotation is detailed on the page.',
    steps: [
      { skillId: '1005506', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1005501', motionName: 'Basic Attack Stage 1 DMG', forteLevel: 10 },
      { skillId: '1005501', motionName: 'Basic Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1005501', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1005501', motionName: 'Basic Attack Stage 4 DMG', forteLevel: 10 },
      { skillId: '1005502', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1005502',
        motionName: 'Basic Attack - Repel DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1005503', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1005507',
        motionName: 'Overshock DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Echo (no cancel model; full motion scores).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005509', motionName: '', forteLevel: 10 },
    ],
  },
];
