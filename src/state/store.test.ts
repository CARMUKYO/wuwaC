import { describe, expect, it } from 'vitest';
import { sectionFromHash, useAppStore } from './store';

// Phase 0 wiring test: proves Vitest + Zustand are set up. Real domain and
// optimizer tests (hand-computed expected values) arrive in Phases 2 and 4.
describe('app store', () => {
  it('starts on the inventory section', () => {
    expect(useAppStore.getState().activeSection).toBe('inventory');
  });

  it('switches sections', () => {
    useAppStore.getState().setActiveSection('calculator');
    expect(useAppStore.getState().activeSection).toBe('calculator');
    useAppStore.getState().setActiveSection('inventory');
    expect(useAppStore.getState().activeSection).toBe('inventory');
  });
});

describe('sectionFromHash', () => {
  it('resolves known sections', () => {
    expect(sectionFromHash('#calculator')).toBe('calculator');
    expect(sectionFromHash('#database')).toBe('database');
  });

  it('reserves #b= share links for BuildsPage', () => {
    expect(sectionFromHash('#b=eyJ9')).toBeNull();
  });

  it('rejects unknown or empty hashes', () => {
    expect(sectionFromHash('#nope')).toBeNull();
    expect(sectionFromHash('')).toBeNull();
  });
});
