import React, { useEffect, useMemo, useState } from 'react';
import {
  NAME_KIND_LABEL,
  baseName,
  isOverridden,
  nameEntries,
  resetAllNames,
  resetName,
  setName,
  t,
} from '../game/names/registry';
import type { NameKind } from '../game/data/catalog';
import { DRIVERS, TEAMS } from '../game/data/catalog';
import { Badge, ConfirmButton, Empty } from './components';

const KIND_ORDER: NameKind[] = ['driver', 'team', 'sponsor', 'engine', 'circuit', 'competition', 'tyre'];

interface EntryInfo {
  primary: string;
  secondary: string;
}

function entryInfo(id: string, kind: NameKind, ownerId: string, base: string): EntryInfo {
  if (kind === 'driver') {
    const def = DRIVERS.find((d) => d.id === ownerId);
    return {
      primary: def ? `${def.first} ${def.last}` : base,
      secondary: id.endsWith('.first') ? 'Nome' : 'Cognome',
    };
  }
  if (kind === 'team') {
    const team = TEAMS.find((x) => x.id === ownerId);
    return { primary: team?.name ?? base, secondary: id.endsWith('.short') ? 'Sigla' : 'Denominazione' };
  }
  if (kind === 'competition' && id.startsWith('comp.gp.')) {
    return { primary: base, secondary: 'Gran Premio' };
  }
  return { primary: base, secondary: NAME_KIND_LABEL[kind] };
}

export function NameEditor({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<'all' | NameKind>('driver');
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);
  const [limit, setLimit] = useState(60);

  const entries = useMemo(() => nameEntries(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false;
      if (!q) return true;
      const info = entryInfo(entry.id, entry.kind, entry.ownerId, baseName(entry.id));
      return (
        baseName(entry.id).toLowerCase().includes(q) ||
        t(entry.id).toLowerCase().includes(q) ||
        info.primary.toLowerCase().includes(q) ||
        info.secondary.toLowerCase().includes(q)
      );
    });
  }, [entries, kind, query, version]);

  const modifiedCount = entries.filter((e) => isOverridden(e.id)).length;
  const shown = filtered.slice(0, limit);

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Personalizzazione</p>
          <h2>Editor nomi</h2>
          <p className="muted">
            Ogni modifica si applica immediatamente a menu, classifiche, calendari, contratti, risultati e carriere in
            corso. I nomi restano salvati anche dopo la chiusura del gioco.
          </p>
        </div>
        <div className="head-actions">
          {modifiedCount > 0 && <Badge tone="info">{modifiedCount} nomi modificati</Badge>}
          <ConfirmButton
            label="Ripristina tutto"
            confirmLabel="Ripristina tutti i nomi?"
            className="btn btn-ghost btn-sm"
            onConfirm={() => {
              resetAllNames();
              setVersion((v) => v + 1);
            }}
          />
          <button className="btn btn-ghost" onClick={onBack}>
            ← Menu
          </button>
        </div>
      </header>

      <div className="name-toolbar">
        <input
          className="input search-input"
          placeholder="Cerca pilota, scuderia, circuito…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(60);
          }}
        />
        <div className="name-tabs">
          <button className={`chip ${kind === 'all' ? 'is-active' : ''}`} onClick={() => setKind('all')}>
            Tutti
          </button>
          {KIND_ORDER.map((k) => (
            <button key={k} className={`chip ${kind === k ? 'is-active' : ''}`} onClick={() => setKind(k)}>
              {NAME_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty title="Nessun risultato">Prova con un altro termine di ricerca o cambia categoria.</Empty>
      ) : (
        <div className="name-list">
          {shown.map((entry) => (
            <NameRow key={entry.id} id={entry.id} kind={entry.kind} ownerId={entry.ownerId} version={version} onChanged={() => setVersion((v) => v + 1)} />
          ))}
        </div>
      )}

      {filtered.length > shown.length && (
        <button className="btn btn-ghost load-more" onClick={() => setLimit((l) => l + 60)}>
          Mostra altri {Math.min(60, filtered.length - shown.length)} ({filtered.length - shown.length} rimanenti)
        </button>
      )}

      <p className="muted small name-note">
        I nomi predefiniti sono liberamente ispirati al motorsport reale ma sono denominazioni distinte. Il gioco non usa
        loghi, livree o identità grafiche ufficiali.
      </p>
    </div>
  );
}

function NameRow({
  id,
  kind,
  ownerId,
  version,
  onChanged,
}: {
  id: string;
  kind: NameKind;
  ownerId: string;
  version: number;
  onChanged: () => void;
}) {
  const [value, setValue] = useState(t(id));
  const [focused, setFocused] = useState(false);
  const base = baseName(id);
  const info = entryInfo(id, kind, ownerId, base);
  const overridden = isOverridden(id);

  useEffect(() => {
    if (!focused) setValue(t(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, id]);

  const commit = () => {
    setName(id, value);
    setValue(t(id));
    onChanged();
  };

  return (
    <div className={`name-row ${overridden ? 'is-modified' : ''}`}>
      <div className="name-row-info">
        <strong>{info.primary}</strong>
        <span className="name-row-kind">{info.secondary}</span>
      </div>
      <div className="name-row-base">
        <span className="name-row-base-label">Predefinito</span>
        <span className={overridden ? 'strike' : ''}>{base}</span>
      </div>
      <div className="name-row-input">
        <input
          className="input"
          value={value}
          maxLength={40}
          onFocus={() => setFocused(true)}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setValue(t(id));
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button
          className="icon-btn"
          disabled={!overridden}
          title="Ripristina nome predefinito"
          onClick={() => {
            resetName(id);
            setValue(base);
            onChanged();
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
