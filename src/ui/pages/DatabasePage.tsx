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
import { inputClass, labelClass } from '../components/classes.ts';
import { AttributeDot, PageHeader } from '../components/ui.tsx';

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
      <div className="flex items-center gap-3">
        <GameIcon name={character.name} iconUrl={character.iconUrl} size="lg" />
        <div className="min-w-0">
          <h3 className="font-display text-3xl leading-none font-semibold tracking-wide text-ink">{character.name}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tracking-[0.08em] text-dim uppercase">
            <span className="text-seal">{'★'.repeat(character.rarity)}</span>
            <span className="inline-flex items-center gap-1.5">
              <AttributeDot attribute={character.attribute} />
              <span>{character.attribute}</span>
            </span>
            <span>{character.weaponType}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 font-mono text-[11px] text-fog tnum">
        Base at Lv 90 — HP {top.hp} · ATK {top.atk} · DEF {top.def}
      </p>
      <h4 className="mt-4 font-mono text-[11px] tracking-[0.14em] text-seal uppercase">Skills</h4>
      <ul className="mt-1.5 space-y-1">
        {character.skills.map((skill) => (
          <li key={skill.id} className="text-xs text-fog">
            <span className="text-ink">{skill.label}</span>
            <span className="text-dim">
              {' '}
              · {skill.motionValues.length} motion component{skill.motionValues.length === 1 ? '' : 's'} · scales {skill.scaling}
            </span>
          </li>
        ))}
      </ul>
      <h4 className="mt-4 font-mono text-[11px] tracking-[0.14em] text-seal uppercase">Forte nodes</h4>
      <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-fog tnum">
        {character.forteNodes.map((node) => (
          <li key={node.id}>
            {node.title} +{toDisplayValue(node.stat, node.value)}
          </li>
        ))}
      </ul>
      <h4 className="mt-4 font-mono text-[11px] tracking-[0.14em] text-seal uppercase">Resonance chain</h4>
      <ul className="mt-1.5 space-y-1.5">
        {character.resonanceChain.map((rank) => (
          <li key={rank.rank} className="text-xs text-fog">
            <span className="font-mono text-[11px] font-medium text-seal tnum">S{rank.rank}</span>{' '}
            <span className="font-medium text-ink">{rank.name}</span>
            <span className="text-dim"> — {rank.description}</span>
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
      <div className="flex items-center gap-3">
        <GameIcon name={weapon.name} iconUrl={weapon.iconUrl} size="lg" />
        <div className="min-w-0">
          <h3 className="font-display text-3xl leading-none font-semibold tracking-wide text-ink">{weapon.name}</h3>
          <p className="mt-1.5 font-mono text-[11px] tracking-[0.08em] text-dim uppercase">
            <span className="text-seal">{'★'.repeat(weapon.rarity)}</span> · {weapon.weaponType}
          </p>
        </div>
      </div>
      <p className="mt-3 font-mono text-[11px] text-fog tnum">
        ATK {atk[0].value} → {atk[atk.length - 1].value}
        {weapon.secondaryStat &&
          ` · ${statLabel(weapon.secondaryStat.stat)} ${toDisplayValue(
            weapon.secondaryStat.stat,
            weapon.secondaryStat.byLevel[weapon.secondaryStat.byLevel.length - 1].value,
          )}`}
      </p>
      <h4 className="mt-4 font-mono text-[11px] tracking-[0.14em] text-seal uppercase">Passive: {weapon.passive.name}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-fog">{weapon.passive.description}</p>
    </article>
  );
}

function EchoDetail({ echo, sonataNameOf }: { echo: EchoDefData; sonataNameOf: (id: string) => string }) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <GameIcon name={echo.name} iconUrl={echo.iconUrl} size="lg" />
        <div className="min-w-0">
          <h3 className="font-display text-3xl leading-none font-semibold tracking-wide text-ink">{echo.name}</h3>
          <p className="mt-1.5 font-mono text-[11px] tracking-[0.08em] text-dim uppercase">
            Cost {echo.cost} · {echo.element ?? 'No element'}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-fog">
        Sonata: {echo.sonataIds.map(sonataNameOf).join(' · ')}
      </p>
      <h4 className="mt-4 font-mono text-[11px] tracking-[0.14em] text-seal uppercase">Main-stat pool</h4>
      <p className="mt-1.5 font-mono text-[11px] text-fog">
        {echo.allowedMainStats.map((s) => statLabel(s)).join(', ')}
      </p>
      {echo.skillDescription && (
        <>
          <h4 className="mt-4 font-mono text-[11px] tracking-[0.14em] text-seal uppercase">
            Echo skill{echo.skillCooldown !== undefined && ` (CD ${echo.skillCooldown}s)`}
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-fog">{echo.skillDescription}</p>
        </>
      )}
    </article>
  );
}

function SonataDetail({ set }: { set: SonataSetData }) {
  return (
    <article>
      <h3 className="font-display text-3xl leading-none font-semibold tracking-wide text-ink">{set.name}</h3>
      <ul className="mt-3 space-y-2">
        {set.bonuses.map((bonus, i) => (
          <li key={i} className="text-xs text-fog">
            <span className="mr-1.5 rounded border border-line-strong bg-canvas px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-seal uppercase">
              {bonus.pieceCount}-piece
            </span>
            {bonus.effect.kind === 'stat' ? (
              <>
                {statLabel(bonus.effect.stat)} +{toDisplayValue(bonus.effect.stat, bonus.effect.value)}
                <span className="ml-1 text-dim">(structured)</span>
              </>
            ) : bonus.effect.kind === 'conditional' ? (
              <>
                {bonus.effect.condition}: {statLabel(bonus.effect.stat)} +
                {toDisplayValue(bonus.effect.stat, bonus.effect.value)}
              </>
            ) : (
              <span className="text-fog">{bonus.effect.note}</span>
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
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              aria-current={selectedId === c.id ? 'true' : undefined}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-terminal ${
                selectedId === c.id ? 'bg-panel-2 text-seal' : 'text-fog hover:bg-panel-2 hover:text-ink'
              }`}
            >
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
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedId(w.id)}
              aria-current={selectedId === w.id ? 'true' : undefined}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-terminal ${
                selectedId === w.id ? 'bg-panel-2 text-seal' : 'text-fog hover:bg-panel-2 hover:text-ink'
              }`}
            >
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
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(e.id)}
              aria-current={selectedId === e.id ? 'true' : undefined}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-terminal ${
                selectedId === e.id ? 'bg-panel-2 text-seal' : 'text-fog hover:bg-panel-2 hover:text-ink'
              }`}
            >
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
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            aria-current={selectedId === s.id ? 'true' : undefined}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-terminal ${
              selectedId === s.id ? 'bg-panel-2 text-seal' : 'text-fog hover:bg-panel-2 hover:text-ink'
            }`}
          >
            {s.name}
          </button>
        ))}
      />
    );
  };

  const renderDetail = (): ReactNode => {
    if (selectedId === null) return <p className="text-sm text-dim">Select an entry to inspect it.</p>;
    if (tab === 'characters') {
      const character = snapshot.characters.find((c) => c.id === selectedId);
      if (!character) return <p className="text-sm text-dim">Entry not found.</p>;
      return <CharacterDetail character={character} />;
    }
    if (tab === 'weapons') {
      const weapon = snapshot.weapons.find((w) => w.id === selectedId);
      if (!weapon) return <p className="text-sm text-dim">Entry not found.</p>;
      return <WeaponDetail weapon={weapon} />;
    }
    if (tab === 'echoes') {
      const echo = snapshot.echoDefs.find((e) => e.id === selectedId);
      if (!echo) return <p className="text-sm text-dim">Entry not found.</p>;
      return <EchoDetail echo={echo} sonataNameOf={sonataNameOf} />;
    }
    const set = snapshot.sonataSets.find((s) => s.id === selectedId);
    if (!set) return <p className="text-sm text-dim">Entry not found.</p>;
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
      <PageHeader
        eyebrow="06 // Records"
        title="Database"
        description={
          <>
            Sourced from encore.moe · {snapshot.fetchedAt.slice(0, 10)} · {snapshot.echoDefs.length} of 311
            echoes have verified cost data (the rest are skipped, never guessed).
          </>
        }
      />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Database sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 font-display text-lg font-semibold tracking-wide transition-terminal ${
                tab === t.id
                  ? 'border-seal text-ink'
                  : 'border-transparent text-dim hover:border-line-strong hover:text-fog'
              }`}
            >
              {t.label} <span className="font-mono text-[11px] font-medium tnum">({counts[t.id]})</span>
            </button>
          ))}
        </div>
        <div className="w-full max-w-xs">
          <label htmlFor="db-search" className={labelClass}>
            Search
          </label>
          <input
            id="db-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className={`${inputClass} mt-1.5`}
          />
        </div>
      </div>
      <div key={tab} className="animate-tt-fade mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="rounded-lg border border-line bg-panel p-2">{renderList()}</div>
        <div key={selectedId ?? 'none'} className="animate-tt-fade rounded-lg border border-line bg-panel p-4">
          {renderDetail()}
        </div>
      </div>
    </section>
  );
}

function List({ rows, empty }: { rows: ReactNode[]; empty: boolean }) {
  if (empty) return <p className="px-2 py-6 text-center text-sm text-fog">No matches — try a different search.</p>;
  return (
    <div>
      <p key={rows.length} aria-live="polite" className="animate-tt-pop px-2 pt-1 pb-2 font-mono text-[10px] tracking-[0.14em] text-dim uppercase tnum">
        {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
      </p>
      <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">{rows}</div>
    </div>
  );
}
