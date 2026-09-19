import type { RotationPreset } from './rotationPresets.ts';

/**
 * Lucy presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Loop Rotation section (the steady-state cycle).
 */
export const LUCY_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'lucy-prydwen-loop-rotation',
    characterId: 'lucy',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/lucy',
    notes:
      'Transcribed from the Rotation & Gameplay > Loop Rotation section (verified live 2026-09-19). ' +
      '"Skill: Payload" expands to the charge plus the automatically-triggered follow-up attack (single cast, ' +
      'per the skill prose). ' +
      '"Ultimate (First 5 Programs)" maps to the Override cast only: the selected Spoofing Program hits are ' +
      'not enumerated as snapshot rows by the guide (UI order unknown; debuff programs unscored). ' +
      'Omitted: the freely-timed Adam Smasher echo summon (echo skill). ' +
      'The page also details an Opener "Rotation" (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1004906', motionName: 'Intro Skill - Outdated Hallucination DMG', forteLevel: 10 },
      // Guide: "Skill: Payload" (charge plus automatic follow-up, single cast).
      { skillId: '1004902', motionName: 'Resonance Skill - Payload Charge DMG', forteLevel: 10 },
      { skillId: '1004902', motionName: 'Resonance Skill - Payload Follow-Up Attack DMG', forteLevel: 10 },
      // Guide: "Skill: Pulse Interference".
      { skillId: '1004902', motionName: 'Resonance Skill - Pulse Interference DMG', forteLevel: 10 },
      // Guide: "Basic 2".
      { skillId: '1004901', motionName: 'Basic Attack Stage 2 DMG', forteLevel: 10 },
      // Guide: "Basic 3".
      { skillId: '1004901', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1004901',
        motionName: 'Basic Attack Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      // Guide: "Skill: Deadlock".
      { skillId: '1004902', motionName: 'Resonance Skill - Deadlock DMG', forteLevel: 10 },
      // Guide: "Basic: Thread 1".
      { skillId: '1004901', motionName: 'Basic Attack - Thread Shredding Stage 1 DMG', forteLevel: 10 },
      // Guide: "Basic: Thread 2".
      { skillId: '1004901', motionName: 'Basic Attack - Thread Shredding Stage 2 DMG', forteLevel: 10 },
      // Guide: "Basic: Thread 3".
      { skillId: '1004901', motionName: 'Basic Attack - Thread Shredding Stage 3 DMG', forteLevel: 10 },
      // Guide: "Basic: Thread 4".
      { skillId: '1004901', motionName: 'Basic Attack - Thread Shredding Stage 4 DMG', forteLevel: 10 },
      // Guide: "Heavy: Dual-threading".
      { skillId: '1004901', motionName: 'Heavy Attack - Dual Threading DMG', forteLevel: 10 },
      {
        skillId: '1004901',
        motionName: 'Heavy Attack - Multithreading DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      {
        skillId: '1004903',
        motionName: 'Resonance Liberation - Netrunner: Override DMG',
        forteLevel: 10,
        note: 'Guide: "Ultimate (First 5 Programs)". Override cast only (see preset notes).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004909', motionName: '', forteLevel: 10 },
    ],
  },
];
