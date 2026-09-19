import type { RotationPreset } from './rotationPresets.ts';

/**
 * Cantarella presets. Transcribed from Prydwen's Rotation > Standard
 * Rotation (the page's single rotation).
 */
export const CANTARELLA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'cantarella-prydwen-standard-rotation',
    characterId: 'cantarella',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/cantarella',
    notes:
      'Transcribed from the Rotation > Standard Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Echo step (echo-skill, user echo-dependent). ' +
      'Judgment: the guide "Phantom String P1/P2/P3" lines map to the snapshot "Phantom Sting Stage 1/2/3 DMG" rows (guide/snapshot name mismatch). ' +
      'Intro, Ultimate, and Flickering Reverie map to their single guide-named rows; follow-up rows (Tidal Surge, Diffusion, Jolt) are not enumerated by the guide. ' +
      'Healing rows are never mapped: Perception Drain maps to Perception Drain DMG. ' +
      'The page presents a single rotation.',
    steps: [
      { skillId: '1003106', motionName: 'Ripple DMG', forteLevel: 10 },
      { skillId: '1003101', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1003102', motionName: 'Graceful Step DMG', forteLevel: 10 },
      { skillId: '1003103', motionName: 'Flowing Suffocation DMG', forteLevel: 10 },
      { skillId: '1003101', motionName: 'Delusive Dive DMG', forteLevel: 10 },
      { skillId: '1003102', motionName: 'Flickering Reverie DMG', forteLevel: 10 },
      {
        skillId: '1003107',
        motionName: 'Phantom Sting Stage 1 DMG',
        forteLevel: 10,
        note: 'Guide: Forte: Phantom String P1 (snapshot names it Phantom Sting).',
      },
      {
        skillId: '1003107',
        motionName: 'Phantom Sting Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: Forte: Phantom String P2 (snapshot names it Phantom Sting).',
      },
      {
        skillId: '1003107',
        motionName: 'Phantom Sting Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: Forte: Phantom String P3 (snapshot names it Phantom Sting).',
      },
      { skillId: '1003107', motionName: 'Perception Drain DMG', forteLevel: 10 },
      // Guide: "Outro Skill". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003109', motionName: '', forteLevel: 10 },
    ],
  },
];
