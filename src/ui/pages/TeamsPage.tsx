import { useEffect, useState } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import { TEAM_BUFFS } from '../../data/teamBuffs.ts';
import { teamSonataCoverage } from '../../domain/teams.ts';
import { useInventoryStore } from '../../state/inventory.ts';
import { useTeamStore } from '../../state/teamStore.ts';
import { GameIcon } from '../components/GameIcon.tsx';
import { statLabel, toDisplayValue } from '../format.ts';

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';

export function TeamsPage() {
  const teams = useTeamStore((s) => s.teams);
  const loaded = useTeamStore((s) => s.loaded);
  const load = useTeamStore((s) => s.load);
  const createTeam = useTeamStore((s) => s.createTeam);
  const removeTeam = useTeamStore((s) => s.removeTeam);
  const echoes = useInventoryStore((s) => s.echoes);
  const inventoryLoaded = useInventoryStore((s) => s.loaded);
  const loadInventory = useInventoryStore((s) => s.load);
  const snapshot = loadBundledSnapshot();

  const [name, setName] = useState('');
  const [members, setMembers] = useState(['', '', '']);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
  useEffect(() => {
    if (!inventoryLoaded) void loadInventory();
  }, [inventoryLoaded, loadInventory]);

  const characterName = (id: string): string =>
    snapshot.characters.find((c) => c.id === id)?.name ?? id;
  const sonataNameOf = (id: string): string =>
    snapshot.sonataSets.find((s) => s.id === id)?.name ?? id;

  const handleCreate = async (): Promise<void> => {
    setError(null);
    if (name.trim() === '') {
      setError('Team name is required.');
      return;
    }
    const ids = members.map((m) => m.trim());
    if (ids.some((id) => id === '')) {
      setError('All three member slots need a character id.');
      return;
    }
    try {
      await createTeam(name.trim(), [ids[0], ids[1], ids[2]]);
      setName('');
      setMembers(['', '', '']);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section>
      <h2 className="text-xl font-semibold">Team Builder</h2>
      <p className="mt-1 text-xs text-slate-500">
        3-character teams with Sonata coverage from equipped Echoes plus each
        member&apos;s transcribed Outro / team buffs — importable in the calculator.
      </p>

      {error && (
        <div role="alert" className="mt-2 rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div>
          <label htmlFor="team-name" className="block text-xs font-medium text-slate-300">
            Team name
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        {([0, 1, 2] as const).map((i) => (
          <div key={i}>
            <label htmlFor={`team-member-${i + 1}`} className="block text-xs font-medium text-slate-300">
              {`Member ${i + 1} (character id)`}
            </label>
            <input
              id={`team-member-${i + 1}`}
              type="text"
              list="team-character-ids"
              value={members[i]}
              onChange={(e) =>
                setMembers((prev) => prev.map((m, j) => (j === i ? e.target.value : m)))
              }
              className={inputClass}
            />
          </div>
        ))}
        <datalist id="team-character-ids">
          {snapshot.characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </datalist>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white"
          >
            Create team
          </button>
        </div>
      </div>

      <div className="mt-4">
        {!loaded ? (
          <p className="text-slate-400">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-slate-400">No teams yet — assemble your first trio above.</p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => {
              const coverage = teamSonataCoverage(echoes, team, sonataNameOf);
              return (
                <li key={team.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{team.name}</h3>
                    <button
                      type="button"
                      onClick={() => void removeTeam(team.id)}
                      className="rounded-md px-2 py-1 text-sm text-red-300 hover:bg-slate-800"
                    >
                      Delete {team.name}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {coverage.members.map((member) => {
                      const provided = TEAM_BUFFS.filter((e) => e.characterId === member.characterId);
                      return (
                        <div key={member.characterId} className="rounded-md bg-slate-950 p-2">
                          <div className="flex items-center gap-1.5">
                            <GameIcon
                              name={characterName(member.characterId)}
                              iconUrl={snapshot.characters.find((c) => c.id === member.characterId)?.iconUrl}
                              size="sm"
                            />
                            <p className="text-xs font-medium">{characterName(member.characterId)}</p>
                          </div>
                          {member.pieces.length === 0 ? (
                            <p className="text-xs text-slate-500">No echoes equipped</p>
                          ) : (
                            <ul className="mt-1 text-xs text-slate-300">
                              {member.pieces.map((piece) => (
                                <li key={piece.sonataId}>
                                  {piece.sonataName} ×{piece.count}
                                </li>
                              ))}
                            </ul>
                          )}
                          {provided.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-500">No transcribed team buffs</p>
                          ) : (
                            <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                              {provided.map((entry) => (
                                <li key={`${entry.skillId}-${entry.label}`} title={entry.assumption}>
                                  {entry.label}
                                  {entry.windowSeconds !== undefined && ` · ${entry.windowSeconds}s`}
                                  {` (${entry.mods.map((m) => `${statLabel(m.stat)} ${toDisplayValue(m.stat, m.value)}`).join(', ')})`}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {coverage.combined.length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      Team totals:{' '}
                      {coverage.combined.map((c) => `${c.sonataName} ×${c.count}`).join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
