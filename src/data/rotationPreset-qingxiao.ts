import type { RotationPreset } from './rotationPresets.ts';

/**
 * Qingxiao presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Standard Rotation section (the page's single step rotation).
 */
export const QINGXIAO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'qingxiao-prydwen-standard',
    characterId: 'qingxiao',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/qingxiao',
    notes:
      'Transcribed from the Rotation & Gameplay > Standard Rotation section (verified live 2026-09-19). ' +
      'The guide labels the Stringblade stages "Heavy" (held inputs); they map to the basic-skill snapshot rows. ' +
      'Omitted: the pre-Outro Echo line (echo skill, swap-cancelled).',
    steps: [
      // Guide: "Intro".
      { skillId: '1005806', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Heavy: Stringblade Mid-air 1" (a basic-skill row).
      { skillId: '1005801', motionName: 'Mid-air Attack - Stringblade Stage 1 DMG', forteLevel: 10 },
      // Guide: "Heavy: Stringblade Mid-air 2" (a basic-skill row).
      { skillId: '1005801', motionName: 'Mid-air Attack - Stringblade Stage 2 DMG', forteLevel: 10 },
      // Guide: "Heavy: Stringblade Mid-air 3" (a basic-skill row).
      { skillId: '1005801', motionName: 'Mid-air Attack - Stringblade Stage 3 DMG', forteLevel: 10 },
      // Guide: "Heavy: Stringblade Basic 3" (a basic-skill row).
      { skillId: '1005801', motionName: 'Basic Attack - Stringblade Stage 3 DMG', forteLevel: 10 },
      // Guide: "Heavy: Stringblade Basic 4" (a basic-skill row).
      { skillId: '1005801', motionName: 'Basic Attack - Stringblade Stage 4 DMG', forteLevel: 10 },
      // Guide: "Skill: Judgement".
      { skillId: '1005802', motionName: 'Severing Note: Judgement DMG', forteLevel: 10 },
      // Guide: "Heavy: Stringblade".
      { skillId: '1005801', motionName: 'Heavy Attack - Stringblade DMG', forteLevel: 10 },
      // Guide: "Heavy: Transcendence 1".
      { skillId: '1005807', motionName: 'Basic Attack - Ephemeral Transcendence Stage 1 DMG', forteLevel: 10 },
      // Guide: "Heavy: Transcendence 2".
      { skillId: '1005807', motionName: 'Basic Attack - Ephemeral Transcendence Stage 2 DMG', forteLevel: 10 },
      // Guide: "Heavy: Transcendence 3".
      { skillId: '1005807', motionName: 'Basic Attack - Ephemeral Transcendence Stage 3 DMG', forteLevel: 10 },
      // Guide: "Heavy: Transcendence 4".
      { skillId: '1005807', motionName: 'Basic Attack - Ephemeral Transcendence Stage 4 DMG', forteLevel: 10 },
      // Guide: "Heavy: Heaven's Reckoning".
      { skillId: '1005807', motionName: "Heaven's Reckoning: Ephemeral Transcendence DMG", forteLevel: 10 },
      // Guide: "Ultimate".
      { skillId: '1005803', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005809', motionName: '', forteLevel: 10 },
    ],
  },
];
