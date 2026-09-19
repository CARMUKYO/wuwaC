import type { RotationPreset } from './rotationPresets.ts';

/**
 * Calcharo presets. Transcribed from Prydwen's Rotation > BASIC BURST COMBO
 * (the page's easy combo; the optimized/4-Messenger variants need dash
 * cancels).
 */
export const CALCHARO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'calcharo-prydwen-basic-burst-combo',
    characterId: 'calcharo',
    label: 'BASIC BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/calcharo',
    notes:
      'Transcribed from the Rotation > BASIC BURST COMBO section (verified live 2026-09-19). ' +
      'Omitted: the opening Echo step (echo-skill, user echo-dependent). ' +
      'The page also details WARM UP options, an OPTIMIZED BURST COMBO, and a 4 DEATH MESSENGER COMBO (not transcribed).',
    steps: [
      { skillId: '1001406', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001407',
        motionName: '"Death Messenger" Damage',
        forteLevel: 10,
        note: 'Guide: Heavy ATK: Death Messenger (optionally swap cancel).',
      },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 1', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 2', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 3', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 4', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 5', forteLevel: 10 },
      {
        skillId: '1001407',
        motionName: '"Death Messenger" Damage',
        forteLevel: 10,
        note: 'Guide: Heavy ATK: Death Messenger (swap cancel if you can).',
      },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 1', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 2', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 3', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 4', forteLevel: 10 },
      { skillId: '1001403', motionName: 'Hounds Roar Stage 5', forteLevel: 10 },
      {
        skillId: '1001407',
        motionName: '"Death Messenger" Damage',
        forteLevel: 10,
        note: 'Guide: Heavy ATK: Death Messenger (swap cancel if you can).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001409', motionName: '', forteLevel: 10 },
    ],
  },
];
