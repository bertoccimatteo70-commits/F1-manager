import React from 'react';
import type { GlobalSettings } from '../game/types';
import { storageAvailable } from '../game/save/storage';
import { Badge, Field, Panel } from './components';

export function SettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: GlobalSettings;
  onChange: (next: GlobalSettings) => void;
  onBack: () => void;
}) {
  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Preferenze</p>
          <h2>Impostazioni</h2>
          <p className="muted">Le impostazioni valgono per tutte le carriere.</p>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>
          ← Menu
        </button>
      </header>

      <div className="two-col">
        <Panel title="Gara e simulazione" subtitle="Queste scelte influenzano come vengono simulate le gare.">
          <Field label="Distanza di gara predefinita" hint="Puoi cambiarla anche prima di ogni weekend.">
            <div className="segmented">
              {([25, 50] as const).map((pct) => (
                <button
                  key={pct}
                  className={`seg ${settings.raceDistance === pct ? 'is-active' : ''}`}
                  onClick={() => onChange({ ...settings, raceDistance: pct })}
                >
                  {pct}% · {pct === 25 ? 'Sprint' : 'Classica'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Velocità di simulazione" hint={`${settings.simSpeed} ms per giro in modalità automatica`}>
            <input
              className="range"
              type="range"
              min={100}
              max={1200}
              step={50}
              value={settings.simSpeed}
              onChange={(e) => onChange({ ...settings, simSpeed: Number(e.target.value) })}
            />
          </Field>
          <Field label="Suggerimenti in pista" hint="Mostra avvisi su gomme, carburante e meteo.">
            <div className="segmented">
              <button className={`seg ${settings.showHints ? 'is-active' : ''}`} onClick={() => onChange({ ...settings, showHints: true })}>
                Attivi
              </button>
              <button className={`seg ${!settings.showHints ? 'is-active' : ''}`} onClick={() => onChange({ ...settings, showHints: false })}>
                Disattivati
              </button>
            </div>
          </Field>
        </Panel>

        <Panel title="Salvataggi" subtitle="Il gioco salva sul dispositivo, senza account né server.">
          <Field label="Salvataggio automatico" hint="Salva dopo weekend, contratti e passaggi di stagione.">
            <div className="segmented">
              <button className={`seg ${settings.autosave ? 'is-active' : ''}`} onClick={() => onChange({ ...settings, autosave: true })}>
                Attivo
              </button>
              <button className={`seg ${!settings.autosave ? 'is-active' : ''}`} onClick={() => onChange({ ...settings, autosave: false })}>
                Disattivato
              </button>
            </div>
          </Field>
          <p className="muted small">
            Puoi comunque salvare manualmente in qualsiasi momento con il pulsante «Salva» nella barra della carriera.
          </p>
          <div className="storage-line">
            <Badge tone={storageAvailable() ? 'good' : 'warn'}>
              {storageAvailable() ? 'Archivio locale disponibile' : 'Archivio locale non disponibile'}
            </Badge>
            <span className="muted small">In caso di blocco del browser, i dati restano validi solo per la sessione corrente.</span>
          </div>
        </Panel>
      </div>

      <Panel title="Privacy e monetizzazione" subtitle="Decisioni definitive del progetto.">
        <ul className="check-list">
          <li>Gioco completamente gratuito.</li>
          <li>Nessuna pubblicità, nessun acquisto in-app, nessun pay-to-win.</li>
          <li>Nessun tracciamento e nessun server: i dati non lasciano il dispositivo.</li>
          <li>Codice sorgente distribuito con licenza AGPL-3.0.</li>
        </ul>
      </Panel>
    </div>
  );
}
