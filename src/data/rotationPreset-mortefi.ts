import type { RotationPreset } from './rotationPresets.ts';

/**
 * Mortefi presets. Transcribed from Prydwen's Gameplay and teams > Rotation
 * section (the page's single step rotation).
 */
export const MORTEFI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'mortefi-prydwen-rotation',
    characterId: 'mortefi',
    label: 'Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/mortefi',
    notes:
      'Transcribed from the Gameplay and teams > Rotation section (verified live 2026-09-19). ' +
      'Fury Fugue maps to the forte snapshot row. ' +
      '"Ultimate" maps to the Violent Finale cast row; Marcato hits are off-field coordinated attacks ' +
      'triggered by teammates and are not rotation steps. ' +
      'Omitted: the Echo line (Impermanence Heron swap-cancel, echo skill).',
    steps: [
      // Guide: "Intro".
      { skillId: '1001206', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Skill: Passionate Variation".
      { skillId: '1001202', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Skill: Fury Fugue" (a forte-skill row).
      { skillId: '1001207', motionName: 'Fury Fugue Damage', forteLevel: 10 },
      // Guide: "Basic P1".
      { skillId: '1001201', motionName: 'Stage 1 DMG', forteLevel: 10 },
      // Guide: "Basic P2".
      { skillId: '1001201', motionName: 'Stage 2 DMG', forteLevel: 10 },
      // Guide: "Basic P3".
      { skillId: '1001201', motionName: 'Stage 3 DMG', forteLevel: 10 },
      // Guide: "Basic P4".
      { skillId: '1001201', motionName: 'Stage 4 DMG', forteLevel: 10 },
      // Guide: "Skill: Fury Fugue" (a forte-skill row).
      { skillId: '1001207', motionName: 'Fury Fugue Damage', forteLevel: 10 },
      // Guide: "Ultimate" (the Violent Finale cast; Marcato hits are not steps).
      { skillId: '1001203', motionName: 'Violent Finale Damage', forteLevel: 10 },
    ],
  },
];
