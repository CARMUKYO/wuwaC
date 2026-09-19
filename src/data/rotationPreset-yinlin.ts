import type { RotationPreset } from './rotationPresets.ts';

/**
 * Yinlin presets. Transcribed from the Rotation section, STANDARD
 * ROTATION (verified live 2026-09-19). The listed hits map directly;
 * Execution Mode Electromagnetic Blast triggers and Punishment Mark
 * Judgement Strikes are not separately listed rotation steps, so they are
 * not added. The Echo timing is omitted as user echo-dependent. No other
 * rotation is detailed on the page.
 */
export const YINLIN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'yinlin-prydwen-standard',
    characterId: 'yinlin',
    label: 'STANDARD ROTATION',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/yinlin',
    notes:
      'Transcribed from the Rotation section, STANDARD ROTATION (verified live 2026-09-19). ' +
      'Electromagnetic Blast / Judgement Strike triggers are not listed steps, so they are not added. ' +
      'Omitted: the Echo timing (user echo-dependent). ' +
      'No other rotation is detailed on the page.',
    steps: [
      { skillId: '1001506', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001501',
        motionName: 'Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: optionally Swap Cancel (no cancel model; full motion scores).',
      },
      { skillId: '1001502', motionName: 'Magnetic Roar Damage', forteLevel: 10 },
      { skillId: '1001501', motionName: 'Heavy Attack DMG', forteLevel: 10 },
      {
        skillId: '1001502',
        motionName: 'Lightning Execution Damage',
        forteLevel: 10,
        note: 'Guide: try to cancel the Heavy Attack endlag (no cancel model; full motion scores).',
      },
      {
        skillId: '1001503',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: use right as Yinlin lands.',
      },
      { skillId: '1001501', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1001507', motionName: 'Chameleon Cipher Damage', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001509', motionName: '', forteLevel: 10 },
    ],
  },
];
