import { create } from 'zustand';
import { rosterEntrySchema, type RosterEntry } from '../data/schema.ts';
import { db } from './db.ts';

/** One entry per character, keyed by `characterId`. Validated at the boundary. */
interface RosterState {
  entries: RosterEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (entry: RosterEntry) => Promise<RosterEntry>;
  remove: (characterId: string) => Promise<void>;
}

export const useRosterStore = create<RosterState>()((set, get) => ({
  entries: [],
  loaded: false,

  load: async () => {
    const entries = await db.roster.toArray();
    set({ entries, loaded: true });
  },

  upsert: async (entry) => {
    const row = rosterEntrySchema.parse(entry);
    await db.roster.put(row);
    set((s) => ({
      entries: s.entries.some((e) => e.characterId === row.characterId)
        ? s.entries.map((e) => (e.characterId === row.characterId ? row : e))
        : [...s.entries, row],
    }));
    return row;
  },

  remove: async (characterId) => {
    const existing = get().entries.find((e) => e.characterId === characterId);
    if (!existing) throw new Error(`unknown character: ${JSON.stringify(characterId)}`);
    await db.roster.delete(characterId);
    set((s) => ({ entries: s.entries.filter((e) => e.characterId !== characterId) }));
  },
}));
