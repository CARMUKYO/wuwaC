import Dexie, { type EntityTable } from 'dexie';
import type {
  Build,
  GameDataCacheRow,
  OwnedEcho,
  RosterEntry,
  Team,
} from '../data/schema.ts';

/** Local-first user + cache database. All tables keyed by string `id`. */
class WuwaDb extends Dexie {
  ownedEchoes!: EntityTable<OwnedEcho, 'id'>;
  /** One entry per character, keyed by character id. */
  roster!: EntityTable<RosterEntry, 'characterId'>;
  builds!: EntityTable<Build, 'id'>;
  teams!: EntityTable<Team, 'id'>;
  /**
   * Synced encore.moe snapshot (§8.2 runtime cache). Single row with
   * `id: 'active'` holding the last validated payload + metadata. Payload
   * and checksum are unindexed, so no Dexie version bump was needed.
   */
  gamedataCache!: EntityTable<GameDataCacheRow, 'id'>;

  constructor() {
    super('wuwa-optimizer');
    this.version(1).stores({
      ownedEchoes: 'id, echoDefId, equippedTo',
      roster: 'characterId',
      builds: 'id, characterId',
      teams: 'id',
      gamedataCache: 'id',
    });
  }
}

export const db = new WuwaDb();
