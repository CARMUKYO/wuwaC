import type { RotationPreset } from './rotationPresets.ts';

/**
 * Lingyang presets. Transcribed from Prydwen's Gameplay and teams >
 * BURST COMBO section (the page's single step rotation).
 */
export const LINGYANG_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'lingyang-prydwen-burst-combo',
    characterId: 'lingyang',
    label: 'BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/lingyang',
    notes:
      'Transcribed from the Gameplay and teams > BURST COMBO section (verified live 2026-09-19). ' +
      'The aerial alternation maps to the forte snapshot motions (Feral Gyrate stages, Mountain Roamer, ' +
      'Stormy Kicks, Tail Strike). ' +
      'Omitted: the pre-combo Echo line (echo skill).',
    steps: [
      // Guide: "Intro".
      { skillId: '1001806', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Ultimate".
      { skillId: '1001803', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Heavy Attack: Glorious Plunge (Used to enter Forte and become airborne)".
      { skillId: '1001807', motionName: 'Glorious Plunge Damage', forteLevel: 10 },
      // Guide: "Basic Attack: Feral Gyrate P1".
      { skillId: '1001807', motionName: 'Feral Gyrate Stage 1 DMG', forteLevel: 10 },
      // Guide: "Skill: Mountain Roamer".
      { skillId: '1001807', motionName: 'Mountain Roamer Damage', forteLevel: 10 },
      // Guide: "Basic Attack: Feral Gyrate P2".
      { skillId: '1001807', motionName: 'Feral Gyrate Stage 2 DMG', forteLevel: 10 },
      // Guide: "Skill: Mountain Roamer".
      { skillId: '1001807', motionName: 'Mountain Roamer Damage', forteLevel: 10 },
      // Guide: "Basic Attack: Feral Gyrate P1".
      { skillId: '1001807', motionName: 'Feral Gyrate Stage 1 DMG', forteLevel: 10 },
      // Guide: "Skill: Mountain Roamer".
      { skillId: '1001807', motionName: 'Mountain Roamer Damage', forteLevel: 10 },
      // Guide: "Basic Attack: Feral Gyrate P2".
      { skillId: '1001807', motionName: 'Feral Gyrate Stage 2 DMG', forteLevel: 10 },
      // Guide: "Skill: Mountain Roamer".
      { skillId: '1001807', motionName: 'Mountain Roamer Damage', forteLevel: 10 },
      // Guide: "Basic Attack: Feral Gyrate P1".
      { skillId: '1001807', motionName: 'Feral Gyrate Stage 1 DMG', forteLevel: 10 },
      // Guide: "Basic Attack: Stormy Kicks".
      { skillId: '1001807', motionName: 'Stormy Kicks Damage', forteLevel: 10 },
      // Guide: "Mid-Air Attack: Tail Strike".
      { skillId: '1001807', motionName: 'Tail Strike Damage', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001809', motionName: '', forteLevel: 10 },
    ],
  },
];
