import type { RotationPreset } from './rotationPresets.ts';

/**
 * Jiyan presets. Transcribed from Prydwen's Gameplay and teams > BURST COMBO
 * section (the main step rotation; the WARM UP lines are prose priorities).
 */
export const JIYAN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'jiyan-prydwen-burst-combo',
    characterId: 'jiyan',
    label: 'BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/jiyan',
    notes:
      'Transcribed from the Gameplay and teams > BURST COMBO section (verified live 2026-09-19). ' +
      'Omitted: the pre-combo Echo line (echo skill); the "Forte: Emerald Storm" stance-entry line ' +
      '(no snapshot cast motion; Lance damage scores via the Lance stages below). ' +
      'The page also details a DOUBLE DRAGON COMBO variant (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1001106', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001103',
        motionName: 'Lance of Qingloong Stage 1 DMG',
        forteLevel: 10,
        note: 'Guide: interrupt as fast as possible using Resonance Skill (no cancel model; full motion scores).',
      },
      // Guide: "Resonance Skill".
      { skillId: '1001102', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Lance of Qinqlong P1".
      { skillId: '1001103', motionName: 'Lance of Qingloong Stage 1 DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Lance of Qinqlong P2".
      { skillId: '1001103', motionName: 'Lance Of Qingloong Stage 2 DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Lance of Qinqlong P3".
      { skillId: '1001103', motionName: 'Lance Of Qingloong Stage 3 DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Lance of Qinqlong P1".
      { skillId: '1001103', motionName: 'Lance of Qingloong Stage 1 DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Lance of Qinqlong P2".
      { skillId: '1001103', motionName: 'Lance Of Qingloong Stage 2 DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Lance of Qinqlong P3".
      { skillId: '1001103', motionName: 'Lance Of Qingloong Stage 3 DMG', forteLevel: 10 },
      // Guide: "Resonance Skill".
      { skillId: '1001102', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001109', motionName: '', forteLevel: 10 },
    ],
  },
];
