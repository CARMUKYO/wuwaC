import type { RotationPreset } from './rotationPresets.ts';

/**
 * Denia presets. Transcribed from Prydwen's Rotation & Gameplay > Standard
 * Rotation (the page's main rotation; the Opener is used once and only
 * when Denia rotates first).
 */
export const DENIA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'denia-prydwen-standard-rotation',
    characterId: 'denia',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/denia',
    notes:
      'Transcribed from the Rotation & Gameplay > Standard Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Jump line (non-damaging movement, no snapshot skill); Echo timing is prose-only (not a listed step). ' +
      'The page also details an Opener Rotation (not transcribed).',
    steps: [
      {
        skillId: '1005306',
        motionName: "It's Been A While! DMG",
        forteLevel: 10,
        note: 'Guide: Intro. Form-picked: Stagecraft-form intro per intro prose (Breakdown-form intro is Knock Knock); its Stagecraft 4 follow-up matches the next line.',
      },
      {
        skillId: '1005301',
        motionName: 'Basic Attack - Stagecraft Form Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1005302',
        motionName: 'Phantom Bubble - Stagecraft Form DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation instantly via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1005303', motionName: 'Final Act - Stagecraft Form DMG', forteLevel: 10 },
      { skillId: '1005301', motionName: 'Basic Attack - Breakdown Form Stage 1 DMG', forteLevel: 10 },
      {
        skillId: '1005301',
        motionName: 'Basic Attack - Breakdown Form Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Jump (no cancel model; full motion scores).',
      },
      { skillId: '1005301', motionName: 'Mid-air Attack - Breakdown Form Stage 1 DMG', forteLevel: 10 },
      {
        skillId: '1005301',
        motionName: 'Mid-air Attack - Breakdown Form Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      { skillId: '1005302', motionName: 'Banish - Breakdown Form Stage 1 DMG', forteLevel: 10 },
      {
        skillId: '1005302',
        motionName: 'Banish - Breakdown Form Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation instantly via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1005303', motionName: 'Final Act - Breakdown Form DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005309', motionName: '', forteLevel: 10 },
    ],
  },
];
