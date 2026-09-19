import type { RotationPreset } from './rotationPresets.ts';

/**
 * Rover: Havoc presets. Transcribed from the Rotation section, SHORT BURST
 * COMBO — the page's shortest self-contained burst combo (verified live
 * 2026-09-19). Rover variants live on split Prydwen pages; this preset is
 * from the Rover (Havoc) page. Same-character damage only: the Echo step
 * is omitted. The page also details a WARM UP, a MEDIUM BURST COMBO, and a
 * LONG BURST COMBO (not transcribed).
 */
export const ROVER_HAVOC_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'rover-havoc-prydwen-short-burst',
    characterId: 'rover-havoc',
    label: 'SHORT BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/rover-havoc',
    notes:
      'Transcribed from the Rotation section, SHORT BURST COMBO (verified live 2026-09-19). ' +
      'Omitted: the Echo (Dreamless Swap Cancel) step (user echo-dependent). ' +
      'The page also details a WARM UP, a MEDIUM BURST COMBO, and a LONG BURST COMBO (not transcribed).',
    steps: [
      { skillId: '1001706', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1001702', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1001707', motionName: 'Devastation Damage', forteLevel: 10 },
      {
        skillId: '1001707',
        motionName: 'Umbra: Lifetaker Damage',
        forteLevel: 10,
        note: 'Guide: optionally Swap Cancel (no cancel model; full motion scores).',
      },
      { skillId: '1001703', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001709', motionName: '', forteLevel: 10 },
    ],
  },
];
