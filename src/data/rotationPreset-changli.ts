import type { RotationPreset } from './rotationPresets.ts';

/**
 * Changli presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Standard Rotation (the page's recommended single-Intro no-swap
 * rotation; Double Intro and Max Potential are conditional).
 */
export const CHANGLI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'changli-prydwen-standard-rotation',
    characterId: 'changli',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/changli',
    notes:
      'Transcribed from the Rotation & Gameplay > Standard Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Dash line (non-damaging movement, no snapshot skill); Echo timing is prose-only (not a listed step). ' +
      '"Skill" lines map to True Sight: Capture per the guide Swap Cancels section (Her Skill is True Sight: Capture). ' +
      'The page also details an Opener, a Double Intro Approach, and a Max Potential Rotation (not transcribed).',
    steps: [
      { skillId: '1002106', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002102',
        motionName: 'True Sight: Charge DMG',
        forteLevel: 10,
        note: 'Guide: Basic: True Sight: Charge (Basic-button True Sight).',
      },
      {
        skillId: '1002102',
        motionName: 'True Sight: Capture DMG',
        forteLevel: 10,
        note: 'Guide: Skill (True Sight: Capture, per the Swap Cancels section).',
      },
      { skillId: '1002101', motionName: 'Heavy Attack', forteLevel: 10 },
      {
        skillId: '1002102',
        motionName: 'True Sight: Charge DMG',
        forteLevel: 10,
        note: 'Guide: Basic: True Sight: Charge (Basic-button True Sight).',
      },
      {
        skillId: '1002101',
        motionName: 'Mid-air Attack 1 DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Mid-air Attack, interrupt instantly via Dash (chain starter; no cancel model; full motion scores).',
      },
      { skillId: '1002101', motionName: 'Mid-air Attack 4 DMG', forteLevel: 10 },
      {
        skillId: '1002102',
        motionName: 'True Sight: Charge DMG',
        forteLevel: 10,
        note: 'Guide: Basic: True Sight: Charge (Basic-button True Sight).',
      },
      {
        skillId: '1002102',
        motionName: 'True Sight: Capture DMG',
        forteLevel: 10,
        note: 'Guide: Skill (True Sight: Capture, per the Swap Cancels section).',
      },
      {
        skillId: '1002102',
        motionName: 'True Sight: Conquest DMG',
        forteLevel: 10,
        note: 'Guide: Basic: True Sight: Conquest (Basic-button True Sight).',
      },
      {
        skillId: '1002107',
        motionName: 'Flaming Sacrifice DMG',
        forteLevel: 10,
        note: 'Guide: Heavy: Flaming Sacrifice (forte Heavy).',
      },
      { skillId: '1002103', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002107',
        motionName: 'Flaming Sacrifice DMG',
        forteLevel: 10,
        note: 'Guide: Heavy: Flaming Sacrifice (Swap).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002109', motionName: '', forteLevel: 10 },
    ],
  },
];
