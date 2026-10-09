import { z } from 'zod';
import {
  buildSchema,
  ownedEchoSchema,
  rosterEntrySchema,
  teamSchema,
} from '../data/schema.ts';
import { db } from './db.ts';
import { useInventoryStore } from './inventory.ts';
import { useLibraryStore } from './library.ts';
import { useRosterStore } from './roster.ts';
import { useTeamStore } from './teamStore.ts';

/**
 * Whole-database backup of the user's own data (Echoes, roster, builds,
 * teams). The synced game-data cache is excluded — it is re-derivable.
 * On a public host the browser may evict site data, so this file is the
 * user's only durable copy.
 */
export const BACKUP_FORMAT = 'wuwa-optimizer-backup';
export const BACKUP_VERSION = 1;

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  tables: z.object({
    ownedEchoes: z.array(ownedEchoSchema),
    roster: z.array(rosterEntrySchema),
    builds: z.array(buildSchema),
    teams: z.array(teamSchema),
  }),
});
export type Backup = z.infer<typeof backupSchema>;

export type RestoreMode = 'replace' | 'merge';

export interface BackupCounts {
  ownedEchoes: number;
  roster: number;
  builds: number;
  teams: number;
}

export async function createBackup(now: Date = new Date()): Promise<Backup> {
  const [ownedEchoes, roster, builds, teams] = await Promise.all([
    db.ownedEchoes.toArray(),
    db.roster.toArray(),
    db.builds.toArray(),
    db.teams.toArray(),
  ]);
  return backupSchema.parse({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    tables: { ownedEchoes, roster, builds, teams },
  });
}

/** Validate untrusted JSON as a backup; throws a readable error otherwise. */
export function parseBackup(json: unknown): Backup {
  const result = backupSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
    throw new Error(`not a valid WuWa Optimizer backup${where}: ${issue.message}`);
  }
  return result.data;
}

export function countBackup(backup: Backup): BackupCounts {
  const { ownedEchoes, roster, builds, teams } = backup.tables;
  return {
    ownedEchoes: ownedEchoes.length,
    roster: roster.length,
    builds: builds.length,
    teams: teams.length,
  };
}

/**
 * Write a validated backup in one transaction. `replace` wipes the four
 * user tables first; `merge` upserts by id (backup wins on conflicts).
 * Reloads the in-memory stores afterwards.
 */
export async function restoreBackup(backup: Backup, mode: RestoreMode): Promise<BackupCounts> {
  const { ownedEchoes, roster, builds, teams } = backup.tables;
  await db.transaction('rw', [db.ownedEchoes, db.roster, db.builds, db.teams], async () => {
    if (mode === 'replace') {
      await Promise.all([db.ownedEchoes.clear(), db.roster.clear(), db.builds.clear(), db.teams.clear()]);
    }
    await db.ownedEchoes.bulkPut(ownedEchoes);
    await db.roster.bulkPut(roster);
    await db.builds.bulkPut(builds);
    await db.teams.bulkPut(teams);
  });
  await Promise.all([
    useInventoryStore.getState().load(),
    useRosterStore.getState().load(),
    useLibraryStore.getState().load(),
    useTeamStore.getState().load(),
  ]);
  return countBackup(backup);
}
