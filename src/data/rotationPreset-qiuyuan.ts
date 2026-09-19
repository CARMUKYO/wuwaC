import type { RotationPreset } from './rotationPresets.ts';

/**
 * Qiuyuan presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Standard Hybrid Rotation (S0-S2) section (the main rotation).
 */
export const QIUYUAN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'qiuyuan-prydwen-standard-hybrid-rotation-s0-s2',
    characterId: 'qiuyuan',
    label: 'Standard Hybrid Rotation (S0-S2)',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/qiuyuan',
    notes:
      'Transcribed from the Rotation & Gameplay > Standard Hybrid Rotation (S0-S2) section ' +
      '(verified live 2026-09-19). ' +
      'Post-Intro Inkwash 3/4 map to the Thus Spoke the Blade forte rows. ' +
      'The OPTIONAL Skill line is kept (base Through the Groves cast) with its optionality noted, ' +
      'since the guide sequences it with a cancel into the Ultimate. ' +
      'Omitted: the Echo timing lines (echo skills, prose-only). ' +
      'The page also details an S3+ DPS Rotation (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1004106', motionName: 'Skill Damage', forteLevel: 10 },
      // Guide: "Basic: Inkwash 3" (a forte-skill row).
      { skillId: '1004107', motionName: 'Thus Spoke the Blade: Inkwash Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1004107',
        motionName: 'Thus Spoke the Blade: Inkwash Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: "Basic: Inkwash 4 (OPTIONAL: Cancel animation endlag via Skill)" (no cancel model; full motion scores).',
      },
      {
        skillId: '1004102',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: "OPTIONAL: Skill (Cancel animation endlag via Ultimate)". Optional per the guide (mostly optimal in Quickswap); cancel unscored, full motion scores.',
      },
      // Guide: "Ultimate".
      { skillId: '1004103', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Heavy: To Teach".
      { skillId: '1004107', motionName: 'Thus Spoke the Blade: To Teach DMG', forteLevel: 10 },
      // Guide: "Heavy: To Save".
      { skillId: '1004107', motionName: 'Thus Spoke the Blade: To Save DMG', forteLevel: 10 },
      // Guide: "Heavy: To Sacrifice".
      { skillId: '1004107', motionName: 'Thus Spoke the Blade: To Sacrifice DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004109', motionName: '', forteLevel: 10 },
    ],
  },
];
