import type { RotationPreset } from './rotationPresets.ts';

/**
 * Lynae presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Standard Rotation section (the recommended rotation).
 */
export const LYNAE_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'lynae-prydwen-standard',
    characterId: 'lynae',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/lynae',
    notes:
      'Transcribed from the Rotation & Gameplay > Standard Rotation section (verified live 2026-09-19). ' +
      'Full-Charge Spark Collision maps to the Lv. 3 row (Lv. 3 at 100% Lumiflow, per the kit text). ' +
      'The liberation follow-up Basic Attack - To a Vivid Tomorrow! needs a separate Normal Attack press ' +
      'per the liberation prose, is not a guide step, and is omitted. ' +
      'Omitted: the freely-timed Echo cast (echo skill, prose-only). ' +
      'The page also details an S6 Rotation (not transcribed).',
    steps: [
      {
        skillId: '1004506',
        motionName: 'Time to Show Some Colors! DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Ultimate".
      { skillId: '1004503', motionName: 'Prismatic Overblast DMG', forteLevel: 10 },
      // Guide: "Skill: Lynae-Style Palettes".
      { skillId: '1004502', motionName: 'Lynae-Style Palettes DMG', forteLevel: 10 },
      {
        skillId: '1004501',
        motionName: 'Basic Attack - Spark Collision Lv. 3 DMG',
        forteLevel: 10,
        note: 'Guide: "Heavy: Spark Collision (Full Charge)". Cancel animation endlag via Jump (no cancel model; full motion scores).',
      },
      // Guide: "Jump: Polychrome Leap (3 Times)".
      { skillId: '1004507', motionName: 'Basic Attack - Polychrome Leap 1', forteLevel: 10 },
      { skillId: '1004507', motionName: 'Basic Attack - Polychrome Leap 2', forteLevel: 10 },
      { skillId: '1004507', motionName: 'Basic Attack - Polychrome Leap 3', forteLevel: 10 },
      // Guide: "Basic: Mid-air Attack: Visual Impact".
      { skillId: '1004507', motionName: 'Basic Attack - Visual Impact DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004509', motionName: '', forteLevel: 10 },
    ],
  },
];
