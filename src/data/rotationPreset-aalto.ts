import type { RotationPreset } from './rotationPresets.ts';

/**
 * Aalto presets. Transcribed from Prydwen's Gameplay and teams > Rotation
 * section (single rotation presented; the guide explicitly opts for no
 * Forte rotation).
 */
export const AALTO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'aalto-prydwen-rotation',
    characterId: 'aalto',
    label: 'Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/aalto',
    notes:
      'Transcribed from the Gameplay and teams > Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Echo step (echo-skill, user echo-dependent). ' +
      'The opening Skill is the guide-ordered pre-cast during another character rotation, kept as an Aalto block. ' +
      'The page presents a single rotation; Forte weaving is left optional by the guide (not transcribed).',
    steps: [
      {
        skillId: '1001002',
        motionName: 'Mist Bullet Damage',
        forteLevel: 10,
        note: 'Guide: Skill: Mist Avatar, pre-cast during another character rotation to allow cooldown.',
      },
      { skillId: '1001006', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1001003', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001002',
        motionName: 'Mist Bullet Damage',
        forteLevel: 10,
        note: 'Guide: Skill: Mist Avatar (can be used after Basic Attacks if still on cooldown).',
      },
      { skillId: '1001001', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1001001', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1001001', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1001001', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1001001', motionName: 'Stage 5 DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001009', motionName: '', forteLevel: 10 },
    ],
  },
];
