import React from 'react';
import type { GlobalSettings } from '../game/types';
import { storageAvailable } from '../game/save/storage';
import { Badge, Field, InfoHint, Panel } from './components';
import { playTone } from './sound';
import { toast } from './toast';

export function SettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: GlobalSettings;
  onChange: (next: GlobalSettings) => void;
  onBack: () => void;
}) {
  const update = (patch: Partial<GlobalSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Preferenze</p>
          <h2>Impostazioni</h2>
          <p className="muted">Le impostazioni valgono per tutte le carriere e vengono salvate sul dispositivo.</p>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>
          ← Menu
        </button>
      </header>

      <div className="two-col">
        <Panel title="Grafica" subtitle="Tema, densità e movimento dell'interfaccia">
          <Field label="Tema">
            <div className="theme-picker">
              <button
                className={`theme-card theme-dark ${settings.theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => update({ theme: 'dark' })}
              >
                <span className="theme-swatch" />
                <strong>Scuro</strong>
                <small>Predefinito · notturno</small>
              </button>
              <button
                className={`theme-card theme-light ${settings.theme === 'light' ? 'is-active' : ''}`}
                onClick={() => update({ theme: 'light' })}
              >
                <span className="theme-swatch" />
                <strong>Chiaro</strong>
                <small>Per ambienti luminosi</small>
              </button>
            </div>
          </Field>

          <Field label="Densità dei contenuti" hint="Compatto mostra più dati senza cambiare la leggibilità.">
            <div className="segmented">
              <button className={`seg ${settings.density === 'comfortable' ? 'is-active' : ''}`} onClick={() => update({ density: 'comfortable' })}>
                Comoda
              </button>
              <button className={`seg ${settings.density === 'compact' ? 'is-active' : ''}`} onClick={() => update({ density: 'compact' })}>
                Compatta
              </button>
            </div>
          </Field>

          <Field label="Animazioni" hint="Disattivale per un'interfaccia immediata o per ridurre il movimento.">
            <div className="segmented">
              <button className={`seg ${settings.animations ? 'is-active' : ''}`} onClick={() => update({ animations: true })}>
                Attive
              </button>
              <button className={`seg ${!settings.animations ? 'is-active' : ''}`} onClick={() => update({ animations: false })}>
                Disattivate
              </button>
            </div>
          </Field>
        </Panel>

        <Panel title="Audio" subtitle="Effetti sonori sintetizzati, nessun file scaricato">
          <Field label="Effetti sonori" hint="Conferme, cambi scheda e avvisi. Nessuna musica, nessun download.">
            <div className="segmented">
              <button className={`seg ${settings.sound ? 'is-active' : ''}`} onClick={() => update({ sound: true })}>
                Attivi
              </button>
              <button className={`seg ${!settings.sound ? 'is-active' : ''}`} onClick={() => update({ sound: false })}>
                Disattivati
              </button>
            </div>
          </Field>
          <div className="form-actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (!settings.sound) {
                  toast('Attiva prima gli effetti sonori', 'warn');
                  return;
                }
                playTone('success');
                toast('Effetto di prova riprodotto', 'info');
              }}
            >
              Prova un suono
            </button>
            <span className="muted small">Volume gestito dal dispositivo.</span>
          </div>

          <Field label="Lingua dell'interfaccia">
            <div className="language-list">
              <div className="language-row is-active">
                <span className="language-flag">🇮🇹</span>
                <div>
                  <strong>Italiano</strong>
                  <small>Lingua completa del gioco</small>
                </div>
                <Badge tone="good">Attiva</Badge>
              </div>
              <div className="language-row is-disabled">
                <span className="language-flag">🇬🇧</span>
                <div>
                  <strong>English</strong>
                  <small>Non disponibile in questa versione</small>
                </div>
                <Badge tone="muted">In arrivo</Badge>
              </div>
            </div>
          </Field>
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Gara e simulazione" subtitle="Queste scelte influenzano come vengono simulate le gare.">
          <Field label="Distanza di gara predefinita" hint="Puoi cambiarla anche prima di ogni weekend.">
            <div className="segmented">
              {([25, 50] as const).map((pct) => (
                <button
                  key={pct}
                  className={`seg ${settings.raceDistance === pct ? 'is-active' : ''}`}
                  onClick={() => update({ raceDistance: pct })}
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
              onChange={(e) => update({ simSpeed: Number(e.target.value) })}
            />
          </Field>
          <Field label="Suggerimenti in pista" hint="Mostra avvisi su gomme, carburante e meteo.">
            <div className="segmented">
              <button className={`seg ${settings.showHints ? 'is-active' : ''}`} onClick={() => update({ showHints: true })}>
                Attivi
              </button>
              <button className={`seg ${!settings.showHints ? 'is-active' : ''}`} onClick={() => update({ showHints: false })}>
                Disattivati
              </button>
            </div>
          </Field>
          <Field label="Difficoltà predefinita" hint="Proposta alla creazione di una nuova carriera pilota.">
            <div className="segmented">
              {([
                { id: 'easy', label: 'Esordiente' },
                { id: 'normal', label: 'Professionista' },
                { id: 'hard', label: 'Veterano' },
              ] as const).map((level) => (
                <button
                  key={level.id}
                  className={`seg ${settings.difficulty === level.id ? 'is-active' : ''}`}
                  onClick={() => update({ difficulty: level.id })}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </Field>
        </Panel>

        <Panel title="Salvataggi" subtitle="Il gioco salva sul dispositivo, senza account né server.">
          <Field label="Salvataggio automatico" hint="Salva dopo weekend, contratti e passaggi di stagione.">
            <div className="segmented">
              <button className={`seg ${settings.autosave ? 'is-active' : ''}`} onClick={() => update({ autosave: true })}>
                Attivo
              </button>
              <button className={`seg ${!settings.autosave ? 'is-active' : ''}`} onClick={() => update({ autosave: false })}>
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
        <p className="muted small">
          Le uniche preferenze salvate sono quelle di questa pagina e i salvataggi delle carriere, entrambi nel
          localStorage del dispositivo. <InfoHint text="Puoi cancellare i dati dalle impostazioni del browser o eliminando le singole carriere." />
        </p>
      </Panel>
    </div>
  );
}
