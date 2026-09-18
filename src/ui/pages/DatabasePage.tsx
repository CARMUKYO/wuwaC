import { useState, type ReactNode } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import type {
  CharacterData,
  EchoDefData,
  SonataSetData,
  WeaponData,
} from '../../data/schema.ts';
import { filterByName } from '../filter.ts';
import { statLabel, toDisplayValue } from '../format.ts';
import { GameIcon } from '../components/GameIcon.tsx';

type Tab = 'characters' | 'weapons' | 'echoes' | 'sonatas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'characters', label: 'Characters' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'echoes', label: 'Echoes' },
  { id: 'sonatas', label: 'Sonata Sets' },
];

function maxLevelStats(character: CharacterData): { hp: number; atk: number; def: number } {
  const top = character.baseStats.reduce((best, e) => (e.level >= best.level ? e : best));
  return { hp: top.hp, atk: top.atk, def: top.def };
}

function CharacterDetail({ character }: { character: CharacterData }) {
  const top = maxLevelStats(character);
  return (
    <article>
      <div className="flex items-center gap-2">
        <GameIcon name={character.name} iconUrl={character.iconUrl} size="lg" />
        <div>
          <h3 className="text-base font-semibold">{character.name}</h3>
          <p className="text-xs text-slate-400">
            {'★'.repeat(character.rarity)} · <span>{character.attribute}</span> · {character.weaponType}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Base at Lv 90 — HP {top.hp} · ATK {top.atk} · DEF {top.def}
      </p>
      <h4 className="mt-3 text-sm font-semibold">Skills</h4>
      <ul className="mt-1 space-y-1">
        {character.skills.map((skill) => (
          <li key={skill.id} className="text-xs text-slate-300">
            {skill.label}
            <span className="text-slate-500">
              {' '}
              · {skill.motionValues.length} motion component{skill.motionValues.length === 1 ? '' : 's'} · scales {skill.scaling}
            </span>
          </li>
        ))}
      </ul>
      <h4 className="mt-3 text-sm font-semibold">Forte nodes</h4>
      <ul className="mt-1 space-y-1">
        {character.forteNodes.map((node) => (
          <li key={node.id} className="text-xs text-slate-300">
            {node.title} +{toDisplayValue(node.stat, node.value)}
          </li>
        ))}
      </ul>
      <h4 className="mt-3 text-sm font-semibold">Resonance chain</h4>
      <ul className="mt-1 space-y-1">
        {character.resonanceChain.map((rank) => (
          <li key={rank.rank} className="text-xs text-slate-300">
            <span className="font-medium">S{rank.rank} {rank.name}</span>
            <span className="text-slate-500"> — {rank.description}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function WeaponDetail({ weapon }: { weapon: WeaponData }) {
  const atk = weapon.atkByLevel;
  return (
    <article>
      <div className="flex items-center gap-2">
        <GameIcon name={weapon.name} iconUrl={weapon.iconUrl} size="lg" />
        <h3 className="text-base font-semibold">{weapon.name}</h3>
      </div>
      <p className="text-xs text-slate-400">
        {'★'.repeat(weapon.rarity)} · {weapon.weaponType}
      </p>
      <p className="mt-2 text-xs text-slate-300">
        ATK {atk[0].value} → {atk[atk.length - 1].value}
        {weapon.secondaryStat &&
          ` · ${statLabel(weapon.secondaryStat.stat)} ${toDisplayValue(
            weapon.secondaryStat.stat,
            weapon.secondaryStat.byLevel[weapon.secondaryStat.byLevel.length - 1].value,
          )}`}
      </p>
      <h4 className="mt-3 text-sm font-semibold">Passive: {weapon.passive.name}</h4>
      <p className="mt-1 text-xs text-slate-300">{weapon.passive.description}</p>
    </article>
  );
}

function EchoDetail({ echo, sonataNameOf }: { echo: EchoDefData; sonataNameOf: (id: string) => string }) {
  return (
    <article>
      <div className="flex items-center gap-2">
        <GameIcon name={echo.name} iconUrl={echo.iconUrl} size="lg" />
        <div>
          <h3 className="text-base font-semibold">{echo.name}</h3>
          <p className="text-xs text-slate-400">
            Cost {echo.cost} · {echo.element ?? 'No element'}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-300">
        Sonata: {echo.sonataIds.map(sonataNameOf).join(' · ')}
      </p>
      <h4 className="mt-3 text-sm font-semibold">Main-stat pool</h4>
      <p className="mt-1 text-xs text-slate-300">
        {echo.allowedMainStats.map((s) => statLabel(s)).join(', ')}
      </p>
      {echo.skillDescription && (
        <>
          <h4 className="mt-3 text-sm font-semibold">
            Echo skill{echo.skillCooldown !== undefined && ` (CD ${echo.skillCooldown}s)`}
          </h4>
          <p className="mt-1 text-xs text-slate-300">{echo.skillDescription}</p>
        </>
      )}
    </article>
  );
}

function SonataDetail({ set }: { set: SonataSetData }) {
  return (
    <article>
      <h3 className="text-base font-semibold">{set.name}</h3>
      <ul className="mt-2 space-y-1">
        {set.bonuses.map((bonus, i) => (
          <li key={i} className="text-xs text-slate-300">
            <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 font-medium">
              {bonus.pieceCount}-piece
            </span>
            {bonus.effect.kind === 'stat' ? (
              <>
                {statLabel(bonus.effect.stat)} +{toDisplayValue(bonus.effect.stat, bonus.effect.value)}
                <span className="ml-1 text-slate-500">(structured)</span>
              </>
            ) : bonus.effect.kind === 'conditional' ? (
              <>
                {bonus.effect.condition}: {statLabel(bonus.effect.stat)} +
                {toDisplayValue(bonus.effect.stat, bonus.effect.value)}
              </>
            ) : (
              <span className="text-slate-400">{bonus.effect.note}</span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function DatabasePage() {
  const snapshot = loadBundledSnapshot();
  const [tab, setTab] = useState<Tab>('characters');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const switchTab = (next: Tab): void => {
    setTab(next);
    setSelectedId(null);
  };

  const sonataNameOf = (id: string): string =>
    snapshot.sonataSets.find((s) => s.id === id)?.name ?? id;

  const renderList = (): ReactNode => {
    if (tab === 'characters') {
      const rows = filterByName(snapshot.characters, (c) => c.name, query);
      return (
        <List
          empty={rows.length === 0}
          rows={rows.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelectedId(c.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800">
              <GameIcon name={c.name} iconUrl={c.iconUrl} size="sm" />
              {c.name}
            </button>
          ))}
        />
      );
    }
    if (tab === 'weapons') {
      const rows = filterByName(snapshot.weapons, (w) => w.name, query);
      return (
        <List
          empty={rows.length === 0}
          rows={rows.map((w) => (
            <button key={w.id} type="button" onClick={() => setSelectedId(w.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800">
              <GameIcon name={w.name} iconUrl={w.iconUrl} size="sm" />
              {w.name}
            </button>
          ))}
        />
      );
    }
    if (tab === 'echoes') {
      const rows = filterByName(snapshot.echoDefs, (e) => e.name, query);
      return (
        <List
          empty={rows.length === 0}
          rows={rows.map((e) => (
            <button key={e.id} type="button" onClick={() => setSelectedId(e.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800">
              <GameIcon name={e.name} iconUrl={e.iconUrl} size="sm" />
              {e.name}
            </button>
          ))}
        />
      );
    }
    const rows = filterByName(snapshot.sonataSets, (s) => s.name, query);
    return (
      <List
        empty={rows.length === 0}
        rows={rows.map((s) => (
          <button key={s.id} type="button" onClick={() => setSelectedId(s.id)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-800">
            {s.name}
          </button>
        ))}
      />
    );
  };

  const renderDetail = (): ReactNode => {
    if (selectedId === null) return <p className="text-sm text-slate-500">Select an entry to inspect it.</p>;
    if (tab === 'characters') {
      const character = snapshot.characters.find((c) => c.id === selectedId);
      if (!character) return <p className="text-sm text-slate-500">Entry not found.</p>;
      return <CharacterDetail character={character} />;
    }
    if (tab === 'weapons') {
      const weapon = snapshot.weapons.find((w) => w.id === selectedId);
      if (!weapon) return <p className="text-sm text-slate-500">Entry not found.</p>;
      return <WeaponDetail weapon={weapon} />;
    }
    if (tab === 'echoes') {
      const echo = snapshot.echoDefs.find((e) => e.id === selectedId);
      if (!echo) return <p className="text-sm text-slate-500">Entry not found.</p>;
      return <EchoDetail echo={echo} sonataNameOf={sonataNameOf} />;
    }
    const set = snapshot.sonataSets.find((s) => s.id === selectedId);
    if (!set) return <p className="text-sm text-slate-500">Entry not found.</p>;
    return <SonataDetail set={set} />;
  };

  const counts: Record<Tab, number> = {
    characters: snapshot.characters.length,
    weapons: snapshot.weapons.length,
    echoes: snapshot.echoDefs.length,
    sonatas: snapshot.sonataSets.length,
  };

  return (
    <section>
      <h2 className="text-xl font-semibold">Database</h2>
      <p className="mt-1 text-xs text-slate-500">
        Sourced from encore.moe · {snapshot.fetchedAt.slice(0, 10)} · {snapshot.echoDefs.length} of 311
        echoes have verified cost data (the rest are skipped, never guessed).
      </p>
      <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Database sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.id ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label htmlFor="db-search" className="block text-xs font-medium text-slate-300">
          Search
        </label>
        <input
          id="db-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="mt-0.5 w-full max-w-sm rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        />
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>{renderList()}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">{renderDetail()}</div>
      </div>
    </section>
  );
}

function List({ rows, empty }: { rows: ReactNode[]; empty: boolean }) {
  if (empty) return <p className="text-sm text-slate-400">No matches — try a different search.</p>;
  return <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">{rows}</div>;
}
