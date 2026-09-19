import type { RotationPreset } from './rotationPresets.ts';

/**
 * Ciaccona presets. Transcribed from Prydwen's Rotation > Basic Rotation
 * (the page's recommended base rotation; No Intro and Main DPS variants
 * are conditional).
 */
export const CIACCONA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'ciaccona-prydwen-basic-rotation',
    characterId: 'ciaccona',
    label: 'Basic Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/ciaccona',
    notes:
      'Transcribed from the Rotation > Basic Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Jump cancel line (non-damaging movement, no snapshot skill); Echo usage is prose-only (not a listed step). ' +
      'The page also details a No Intro Rotation and a Main DPS Rotation (not transcribed).',
    steps: [
      { skillId: '1003406', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1003401', motionName: 'Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1003401',
        motionName: 'Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: Basic P4, cancelled via Jump (no cancel model; full motion scores).',
      },
      { skillId: '1003401', motionName: 'Mid-air Attack Stage 1 DMG', forteLevel: 10 },
      { skillId: '1003401', motionName: 'Mid-air Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1003401', motionName: 'Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1003402',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: Skill, cancelled out of Basic P4 (no cancel model; full motion scores).',
      },
      {
        skillId: '1003407',
        motionName: 'Quadruple Downbeat DMG',
        forteLevel: 10,
        note: 'Guide: Forte: Heavy Attack: Quadruple Downbeat.',
      },
      {
        skillId: '1003403',
        motionName: 'Improvised Symphonic Poem Skill DMG',
        forteLevel: 10,
        note: 'Guide: Ultimate: Improv Symphonic Poem (cancels the Forte Heavy when it hits the enemy).',
      },
      {
        skillId: '1003403',
        motionName: 'Symphonic Poem: Tonic DMG',
        forteLevel: 10,
        note: 'Guide: (Optional) Symphonic Poem: Tonic (switch to Spectro Frazzle if needed).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003409', motionName: '', forteLevel: 10 },
    ],
  },
];
