import type { RotationPreset } from './rotationPresets.ts';

/**
 * Galbrena presets. Transcribed from Prydwen's Gameplay Section > Standard
 * Rotation (the page's single rotation).
 */
export const GALBRENA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'galbrena-prydwen-standard-rotation',
    characterId: 'galbrena',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/galbrena',
    notes:
      'Transcribed from the Gameplay Section > Standard Rotation section (verified live 2026-09-19). ' +
      'Echo usage is prose-only (active Echo cast before Demon Hypostasis for Afterflame, not a listed step). ' +
      'Outro maps to the Outro Skill DMG row: unlike most outros, this one is not motion-less. ' +
      'The page presents a single rotation; the Tips tricks (pre-Intro basics, dodge counters) are not transcribed.',
    steps: [
      { skillId: '1004006', motionName: 'Intro Skill - Hellflare Overload DMG', forteLevel: 10 },
      { skillId: '1004001', motionName: 'Basic Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004001', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1004001', motionName: 'Basic Attack Stage 4 DMG', forteLevel: 10 },
      { skillId: '1004001', motionName: 'Basic Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004001', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1004002',
        motionName: 'Resonance Skill - Ascent of Malice DMG',
        forteLevel: 10,
        note: 'Guide: Skill: Ascent of Malice, interrupt animation on hit (no cancel model; full motion scores).',
      },
      { skillId: '1004003', motionName: 'Resonance Liberation - Hellfire Absolution DMG', forteLevel: 10 },
      { skillId: '1004007', motionName: 'Basic Attack - Seraphic Execution Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004007', motionName: 'Basic Attack - Seraphic Execution Stage 3 DMG', forteLevel: 10 },
      { skillId: '1004007', motionName: 'Basic Attack - Seraphic Execution Stage 4 DMG', forteLevel: 10 },
      { skillId: '1004007', motionName: 'Basic Attack - Seraphic Execution Stage 5 DMG', forteLevel: 10 },
      { skillId: '1004007', motionName: 'Basic Attack - Seraphic Execution Stage 3 DMG', forteLevel: 10 },
      { skillId: '1004007', motionName: 'Basic Attack - Seraphic Execution Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1004007',
        motionName: 'Basic Attack - Seraphic Execution Stage 5 DMG',
        forteLevel: 10,
        note: 'Guide: Forte: Basic P5 (Swap).',
      },
      { skillId: '1004009', motionName: 'Outro Skill DMG', forteLevel: 10 },
    ],
  },
];
