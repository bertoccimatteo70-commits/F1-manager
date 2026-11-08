import React from 'react';
import { APP_NAME, APP_VERSION } from '../game/version';
import { Badge, Panel } from './components';

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Informazioni</p>
          <h2>{APP_NAME}</h2>
          <p className="muted">Simulatore manageriale di carriera nel motorsport · versione {APP_VERSION}</p>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>
          ← Menu
        </button>
      </header>

      <div className="two-col">
        <Panel title="Due carriere, un mondo che vive">
          <p className="prose">
            In <strong>Carriera Pilota</strong> crei il tuo pilota, parti dalla Formula 3 o dalla Formula 2 e costruisci
            una carriera fatta di risultati, contratti e mercato. Le abilità crescono con l'esperienza e influenzano
            davvero il passo, il degrado delle gomme, i sorpassi e la tenuta sotto pressione.
          </p>
          <p className="prose">
            In <strong>Carriera Scuderia</strong> fondi una squadra, assumi piloti e ingegneri, sviluppi la monoposto e
            gestisci un bilancio che può portare al titolo o alla bancarotta. Le altre categorie vengono simulate in
            parallelo, così i risultati alimentano promozioni, ritiri e mercato.
          </p>
        </Panel>

        <Panel title="La simulazione">
          <ul className="check-list">
            <li>Qualifiche con tre tentativi e griglia di partenza reale.</li>
            <li>Gara giro per giro: passo, degrado, carburante, meteo variabile.</li>
            <li>Strategie: mescole, numero di soste, momento del pit, aggressività, carburante.</li>
            <li>Incidenti, guasti, forature, penalità, Safety Car e Virtual Safety Car.</li>
            <li>Sorpassi e difese calcolati sulle abilità dei piloti e sulle caratteristiche del circuito.</li>
            <li>Punti, giri veloci, pole e classifiche ricalcolate dai risultati.</li>
          </ul>
        </Panel>
      </div>

      <div className="two-col">
        <Panel title="Editor nomi">
          <p className="prose">
            L'editor permette di rinominare piloti, scuderie, sponsor, motori, circuiti e competizioni. Le modifiche sono
            salvate in un archivio separato e applicate tramite identificatori: ogni schermata, comprese le carriere già
            iniziate e i risultati delle gare passate, mostra sempre il nome aggiornato. Ogni voce può essere riportata al
            valore predefinito.
          </p>
        </Panel>

        <Panel title="Gratuito, offline, senza compromessi">
          <p className="prose">
            Nessuna pubblicità, nessun acquisto in-app, nessun pay-to-win e nessuna funzione bloccata. Il gioco funziona
            interamente nel browser, salva sul dispositivo e può essere installato come app. Il codice è distribuito con
            licenza AGPL-3.0.
          </p>
          <div className="badge-row">
            <Badge tone="good">Gratuito</Badge>
            <Badge tone="good">Nessuna pubblicità</Badge>
            <Badge tone="good">Nessun acquisto in-app</Badge>
            <Badge tone="good">Offline</Badge>
            <Badge tone="info">AGPL-3.0</Badge>
          </div>
        </Panel>
      </div>

      <Panel title="Note legali">
        <p className="prose small">
          {APP_NAME} è un'opera indipendente e non è affiliata, associata, autorizzata o sponsorizzata da Formula 1, FIA,
          Formula Motorsport Limited o da qualsiasi scuderia, pilota, sponsor o fornitore reale. Nomi, emblemi e livree
          presenti nel gioco sono denominazioni originali e liberamente ispirate al mondo del motorsport, senza utilizzo
          di loghi, marchi o materiali grafici ufficiali. Ogni riferimento a persone o aziende reali è da intendersi come
          citazione del tutto fantastica.
        </p>
        <p className="prose small">
          Tecnologie: React, TypeScript, Vite. Salvataggi in localStorage. Nessun dato personale viene raccolto o
          trasmesso.
        </p>
      </Panel>
    </div>
  );
}
