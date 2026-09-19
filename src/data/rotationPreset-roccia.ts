import type { RotationPreset } from './rotationPresets.ts';

/**
 * Roccia presets. Transcribed from the Rotation & Gameplay section, Standard
 * Rotation (verified live 2026-09-19). Same-character damage only: the Echo
 * step and the non-damaging Dash are omitted. The page also details an S1+
 * Hybrid Rotation and an S6 Main DPS Rotation (not transcribed).
 */
export const ROCCIA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'roccia-prydwen-standard',
    characterId: 'roccia',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/roccia',
    notes:
      'Transcribed from the Rotation & Gameplay section, Standard Rotation (verified live 2026-09-19). ' +
      'Omitted: the Echo (Swap) step (user echo-dependent) and the non-damaging Dash. ' +
      'The page also details an S1+ Hybrid Rotation and an S6 Main DPS Rotation (not transcribed).',
    steps: [
      { skillId: '1002706', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002701',
        motionName: 'Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1002703', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002702',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: interrupt animation via Dash on 1st hit (no cancel model; full motion scores).',
      },
      { skillId: '1002707', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1002707', motionName: 'Stage 2 DMG', forteLevel: 10 },
      {
        skillId: '1002707',
        motionName: 'Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Echo (no cancel model; full motion scores).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002709', motionName: '', forteLevel: 10 },
    ],
  },
];
