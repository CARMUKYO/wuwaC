import type { RotationPreset } from './rotationPresets.ts';

/**
 * Suisui presets. Transcribed from the Rotation & Gameplay section, Loop
 * Rotation — the variant used whenever an Intro is available (verified
 * live 2026-09-19). The Liberation step is healing-only in the snapshot,
 * so it is omitted per the no-healing-rows rule; the Forbidden Bastion
 * summon is omitted as user echo-dependent. The page also details an
 * Opener Rotation, an S3+ Rotation, and a Heavy-attack Drizzle variant
 * (not transcribed).
 */
export const SUISUI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'suisui-prydwen-loop',
    characterId: 'suisui',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/suisui',
    notes:
      'Transcribed from the Rotation & Gameplay section, Loop Rotation (verified live 2026-09-19). ' +
      'Omitted: the Liberation step (healing-only snapshot row) and the Forbidden Bastion summon (user echo-dependent). ' +
      'The page also details an Opener Rotation, an S3+ Rotation, and a Heavy-attack Drizzle variant (not transcribed).',
    steps: [
      { skillId: '1005706', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1005702', motionName: 'Resonance Skill - Drizzle Stance DMG', forteLevel: 10 },
      { skillId: '1005707', motionName: 'Basic Attack - Drizzle Stance Stage 1 DMG', forteLevel: 10 },
      { skillId: '1005707', motionName: 'Basic Attack - Drizzle Stance Stage 2 DMG', forteLevel: 10 },
      { skillId: '1005707', motionName: 'Basic Attack - Drizzle Stance Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1005707',
        motionName: 'Basic Attack - Drizzle Stance Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005709', motionName: '', forteLevel: 10 },
    ],
  },
];
