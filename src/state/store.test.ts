// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initSectionRouting, sectionFromHash, useAppStore } from './store';

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

  it('opens Builds for #b= share links', () => {
    expect(sectionFromHash('#b=eyJ9')).toBe('builds');
  });

  it('rejects unknown or empty hashes', () => {
    expect(sectionFromHash('#nope')).toBeNull();
    expect(sectionFromHash('')).toBeNull();
  });
});

describe('share links', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    useAppStore.setState({ activeSection: 'inventory', shareLink: null });
  });

  it('captures a cold-opened #b= link and starts on Builds', async () => {
    window.history.replaceState(null, '', '/#b=abc');
    vi.resetModules();
    const fresh = await import('./store');
    expect(fresh.useAppStore.getState().activeSection).toBe('builds');
    expect(fresh.useAppStore.getState().shareLink).toBe('#b=abc');
  });

  it('keeps the link in the URL when Builds is selected', () => {
    window.history.replaceState(null, '', '/#b=abc');
    useAppStore.setState({ shareLink: '#b=abc' });
    useAppStore.getState().setActiveSection('builds');
    expect(window.location.hash).toBe('#b=abc');
  });

  it('resolving the link leaves the URL at #builds', () => {
    window.history.replaceState(null, '', '/app/?x=1#b=abc');
    useAppStore.setState({ activeSection: 'builds', shareLink: '#b=abc' });
    useAppStore.getState().resolveShareLink();
    expect(useAppStore.getState().shareLink).toBeNull();
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/app/?x=1#builds');
  });

  it('captures a link pasted into the running app', () => {
    initSectionRouting();
    window.location.hash = 'b=pasted';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(useAppStore.getState().activeSection).toBe('builds');
    expect(useAppStore.getState().shareLink).toBe('#b=pasted');
  });
});
