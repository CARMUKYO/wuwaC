import type { RotationPreset } from './rotationPresets.ts';

/**
 * Iuno presets. Transcribed from Prydwen's Rotation & How to play section;
 * Moonbow/Arc steps use the Enhanced snapshot motions (see preset notes).
 */
export const IUNO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'iuno-prydwen-standard-hybrid-rotation',
    characterId: 'iuno',
    label: 'Standard Hybrid Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/iuno',
    notes:
      'Transcribed from the Rotation & How to play section (verified live 2026-09-19). ' +
      'Moonbow Basic 1/2 and Arc Beyond the Edge map to the Enhanced snapshot motions: the guide abuses ' +
      'Sentience enhancement throughout its rotations, and the forte prose states New Moon attacks consume ' +
      'Sentience to increase the DMG Multiplier. ' +
      'Omitted: the conditional Moonlit Clouds Echo step (echo skill); the movement-only Dash steps (no snapshot motion); ' +
      'the teammate swap after Absolute Fullness. ' +
      'The page also details Semi-DPS, Main DPS, and S6 DPS rotations (not transcribed), plus a no-Intro variant ' +
      '(replace Intro by Skill).',
    steps: [
      // Guide: "Intro".
      { skillId: '1003806', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1003802',
        motionName: 'Closing Refrain DMG',
        forteLevel: 10,
        note: 'Guide: instantly interrupt via Echo/Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Ultimate".
      { skillId: '1003803', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1003807',
        motionName: 'Flux - Moonbow DMG',
        forteLevel: 10,
        note: 'Guide: Jump Flux - Moonbow, instantly interrupt via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Basic: Moonbow Basic 1".
      { skillId: '1003807', motionName: 'Enhanced Moonbow - Basic Attack 1 DMG', forteLevel: 10 },
      {
        skillId: '1003807',
        motionName: 'Enhanced Moonbow - Basic Attack 2 DMG',
        forteLevel: 10,
        note: 'Guide: interrupt on 1st hit via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1003807',
        motionName: 'Enhanced Arc Beyond the Edge DMG',
        forteLevel: 10,
        note: 'Guide: animation-cancel after projectiles fired by Dash (no cancel model; full motion scores).',
      },
      // Guide: "Basic: Moonbow Basic 1".
      { skillId: '1003807', motionName: 'Enhanced Moonbow - Basic Attack 1 DMG', forteLevel: 10 },
      {
        skillId: '1003807',
        motionName: 'Enhanced Moonbow - Basic Attack 2 DMG',
        forteLevel: 10,
        note: 'Guide: interrupt on 1st hit via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1003807',
        motionName: 'Enhanced Arc Beyond the Edge DMG',
        forteLevel: 10,
        note: 'Guide: animation-cancel after projectiles fired by Heavy (no cancel model; full motion scores).',
      },
      {
        skillId: '1003807',
        motionName: 'Absolute Fullness DMG',
        forteLevel: 10,
        note: 'Guide: Swap to a teammate after (teammate action omitted).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003809', motionName: '', forteLevel: 10 },
    ],
  },
];
