import type { RotationPreset } from './rotationPresets.ts';

/**
 * Carlotta presets. Transcribed from Prydwen's Rotation > Burst Rotation
 * (the page's main rotation; Warm Up is conditional setup).
 */
export const CARLOTTA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'carlotta-prydwen-burst-rotation',
    characterId: 'carlotta',
    label: 'Burst Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/carlotta',
    notes:
      'Transcribed from the Rotation > Burst Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Echo step (echo-skill, user echo-dependent); the "Start with 30 Substance" precondition line (not an action); ' +
      'the team-buffing prerequisite (teammate actions). ' +
      'The page also details a WARM UP combo and BURST COMBO prerequisites (not transcribed).',
    steps: [
      {
        skillId: '1002806',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: Intro: Wintertime Aria (generates Moldable Crystals and Substance).',
      },
      { skillId: '1002802', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002802',
        motionName: 'Chromatic Splendor DMG',
        forteLevel: 10,
        note: 'Guide: consumes Moldable Crystals for Substance; enters Final Bow.',
      },
      {
        skillId: '1002801',
        motionName: 'Mid-air Attack DMG',
        forteLevel: 10,
        note: 'Guide: Mid-Air Atk to return to the ground to continue combo.',
      },
      {
        skillId: '1002807',
        motionName: 'Imminent Oblivion DMG',
        forteLevel: 10,
        note: 'Guide: Forte: Heavy Attack: Imminent Oblivion (consumes Substance to reduce Skill cooldown).',
      },
      { skillId: '1002803', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1002803', motionName: 'Death Knell DMG', forteLevel: 10 },
      { skillId: '1002803', motionName: 'Death Knell DMG', forteLevel: 10 },
      { skillId: '1002803', motionName: 'Death Knell DMG', forteLevel: 10 },
      { skillId: '1002803', motionName: 'Death Knell DMG', forteLevel: 10 },
      { skillId: '1002803', motionName: 'Fatal Finale DMG', forteLevel: 10 },
      { skillId: '1002802', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1002802', motionName: 'Chromatic Splendor DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002809', motionName: '', forteLevel: 10 },
    ],
  },
];
