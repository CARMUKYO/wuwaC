import type { RotationPreset } from './rotationPresets.ts';

/**
 * Sigrika presets. Transcribed from the Rotation & How to Play section,
 * Standard Rotation (verified live 2026-09-19). The Chain Whip / Outburst
 * steps use the matching Runic forte rows (forte skill prose); the Hold
 * Skill step uses the forte Learn My True Name row. The Echo summon timing
 * is omitted as user echo-dependent. The page also details a Double
 * Outburst opener/loop (not transcribed).
 */
export const SIGRIKA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'sigrika-prydwen-standard',
    characterId: 'sigrika',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/sigrika',
    notes:
      'Transcribed from the Rotation & How to Play section, Standard Rotation (verified live 2026-09-19). ' +
      'Omitted: the Echo summon timing (user echo-dependent). ' +
      'The page also details a Double Outburst opener/loop (not transcribed).',
    steps: [
      { skillId: '1005106', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack Stage 4 DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack - Elucidated DMG', forteLevel: 10 },
      {
        skillId: '1005107',
        motionName: 'Runic Chain Whip DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation on hit via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1005103', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack Stage 2 DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack Stage 4 DMG', forteLevel: 10 },
      { skillId: '1005101', motionName: 'Basic Attack - Elucidated DMG', forteLevel: 10 },
      {
        skillId: '1005107',
        motionName: 'Runic Outburst DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation on hit via Hold Skill (no cancel model; full motion scores).',
      },
      { skillId: '1005107', motionName: 'Forte Circuit - Learn My True Name DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005109', motionName: '', forteLevel: 10 },
    ],
  },
];
