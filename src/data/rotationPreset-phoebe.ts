import type { RotationPreset } from './rotationPresets.ts';

/**
 * Phoebe presets. Transcribed from Prydwen's Rotation & How to play >
 * Standard Rotation: Absolution section (her Main DPS rotation).
 */
export const PHOEBE_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'phoebe-prydwen-standard-rotation-absolution',
    characterId: 'phoebe',
    label: 'Standard Rotation: Absolution',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/phoebe',
    notes:
      'Transcribed from the Rotation & How to play > Standard Rotation: Absolution section ' +
      '(verified live 2026-09-19). ' +
      "Chamuel's Star stages map to the skill snapshot rows; Mirror Summon maps to the skill cast row " +
      '(Refracted Holy Light triggers are not guide steps). ' +
      'Omitted: the five movement-only Dash lines (no snapshot motion); the freely-timed Capitaneus / ' +
      'Nightmare: Mourning Aix echo summon (echo skill). ' +
      'The page also details a Standard Rotation: Confession (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1003006', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1003002',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: "Skill: Mirror Summon". Cancel animation endlag via Dash (no cancel model; full motion scores).',
      },
      {
        skillId: '1003007',
        motionName: 'Absolution Litany DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation on cast via Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Ultimate".
      { skillId: '1003003', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 1".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 1 DMG", forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 2".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 2 DMG", forteLevel: 10 },
      {
        skillId: '1003002',
        motionName: "Chamuel's Star: Stage 3 DMG",
        forteLevel: 10,
        note: 'Guide: cancel animation on cast via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Heavy: Starflash".
      { skillId: '1003007', motionName: 'Heavy Attack: Starflash DMG', forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 1".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 1 DMG", forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 2".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 2 DMG", forteLevel: 10 },
      {
        skillId: '1003002',
        motionName: "Chamuel's Star: Stage 3 DMG",
        forteLevel: 10,
        note: 'Guide: cancel animation on cast via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Heavy: Starflash".
      { skillId: '1003007', motionName: 'Heavy Attack: Starflash DMG', forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 1".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 1 DMG", forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 2".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 2 DMG", forteLevel: 10 },
      {
        skillId: '1003002',
        motionName: "Chamuel's Star: Stage 3 DMG",
        forteLevel: 10,
        note: 'Guide: cancel animation on cast via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Heavy: Starflash".
      { skillId: '1003007', motionName: 'Heavy Attack: Starflash DMG', forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 1".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 1 DMG", forteLevel: 10 },
      // Guide: "Basic: Chamuel's Star 2".
      { skillId: '1003002', motionName: "Chamuel's Star: Stage 2 DMG", forteLevel: 10 },
      {
        skillId: '1003002',
        motionName: "Chamuel's Star: Stage 3 DMG",
        forteLevel: 10,
        note: 'Guide: cancel animation on cast via Dash (no cancel model; full motion scores).',
      },
      {
        skillId: '1003007',
        motionName: 'Heavy Attack: Starflash DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Outro (no cancel model; full motion scores).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003009', motionName: '', forteLevel: 10 },
    ],
  },
];
