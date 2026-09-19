import type { RotationPreset } from './rotationPresets.ts';

/**
 * Brant presets. Transcribed from Prydwen's Rotation > Standard Rotation
 * (the page's majority-builds rotation; Double Forte is DPS-only).
 */
export const BRANT_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'brant-prydwen-standard-rotation',
    characterId: 'brant',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/brant',
    notes:
      'Transcribed from the Rotation > Standard Rotation section (verified live 2026-09-19). ' +
      'Echo usage is prose-only (swap-cancel timing, not a listed step) and is not mapped. ' +
      'Healing rows are never mapped: Ultimate maps to Skill DMG, Forte to Returned from Ashes DMG. ' +
      'The page also details a DOUBLE FORTE DPS ROTATION (not transcribed).',
    steps: [
      { skillId: '1002906', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002902',
        motionName: 'Plunging Attack DMG',
        forteLevel: 10,
        note:
          'Guide: Skill: Plunging Attack (OPTIONAL, immediately cancel with Ultimate). No cancel model; full motion scores.',
      },
      { skillId: '1002903', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1002901', motionName: 'Mid-air Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1002901', motionName: 'Mid-air Attack Stage 2: Charged Attack DMG', forteLevel: 10 },
      { skillId: '1002901', motionName: 'Mid-air Attack Stage 2: Flip DMG', forteLevel: 10 },
      { skillId: '1002901', motionName: 'Mid-air Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1002901', motionName: 'Mid-air Attack Stage 3: Flip DMG', forteLevel: 10 },
      { skillId: '1002907', motionName: 'Returned from Ashes DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002909', motionName: '', forteLevel: 10 },
    ],
  },
];
