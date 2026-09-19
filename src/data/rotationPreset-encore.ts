import type { RotationPreset } from './rotationPresets.ts';

/**
 * Encore presets. Transcribed from Prydwen's Rotation > EASY & BASIC BURST
 * COMBO (the page's easy combo; Advanced and No Forte are mechanical /
 * theoretical-best variants).
 */
export const ENCORE_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'encore-prydwen-easy-basic-burst-combo',
    characterId: 'encore',
    label: 'EASY & BASIC BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/encore',
    notes:
      'Transcribed from the Rotation > EASY & BASIC BURST COMBO section (verified live 2026-09-19). ' +
      'Omitted: the opening Echo step (echo-skill, user echo-dependent); the bare Ultimate transform line (liberation prose names no transform-cast damage row; liberation damage scores via Rampage + Frolicking). ' +
      'The page also details WARM UP guidance, an ADVANCED BURST COMBO, and a No Forte Rotation (not transcribed).',
    steps: [
      { skillId: '1000706', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos Rampage Damage', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos: Frolicking Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos: Frolicking Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos: Frolicking Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos Rampage Damage', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos: Frolicking Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos: Frolicking Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos: Frolicking Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1000703', motionName: 'Cosmos Rampage Damage', forteLevel: 10 },
      {
        skillId: '1000707',
        motionName: 'Cosmos Rupture Damage',
        forteLevel: 10,
        note: 'Guide: Heavy ATK: Cosmos: Rupture (swap-cancel the moment Encore begins channelling).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000709', motionName: '', forteLevel: 10 },
    ],
  },
];
