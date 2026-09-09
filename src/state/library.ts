import { create } from 'zustand';
import { buildSchema, type Build } from '../data/schema.ts';
import { db } from './db.ts';

/** Draft for a new build: everything except generated id/timestamp. */
export type BuildDraft = Omit<Build, 'id' | 'updatedAt'>;

interface LibraryState {
  builds: Build[];
  loaded: boolean;
  load: () => Promise<void>;
  saveBuild: (draft: BuildDraft) => Promise<Build>;
  updateBuild: (id: string, patch: Partial<Pick<Build, 'name' | 'notes'>>) => Promise<Build>;
  removeBuild: (id: string) => Promise<void>;
  importBuilds: (json: unknown) => Promise<{ added: number; skipped: number }>;
}

/** Serialize validated builds for JSON export. */
export function serializeBuilds(builds: Build[]): string {
  return JSON.stringify(builds.map((b) => buildSchema.parse(b)));
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  builds: [],
  loaded: false,

  load: async () => {
    const builds = await db.builds.toArray();
    set({ builds, loaded: true });
  },

  saveBuild: async (draft) => {
    const row = buildSchema.parse({
      ...draft,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    });
    await db.builds.add(row);
    set((s) => ({ builds: [...s.builds, row] }));
    return row;
  },

  updateBuild: async (id, patch) => {
    const existing = get().builds.find((b) => b.id === id);
    if (!existing) throw new Error(`unknown build: ${JSON.stringify(id)}`);
    const row = buildSchema.parse({ ...existing, ...patch });
    await db.builds.put(row);
    set((s) => ({ builds: s.builds.map((b) => (b.id === id ? row : b)) }));
    return row;
  },

  removeBuild: async (id) => {
    const existing = get().builds.find((b) => b.id === id);
    if (!existing) throw new Error(`unknown build: ${JSON.stringify(id)}`);
    await db.builds.delete(id);
    set((s) => ({ builds: s.builds.filter((b) => b.id !== id) }));
  },

  importBuilds: async (json) => {
    if (!Array.isArray(json)) throw new Error('expected an array of builds');
    // Validate everything before writing anything. Missing ids are assigned
    // (foreign exports may not carry them); everything else must validate.
    const rows = json.map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error('expected each build to be an object');
      }
      const record = item as Record<string, unknown>;
      return buildSchema.parse({
        ...record,
        id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
      });
    });
    const known = new Set(get().builds.map((b) => b.id));
    let skipped = 0;
    const fresh = rows.filter((row) => {
      if (known.has(row.id)) {
        skipped += 1;
        return false;
      }
      known.add(row.id);
      return true;
    });
    await db.builds.bulkAdd(fresh);
    set((s) => ({ builds: [...s.builds, ...fresh] }));
    return { added: fresh.length, skipped };
  },
}));
