import type { RotationPreset } from './rotationPresets.ts';

/**
 * Phrolova presets. Transcribed from Prydwen's Gameplay and teams >
 * Loop Rotation section (the rotation she will mainly use).
 */
export const PHROLOVA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'phrolova-prydwen-loop-rotation',
    characterId: 'phrolova',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/phrolova',
    notes:
      'Transcribed from the Gameplay and teams > Loop Rotation section (verified live 2026-09-19). ' +
      'Each "Forte: Basic OR Forte: Skill" line maps to Movement of Fate and Finality (the Boss-encounter ' +
      'branch; single-target scoring). ' +
      'Scarlet Coda maps to the damage row, never the per-Aftersound parameter row. ' +
      'Omitted: the "Ultimate" line (the cast enters Maestro, no snapshot damage row; Hecate off-field ' +
      'attacks are not guide steps); the Echo timing line (echo skill). ' +
      'The page also details an Opener Rotation (not transcribed).',
    steps: [
      // Guide: "Intro: Suite of Immortality" (the Enhanced Intro).
      { skillId: '1003706', motionName: 'Suite of Immortality DMG', forteLevel: 10 },
      // Guide: "Basic P3".
      { skillId: '1003701', motionName: 'Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1003707',
        motionName: 'Movement of Fate and Finality DMG',
        forteLevel: 10,
        note: 'Guide: "Forte: Basic OR Forte: Skill". Boss branch (see preset notes).',
      },
      // Guide: "Skill: Whispers in a Fleeting Dream".
      { skillId: '1003702', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1003707',
        motionName: 'Movement of Fate and Finality DMG',
        forteLevel: 10,
        note: 'Guide: "Forte: Basic OR Forte: Skill". Boss branch (see preset notes).',
      },
      // Guide: "Basic P1".
      { skillId: '1003701', motionName: 'Stage 1 DMG', forteLevel: 10 },
      // Guide: "Basic P2".
      { skillId: '1003701', motionName: 'Stage 2 DMG', forteLevel: 10 },
      // Guide: "Basic P3".
      { skillId: '1003701', motionName: 'Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1003707',
        motionName: 'Movement of Fate and Finality DMG',
        forteLevel: 10,
        note: 'Guide: "Forte: Basic OR Forte: Skill". Boss branch (see preset notes).',
      },
      // Guide: "Heavy: Scarlet Coda".
      { skillId: '1003701', motionName: 'Scarlet Coda DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003709', motionName: '', forteLevel: 10 },
    ],
  },
];
