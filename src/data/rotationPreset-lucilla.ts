import type { RotationPreset } from './rotationPresets.ts';

/**
 * Lucilla presets. Transcribed from Prydwen's Rotation & How to Play >
 * Standard Rotation section (the page's single step rotation).
 */
export const LUCILLA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'lucilla-prydwen-standard',
    characterId: 'lucilla',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/lucilla',
    notes:
      'Transcribed from the Rotation & How to Play > Standard Rotation section (verified live 2026-09-19). ' +
      'The "Hold Basic (Heavy)" line is a stance instruction, not a damage step. ' +
      'Omitted: the end-of-rotation Echo swap timing (echo skill, prose-only). ' +
      'Perfect Release / enhanced multipliers live in skill prose and are unscored.',
    steps: [
      {
        skillId: '1005006',
        motionName: 'Clip It DMG',
        forteLevel: 10,
        note: 'Guide: "Intro". Base form per the intro prose (Clip It: Hard Cut replaces it only in Reminiscence).',
      },
      {
        skillId: '1005002',
        motionName: 'Spotlight DMG',
        forteLevel: 10,
        note: 'Guide: "Skill: Spotlight (Perfect Release)" (perfect-release enhanced multiplier unscored).',
      },
      // Guide: "Ultimate".
      { skillId: '1005003', motionName: 'Clear As Day DMG', forteLevel: 10 },
      // Guide: "Heavy: Basic - Forms 1".
      { skillId: '1005003', motionName: 'Basic Attack - Tracing Forms Stage 1 DMG', forteLevel: 10 },
      // Guide: "Heavy: Basic - Forms 2".
      { skillId: '1005003', motionName: 'Basic Attack - Tracing Forms Stage 2 DMG', forteLevel: 10 },
      // Guide: "Heavy: Basic - Forms 3".
      { skillId: '1005003', motionName: 'Basic Attack - Tracing Forms Stage 3 DMG', forteLevel: 10 },
      // Guide: "Letting It Go".
      { skillId: '1005003', motionName: 'Letting It Go DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005009', motionName: '', forteLevel: 10 },
    ],
  },
];
