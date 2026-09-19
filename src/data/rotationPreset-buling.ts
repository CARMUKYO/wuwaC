import type { RotationPreset } from './rotationPresets.ts';

/**
 * Buling presets. Transcribed from Prydwen's Rotation > Opener Rotation
 * (the unconditional full rotation; the Loop variant needs an Intro
 * available).
 */
export const BULING_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'buling-prydwen-opener-rotation',
    characterId: 'buling',
    label: 'Opener Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/buling',
    notes:
      'Transcribed from the Rotation > Opener Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Heavy: Twin Thunders line (healing-only row, never mapped); ' +
      'Echo timing is prose-only (right before Outro, not a listed step). ' +
      'Skill maps to the Thunder Talisman cast row; Pull-in continuous hits are not enumerated by the guide. ' +
      'The page also details a Loop Rotation (not transcribed).',
    steps: [
      { skillId: '1004301', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1004301', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004301', motionName: 'Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1004301',
        motionName: 'Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: Basic 4, cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      { skillId: '1004302', motionName: 'Thunder Talisman DMG', forteLevel: 10 },
      { skillId: '1004301', motionName: 'Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1004301',
        motionName: 'Heavy Attack - Mountain Over Thunder DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      {
        skillId: '1004307',
        motionName: 'Flashing Thunder Spell - Harmony DMG',
        forteLevel: 10,
        note: 'Guide: Ultimate: Flashing Thunder Spell - Harmony (enhanced cast; the guide names the Harmony row).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004309', motionName: '', forteLevel: 10 },
    ],
  },
];
