import type { RotationPreset } from './rotationPresets.ts';

/**
 * Lupa presets. Transcribed from Prydwen's Gameplay and teams >
 * Loop Rotation section (the steady-state cycle).
 */
export const LUPA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'lupa-prydwen-loop-rotation',
    characterId: 'lupa',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/lupa',
    notes:
      'Transcribed from the Gameplay and teams > Loop Rotation section (verified live 2026-09-19). ' +
      '"Skill: Foebreaker" maps to the liberation-skill snapshot row. ' +
      'The automatic Set the Arena Ablaze follow-up (within 8s after the Forte Skill) is not a guide step ' +
      'and is omitted. ' +
      'Omitted: the Echo usage lines (echo skills, both rotations). ' +
      'The page also details an Opener Rotation (not transcribed).',
    steps: [
      {
        skillId: '1003606',
        motionName: 'Skill Damage',
        forteLevel: 10,
        note: 'Guide: "Intro". Base form per the intro prose (Nowhere to Run! replaces it only in the Wild Hunt state).',
      },
      // Guide: "Ultimate".
      { skillId: '1003603', motionName: 'Skill Damage', forteLevel: 10 },
      // Guide: "Skill: Foebreaker (press Basic or Skill shortly after Ultimate)" (a liberation-skill row).
      { skillId: '1003603', motionName: 'Foebreaker DMG', forteLevel: 10 },
      // Guide: "Mid-Air Attack 1".
      { skillId: '1003601', motionName: 'Mid-air Attack Stage 1 DMG', forteLevel: 10 },
      // Guide: "Mid-Air Attack 2".
      { skillId: '1003601', motionName: 'Mid-air Attack Stage 2 DMG', forteLevel: 10 },
      // Guide: "Mid-Air Attack: Firestrike (press Basic after Mid-Air Attack 2)".
      { skillId: '1003601', motionName: 'Mid-air Attack - Firestrike DMG', forteLevel: 10 },
      // Guide: "Heavy: Wolf's Claw (press Basic after Firestrike)".
      { skillId: '1003601', motionName: "Heavy Attack - Wolf's Claw DMG", forteLevel: 10 },
      // Guide: "Forte: Skill: Dance With the Wolf - Climax".
      { skillId: '1003607', motionName: 'Dance With the Wolf: Climax DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003609', motionName: '', forteLevel: 10 },
    ],
  },
];
