import type { RotationPreset } from './rotationPresets.ts';

/**
 * Taoqi presets. Transcribed from the Rotation section, SAMPLE TAOQI
 * ROTATION (verified live 2026-09-19), including the guide's pre-rotation
 * basics. The Echo Usage guidance is omitted as user echo-dependent. No
 * other rotation is detailed on the page.
 */
export const TAOQI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'taoqi-prydwen-sample',
    characterId: 'taoqi',
    label: 'SAMPLE TAOQI ROTATION',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/taoqi',
    notes:
      'Transcribed from the Rotation section, SAMPLE TAOQI ROTATION (verified live 2026-09-19). ' +
      'Omitted: the Echo Usage guidance (user echo-dependent). ' +
      'No other rotation is detailed on the page.',
    steps: [
      {
        skillId: '1000901',
        motionName: 'Stage 1 DMG',
        forteLevel: 10,
        note: 'Guide: pre-rotation Concerto builder; skippable with a Concerto weapon.',
      },
      {
        skillId: '1000901',
        motionName: 'Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: pre-rotation Concerto builder; skippable with a Concerto weapon.',
      },
      {
        skillId: '1000901',
        motionName: 'Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: pre-rotation Concerto builder; skippable with a Concerto weapon.',
      },
      { skillId: '1000906', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000907', motionName: 'Timed Counters Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000907', motionName: 'Timed Counters Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000907', motionName: 'Timed Counters Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000903', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000901', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000901', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000901', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000901', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1000902', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000909', motionName: '', forteLevel: 10 },
    ],
  },
];
