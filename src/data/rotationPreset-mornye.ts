import type { RotationPreset } from './rotationPresets.ts';

/**
 * Mornye presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Loop Rotation section (the steady-state cycle).
 */
export const MORNYE_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'mornye-prydwen-loop-rotation',
    characterId: 'mornye',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/mornye',
    notes:
      'Transcribed from the Rotation & Gameplay > Loop Rotation section (verified live 2026-09-19). ' +
      '"Skill: Distributed Array" maps to the damage row, never the healing row. ' +
      'Omitted: the Echo timing lines (echo skill, prose-only). ' +
      'The page also details an Opener Rotation and a Loop Forte Skip Rotation (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1004406', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Basic: Wide Field 1".
      { skillId: '1004401', motionName: 'Basic Attack - Wide Field Observation Mode Stage 1 DMG', forteLevel: 10 },
      // Guide: "Basic: Wide Field 2".
      { skillId: '1004401', motionName: 'Basic Attack - Wide Field Observation Mode Stage 2 DMG', forteLevel: 10 },
      {
        skillId: '1004401',
        motionName: 'Basic Attack - Wide Field Observation Mode Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation on hit via Skill (no cancel model; full motion scores).',
      },
      // Guide: "Skill: Distributed Array".
      { skillId: '1004402', motionName: 'Distributed Array DMG', forteLevel: 10 },
      {
        skillId: '1004407',
        motionName: 'Heavy Attack - Inversion DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag on hit via Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Ultimate".
      { skillId: '1004403', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004409', motionName: '', forteLevel: 10 },
    ],
  },
];
