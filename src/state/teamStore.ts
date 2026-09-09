import { create } from 'zustand';
import { teamSchema, type Team } from '../data/schema.ts';
import { db } from './db.ts';

interface TeamState {
  teams: Team[];
  loaded: boolean;
  load: () => Promise<void>;
  createTeam: (name: string, characterIds: [string, string, string]) => Promise<Team>;
  renameTeam: (id: string, name: string) => Promise<Team>;
  setMembers: (id: string, characterIds: [string, string, string]) => Promise<Team>;
  removeTeam: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>()((set, get) => ({
  teams: [],
  loaded: false,

  load: async () => {
    const teams = await db.teams.toArray();
    set({ teams, loaded: true });
  },

  createTeam: async (name, characterIds) => {
    const row = teamSchema.parse({ id: crypto.randomUUID(), name, characterIds });
    await db.teams.add(row);
    set((s) => ({ teams: [...s.teams, row] }));
    return row;
  },

  renameTeam: async (id, name) => {
    const existing = get().teams.find((t) => t.id === id);
    if (!existing) throw new Error(`unknown team: ${JSON.stringify(id)}`);
    const row = teamSchema.parse({ ...existing, name });
    await db.teams.put(row);
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? row : t)) }));
    return row;
  },

  setMembers: async (id, characterIds) => {
    const existing = get().teams.find((t) => t.id === id);
    if (!existing) throw new Error(`unknown team: ${JSON.stringify(id)}`);
    const row = teamSchema.parse({ ...existing, characterIds });
    await db.teams.put(row);
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? row : t)) }));
    return row;
  },

  removeTeam: async (id) => {
    const existing = get().teams.find((t) => t.id === id);
    if (!existing) throw new Error(`unknown team: ${JSON.stringify(id)}`);
    await db.teams.delete(id);
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }));
  },
}));
