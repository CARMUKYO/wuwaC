import { create } from 'zustand';
import { findEchoDef, loadBundledSnapshot } from '../data/index.ts';
import { ownedEchoSchema, type EchoDefData, type OwnedEcho } from '../data/schema.ts';
import { db } from './db.ts';

/**
 * Form input for one Echo. The store derives identity: `id` is generated
 * and `origin` is always manual here. `echoDefId` must be a real synced
 * definition — the form picks it, never the label (Phase 3 decision:
 * legacy slugified rows are force re-linked on next edit).
 */
export type EchoDraft = Omit<OwnedEcho, 'id' | 'origin'> & {
  label?: string;
};

/** Row-level def problems. `orphan` = unknown def; the rest = known-def mismatch. */
export interface EchoDefIssue {
  kind: 'orphan' | 'cost' | 'sonata' | 'mainStat';
  message: string;
}

/** Check a row against its echo def. Empty = consistent. Tolerant reads use this; writes reject. */
export function echoDefIssues(echo: Pick<OwnedEcho, 'echoDefId' | 'sonataId' | 'cost' | 'mainStat'>, defs: readonly EchoDefData[] = loadBundledSnapshot().echoDefs): EchoDefIssue[] {
  const def = defs.find((d) => d.id === echo.echoDefId);
  if (!def) {
    return [{ kind: 'orphan', message: `No echo definition matches ${JSON.stringify(echo.echoDefId)} — pick the real Echo to re-link.` }];
  }
  const issues: EchoDefIssue[] = [];
  if (echo.cost !== def.cost) {
    issues.push({ kind: 'cost', message: `${def.name} is a ${def.cost}-cost Echo, not ${echo.cost} — fix on edit.` });
  }
  if (!def.sonataIds.includes(echo.sonataId)) {
    issues.push({ kind: 'sonata', message: `${def.name} cannot roll ${JSON.stringify(echo.sonataId)} — fix on edit.` });
  }
  if (!def.allowedMainStats.includes(echo.mainStat.stat)) {
    issues.push({ kind: 'mainStat', message: `${def.name} cannot roll ${echo.mainStat.stat} as a main stat — fix on edit.` });
  }
  return issues;
}

/** Strict write path: drafts must be fully def-consistent. */
function assertDefConsistent(draft: EchoDraft): void {
  const def = findEchoDef(loadBundledSnapshot(), draft.echoDefId);
  if (!def) {
    throw new Error(`unknown echo definition: ${JSON.stringify(draft.echoDefId)} — pick the Echo from the list`);
  }
  const issues = echoDefIssues(draft, [def]);
  if (issues.length > 0) {
    throw new Error(issues.map((i) => i.message).join(' '));
  }
}

interface InventoryState {
  echoes: OwnedEcho[];
  loaded: boolean;
  load: () => Promise<void>;
  addEcho: (draft: EchoDraft) => Promise<OwnedEcho>;
  updateEcho: (id: string, patch: Partial<EchoDraft>) => Promise<OwnedEcho>;
  removeEcho: (id: string) => Promise<void>;
}

function toRow(draft: EchoDraft, id: string): OwnedEcho {
  assertDefConsistent(draft);
  return ownedEchoSchema.parse({ ...draft, id, origin: 'manual' });
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  echoes: [],
  loaded: false,

  load: async () => {
    const echoes = await db.ownedEchoes.toArray();
    set({ echoes, loaded: true });
  },

  addEcho: async (draft) => {
    const row = toRow(draft, crypto.randomUUID());
    await db.ownedEchoes.add(row);
    set((s) => ({ echoes: [...s.echoes, row] }));
    return row;
  },

  updateEcho: async (id, patch) => {
    const existing = get().echoes.find((e) => e.id === id);
    if (!existing) throw new Error(`unknown echo: ${JSON.stringify(id)}`);
    const merged: EchoDraft = { ...existing, ...patch };
    assertDefConsistent(merged);
    const row = ownedEchoSchema.parse(merged);
    await db.ownedEchoes.put(row);
    set((s) => ({ echoes: s.echoes.map((e) => (e.id === id ? row : e)) }));
    return row;
  },

  removeEcho: async (id) => {
    const existing = get().echoes.find((e) => e.id === id);
    if (!existing) throw new Error(`unknown echo: ${JSON.stringify(id)}`);
    await db.ownedEchoes.delete(id);
    set((s) => ({ echoes: s.echoes.filter((e) => e.id !== id) }));
  },
}));
