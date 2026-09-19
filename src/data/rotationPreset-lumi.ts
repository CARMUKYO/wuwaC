import type { RotationPreset } from './rotationPresets.ts';

/**
 * Lumi presets. Transcribed from Prydwen's Gameplay and teams > Rotation
 * section (the page's single step rotation).
 */
export const LUMI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'lumi-prydwen-rotation',
    characterId: 'lumi',
    label: 'Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/lumi',
    notes:
      'Transcribed from the Gameplay and teams > Rotation section (verified live 2026-09-19). ' +
      'Energized Pounce / Rebound and the Red Spotlight basics map to the forte snapshot motions. ' +
      '"Channelled Dash: Glare x 6" expands to six Glare steps. ' +
      'Omitted: the end-of-rotation Echo line (echo skill, swap-cancelled).',
    steps: [
      // Guide: "Intro".
      { skillId: '1002606', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Ultimate".
      { skillId: '1002603', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002607',
        motionName: 'Energized Pounce DMG',
        forteLevel: 10,
        note: 'Guide: "Skill: Energized Pounce (Optionally Swap Cancel and immediately back)".',
      },
      // Guide: "Red Spotlight: Basic Attack 1".
      { skillId: '1002607', motionName: 'Red Spotlight: Basic Attack 1 DMG', forteLevel: 10 },
      // Guide: "Red Spotlight: Basic Attack 2".
      { skillId: '1002607', motionName: 'Red Spotlight: Basic Attack 2 DMG', forteLevel: 10 },
      {
        skillId: '1002607',
        motionName: 'Red Spotlight: Basic Attack 3 DMG',
        forteLevel: 10,
        note: 'Guide: "Red Spotlight: Basic Attack 3 (Optionally Swap Cancel and immediately back)".',
      },
      // Guide: "Skill: Energized Rebound".
      { skillId: '1002607', motionName: 'Energized Rebound DMG', forteLevel: 10 },
      // Guide: "Yellow Light: Basic Attack".
      { skillId: '1002601', motionName: 'Yellow Light: Basic Attack', forteLevel: 10 },
      // Guide: "Channelled Dash: Glare x 6" (six hits).
      { skillId: '1002607', motionName: 'Glare DMG', forteLevel: 10 },
      { skillId: '1002607', motionName: 'Glare DMG', forteLevel: 10 },
      { skillId: '1002607', motionName: 'Glare DMG', forteLevel: 10 },
      { skillId: '1002607', motionName: 'Glare DMG', forteLevel: 10 },
      { skillId: '1002607', motionName: 'Glare DMG', forteLevel: 10 },
      { skillId: '1002607', motionName: 'Glare DMG', forteLevel: 10 },
      // Guide: "Skill: Energized Pounce".
      { skillId: '1002607', motionName: 'Energized Pounce DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002609', motionName: '', forteLevel: 10 },
    ],
  },
];
