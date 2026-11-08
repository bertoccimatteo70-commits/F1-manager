import React, { useState } from 'react';
import type { SaveMeta } from '../game/save/storage';
import { Badge, ConfirmButton, Empty } from './components';

export function SavesScreen({
  metas,
  onBack,
  onLoad,
  onDelete,
  onRename,
  onCreate,
}: {
  metas: SaveMeta[];
  onBack: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCreate: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Archivio</p>
          <h2>Le tue carriere</h2>
          <p className="muted">I salvataggi restano sul dispositivo. Puoi tenerne più di uno in parallelo.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={onCreate}>
            + Nuova carriera
          </button>
          <button className="btn btn-ghost" onClick={onBack}>
            ← Menu
          </button>
        </div>
      </header>

      {metas.length === 0 ? (
        <Empty title="Nessuna carriera salvata">
          Crea la tua prima carriera: potrai scegliere se interpretare un pilota o fondare una scuderia.
        </Empty>
      ) : (
        <div className="saves-grid">
          {metas.map((meta) => (
            <article key={meta.id} className="panel save-card">
              <div className="panel-body">
                <div className="save-card-head">
                  <Badge tone={meta.mode === 'driver' ? 'info' : 'good'}>
                    {meta.mode === 'driver' ? 'Pilota' : 'Scuderia'}
                  </Badge>
                  <Badge tone="muted">Stagione {meta.season}</Badge>
                  {meta.phase === 'offseason' && <Badge tone="warn">Mercato</Badge>}
                  {meta.phase === 'weekend' && <Badge tone="warn">Weekend</Badge>}
                  {meta.phase === 'ended' && <Badge tone="bad">Conclusa</Badge>}
                </div>
                {editing === meta.id ? (
                  <div className="rename-row">
                    <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={50} autoFocus />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        onRename(meta.id, draft);
                        setEditing(null);
                      }}
                    >
                      OK
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>
                      Annulla
                    </button>
                  </div>
                ) : (
                  <h3 className="save-name">{meta.name}</h3>
                )}
                <p className="save-meta">
                  {meta.category ?? '—'} · aggiornata il {new Date(meta.updatedAt).toLocaleString('it-IT')}
                </p>
                <div className="save-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => onLoad(meta.id)}>
                    Carica
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditing(meta.id);
                      setDraft(meta.name);
                    }}
                  >
                    Rinomina
                  </button>
                  <ConfirmButton
                    label="Elimina"
                    confirmLabel="Confermi?"
                    className="btn btn-ghost btn-sm"
                    onConfirm={() => onDelete(meta.id)}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
