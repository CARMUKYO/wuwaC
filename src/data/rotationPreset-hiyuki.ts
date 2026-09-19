import type { RotationPreset } from './rotationPresets.ts';

/**
 * Hiyuki presets. Transcribed from Prydwen's Rotation & How to Play > Easy
 * Rotation (the page's recommended simple rotation; Standard and 4 Iai
 * are advanced optimizations).
 */
export const HIYUKI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'hiyuki-prydwen-easy-rotation',
    characterId: 'hiyuki',
    label: 'Easy Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/hiyuki',
    notes:
      'Transcribed from the Rotation & How to Play > Easy Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Dash stance-entry line (non-damaging movement, no snapshot skill); Echo timing is prose-only (not a listed step). ' +
      'Blade Liberation maps to the Base DMG row only; the per-Snowforged-Blade parameter row is never mapped. ' +
      'The page also details a Standard Rotation and a 4 Iai Rotation (not transcribed).',
    steps: [
      { skillId: '1005206', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1005201',
        motionName: 'Basic Attack - Present Self Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: Basic 3 (pre-Ultimate, hence Present Self form).',
      },
      {
        skillId: '1005201',
        motionName: 'Heavy Attack - Frost Splinter: Present Self DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation as soon as possible via Ultimate (no cancel model; full motion scores).',
      },
      {
        skillId: '1005203',
        motionName: 'Foreclaiming: Inward Vision DMG',
        forteLevel: 10,
      },
      { skillId: '1005202', motionName: 'Frostblight: Jade Cleave DMG', forteLevel: 10 },
      { skillId: '1005202', motionName: 'Frostblight: Petalfall DMG', forteLevel: 10 },
      { skillId: '1005201', motionName: 'Basic Attack - Foreclaimed Self Stage 3 DMG', forteLevel: 10 },
      { skillId: '1005201', motionName: 'Basic Attack - Foreclaimed Self Stage 4 DMG', forteLevel: 10 },
      { skillId: '1005201', motionName: 'Basic Attack - Foreclaimed Self Stage 5 DMG', forteLevel: 10 },
      {
        skillId: '1005207',
        motionName: 'Basic Attack - Iai DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Iai (3 times), hit 1 of 3.',
      },
      {
        skillId: '1005207',
        motionName: 'Basic Attack - Iai DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Iai (3 times), hit 2 of 3.',
      },
      {
        skillId: '1005207',
        motionName: 'Basic Attack - Iai DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Iai (3 times), hit 3 of 3.',
      },
      { skillId: '1005201', motionName: 'Heavy Attack - Bitterfrost: Foreclaimed Self DMG', forteLevel: 10 },
      {
        skillId: '1005203',
        motionName: 'Foreclaiming: Blade Liberation Base DMG',
        forteLevel: 10,
        note: 'Guide: Hold Ultimate: Blade Liberation. Base row only; the per-Blade parameter row is never mapped.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005209', motionName: '', forteLevel: 10 },
    ],
  },
];
