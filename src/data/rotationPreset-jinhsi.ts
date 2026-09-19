import type { RotationPreset } from './rotationPresets.ts';

/**
 * Jinhsi presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Standard Rotation & Opener > Loop Rotation section (the steady-state cycle).
 */
export const JINHSI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'jinhsi-prydwen-loop-rotation',
    characterId: 'jinhsi',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/jinhsi',
    notes:
      'Transcribed from the Rotation & Gameplay > Standard Rotation & Opener > Loop Rotation section ' +
      '(verified live 2026-09-19). Both Jinhsi passes are kept; the teammate interlude between them ' +
      '("Complete another rotation of your 2nd character here") is omitted. ' +
      'Each "Skill: Illuminous Epiphany" line expands to its two snapshot rows (Solar Flare + Stella Glamor, ' +
      'a single cast); the Incandescence empowerment of Stella Glamor is unscored (no stack model). ' +
      'Omitted: the freely-timed Jué echo summon (echo skill). ' +
      'The page also details an Opener plus Advanced/Expert optimization variants (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1002006', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Skill: Overflowing Radiance".
      { skillId: '1002002', motionName: 'Overflowing Radiance DMG', forteLevel: 10 },
      // Guide: "Ultimate".
      { skillId: '1002003', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Incarnation: Skill: Crescent Divinity".
      { skillId: '1002007', motionName: 'Crescent Divinity DMG', forteLevel: 10 },
      // Guide: "Incarnation: Basic P1".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 1 DMG', forteLevel: 10 },
      // Guide: "Incarnation: Basic P2".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 2 DMG', forteLevel: 10 },
      // Guide: "Incarnation: Basic P3".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 3 DMG', forteLevel: 10 },
      // Guide: "Incarnation: Basic P4".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 4 DMG', forteLevel: 10 },
      // Guide: "Skill: Illuminous Epiphany" (single cast, two snapshot rows).
      { skillId: '1002007', motionName: 'Illuminous Epiphany: Solar Flare DMG', forteLevel: 10 },
      { skillId: '1002007', motionName: 'Illuminous Epiphany: Stella Glamor DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002009', motionName: '', forteLevel: 10 },
      // Guide (second pass): "Intro".
      { skillId: '1002006', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide (second pass): "Skill: Overflowing Radiance".
      { skillId: '1002002', motionName: 'Overflowing Radiance DMG', forteLevel: 10 },
      // Guide (second pass): "Incarnation: Skill: Crescent Divinity".
      { skillId: '1002007', motionName: 'Crescent Divinity DMG', forteLevel: 10 },
      // Guide (second pass): "Incarnation: Basic P1".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 1 DMG', forteLevel: 10 },
      // Guide (second pass): "Incarnation: Basic P2".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 2 DMG', forteLevel: 10 },
      // Guide (second pass): "Incarnation: Basic P3".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 3 DMG', forteLevel: 10 },
      // Guide (second pass): "Incarnation: Basic P4".
      { skillId: '1002007', motionName: 'Incarnation - Basic Attack 4 DMG', forteLevel: 10 },
      // Guide (second pass): "Skill: Illuminous Epiphany" (single cast, two snapshot rows).
      { skillId: '1002007', motionName: 'Illuminous Epiphany: Solar Flare DMG', forteLevel: 10 },
      { skillId: '1002007', motionName: 'Illuminous Epiphany: Stella Glamor DMG', forteLevel: 10 },
      // Guide (second pass): "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002009', motionName: '', forteLevel: 10 },
    ],
  },
];
