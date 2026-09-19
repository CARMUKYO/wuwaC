import type { RotationPreset } from './rotationPresets.ts';

/**
 * Chisa presets. Transcribed from Prydwen's Rotation & Gameplay > Loop
 * Rotation (the repeating rotation; the Opener is first-cycle-only).
 */
export const CHISA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'chisa-prydwen-loop-rotation',
    characterId: 'chisa',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/chisa',
    notes:
      'Transcribed from the Rotation & Gameplay > Loop Rotation section (verified live 2026-09-19). ' +
      'Echo timing is prose-only (not a listed step). ' +
      'Death Snip maps to the base row only: the guide Tips state the partial interruption lands 2 of 3 hits and ignores Additional Multipliers (full motion scores). ' +
      'Healing rows and the per-Ring parameter row are never mapped: Ultimate maps to Skill DMG, Eradication to the base Sawring - Eradication row. ' +
      'The page also details an Opener Rotation (not transcribed).',
    steps: [
      { skillId: '1004206', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1004201', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004201', motionName: 'Rending Lunge DMG', forteLevel: 10 },
      {
        skillId: '1004201',
        motionName: 'Death Snip DMG',
        forteLevel: 10,
        note: 'Guide: partial animation interruption via Ultimate (2 of 3 hits land; no cancel model; full motion scores).',
      },
      { skillId: '1004203', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1004202', motionName: 'Serrated Loop DMG', forteLevel: 10 },
      { skillId: '1004207', motionName: 'Sawring - Blitz Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004207', motionName: 'Sawring - Blitz Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1004207',
        motionName: 'Sawring - Eradication DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Eradication (Swap). Base row only; the per-Ring parameter row is never mapped.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004209', motionName: '', forteLevel: 10 },
    ],
  },
];
