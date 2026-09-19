import type { RotationPreset } from './rotationPresets.ts';

/**
 * Youhu presets. Transcribed from the Rotation section, Rotation 1 — the
 * variant the page says loops indefinitely (verified live 2026-09-19).
 * Judgment call: the guide never names which Antique is appraised, so all
 * three appraisal steps use Ruyi DMG — the higher-multiplier appraisal
 * (skill prose: "Ruyi has a higher DMG Multiplier"), a reasonable
 * stand-in where the guide treats all four interchangeably. Poetic
 * Essence is not reached in Rotation 1. The page also details a
 * Rotation 2 (not transcribed).
 */
export const YOUHU_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'youhu-prydwen-rotation-1',
    characterId: 'youhu',
    label: 'Rotation 1',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/youhu',
    notes:
      'Transcribed from the Rotation section, Rotation 1, 6.5s (verified live 2026-09-19). ' +
      'Antique Appraisal steps use Ruyi DMG: the guide names no antique, and Ruyi is the higher-multiplier appraisal with reliable Basic connects. ' +
      'Starting Auspice (0-1) is a precondition, not a step. ' +
      'The page also details a Rotation 2 (not transcribed).',
    steps: [
      { skillId: '1002406', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002402',
        motionName: 'Ruyi DMG',
        forteLevel: 10,
        note: 'Guide: Antique Appraisal, instant cancel (no cancel model; full motion scores). Antique unnamed by the guide; Ruyi picked per file notes.',
      },
      { skillId: '1002403', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002402',
        motionName: 'Ruyi DMG',
        forteLevel: 10,
        note: 'Guide: Antique Appraisal. Antique unnamed by the guide; Ruyi picked per file notes.',
      },
      { skillId: '1002401', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1002401', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1002401', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1002401', motionName: 'Stage 4 DMG', forteLevel: 10 },
      // Guide: "Skill". Healing row omitted per the no-healing-rows rule.
      { skillId: '1002402', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002402',
        motionName: 'Ruyi DMG',
        forteLevel: 10,
        note: 'Guide: Antique Appraisal. Antique unnamed by the guide; Ruyi picked per file notes.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002409', motionName: '', forteLevel: 10 },
    ],
  },
];
