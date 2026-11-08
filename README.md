# F1 Career Simulator

Simulatore manageriale di carriera nel motorsport, completamente gratuito, offline e senza pubblicità.
Il gioco offre **due carriere indipendenti** — pilota e scuderia — con tre categorie (Formula 3, Formula 2,
Formula 1), una simulazione di gara giro per giro e un **Editor nomi** che aggiorna davvero tutto il gioco.

> Gioco non affiliato a Formula 1, FIA, Formula Motorsport Limited o a team, piloti e sponsor reali. Nomi, emblemi
> e livree sono denominazioni originali e liberamente ispirate al motorsport, senza utilizzo di materiali ufficiali.

---

## Indice

- [Avvio rapido](#avvio-rapido)
- [Carriera pilota](#carriera-pilota)
- [Carriera scuderia](#carriera-scuderia)
- [Simulazione delle gare](#simulazione-delle-gare)
- [Campionati, punteggi e mercato](#campionati-punteggi-e-mercato)
- [Editor nomi](#editor-nomi)
- [Salvataggi](#salvataggi)
- [Struttura del progetto](#struttura-del-progetto)
- [Test e build](#test-e-build)
- [Distribuzione](#distribuzione)
- [Licenza e monetizzazione](#licenza-e-monetizzazione)

---

## Avvio rapido

Requisiti: Node.js 18+ e npm.

```bash
npm install
npm run dev        # server di sviluppo su http://localhost:5173
npm run build      # type-check + build di produzione in dist/
npm run preview    # anteprima della build
npm test           # suite di test (Vitest)
```

Il gioco è una PWA: dopo il primo caricamento da un server HTTP può essere installato sul dispositivo e usato
offline. Non richiede account, backend o connessione.

---

## Carriera pilota

- **Creazione del pilota**: nome, cognome, nazionalità, età, numero di gara, colore del casco, categoria di partenza
  (Formula 3 o Formula 2) e difficoltà (abilità iniziali e potenziale).
- **Abilità reali**: velocità pura, gestione pneumatici, gestione carburante, sorpassi, difesa, costanza, meteo e
  qualifica. Ogni abilità entra nei calcoli di passo, degrado, sorpassi e affidabilità.
- **Progressione**: ogni gara assegna XP; ogni 100 XP si ottiene un punto abilità da spendere nella scheda pilota.
  La crescita è limitata dal potenziale; dopo i 30 anni le abilità possono calare.
- **Contratti**: durata, stipendio, bonus vittoria/podio/titolo, obiettivo stagionale, penale di rescissione.
- **Mercato e offerte**: a fine stagione le scuderie propongono rinnovi, promozioni (F3 → F2 → F1) o nuove sfide in
  base a risultati, reputazione e posti liberi. È possibile trattare lo stipendio una volta per offerta; un rifiuto può
  far ritirare la proposta.
- **Licenziamenti e ritiro**: obiettivi mancati riducono l'interesse delle squadre; il pilota può rescindere pagando la
  penale o ritirarsi. Un free agent senza offerte può ripartire dalla categoria inferiore.

## Carriera scuderia

- **Fondazione**: nome, sigla, colori, emblema, categoria di partenza e solidità economica iniziale. La nuova squadra
  prende il posto della compagine più debole della categoria scelta.
- **Piloti**: due sedili, ingaggi dal mercato con stipendio e durata negoziabili, licenziamenti con penale, valutazione
  di età, overall, passo e tecnica.
- **Staff tecnico**: fino a 4 ingegneri (direttore tecnico, capo aerodinamico, capo motorista, ingegnere di pista) con
  valutazione, stipendio e impatto su sviluppo e affidabilità.
- **Ricerca e sviluppo**: sei aree (aerodinamica, motore, telaio, sospensioni, freni, affidabilità), progetti con costo,
  durata in gare, guadagno di prestazione e rischio di fallimento. I progetti avanzano a ogni gara e gli ingegneri
  migliori accelerano il lavoro.
- **Economia**: budget, entrate da sponsor e premi gara, stipendi, costi di gestione, investimenti, prestiti al 12%,
  premi di fine stagione e **bancarotta** se il bilancio scende sotto la soglia critica.
- **Sponsor**: contratti con pagamento per gara, obiettivo e bonus; massimo 4 sponsor attivi.

## Simulazione delle gare

Le gare non generano classifiche casuali: ogni vettura percorre ogni giro con un modello di prestazione.

- **Formato**: qualifiche con tre tentativi, griglia di partenza reale, gara al **25%** o **50%** della distanza.
- **Passo**: indice di prestazione che combina monoposto (aerodinamica, motore, telaio, sospensioni, freni) e pilota
  (velocità, costanza, qualifica, forma, morale), con penalità per gomme, carburante, danni e condizioni della pista.
- **Pneumatici**: mescole morbida/media/dura/intermedia/bagnata con vita utile dipendente da abrasività del circuito,
  abilità del pilota, aggressività e peso del carburante; oltre il limite la gomma cala bruscamente.
- **Carburante**: carico iniziale e mappe di consumo (risparmio/normale/prestazione) con effetto sul peso e rischio di
  rimanere a secco.
- **Strategia**: mescola di partenza, numero di soste programmate, gomme delle soste, aggressività e pit stop chiamati
  in corsa. In regime di Safety Car il tempo perso ai box si riduce.
- **Eventi**: guasti meccanici in base all'affidabilità, errori dei piloti, incidenti, forature, penalità, Safety Car,
  Virtual Safety Car, pioggia variabile, sorpassi e difese. I sorpassi dipendono da passo, abilità di sorpasso/difesa e
  difficoltà del circuito.
- **Interfaccia gara**: posizioni, distacchi, ultimo giro, gomme e usura, carburante, danni, meteo, bandiere, cronaca,
  radio e comandi strategici per ogni vettura del giocatore.

## Campionati, punteggi e mercato

- Tre campionati completi con calendari, circuiti, squadre e piloti dedicati:
  - **Formula 1**: 20 gare
  - **Formula 2**: 14 gare
  - **Formula 3**: 10 gare
- Punteggio 25-18-15-12-10-8-6-4-2-1; giro veloce +1 nelle prime dieci posizioni; pole +2 in F2/F3.
- Classifiche piloti e costruttori **ricalcolate dai risultati** (nessuna incoerenza tra tabella e archivio).
- Le categorie non giocate vengono simulate in parallelo: i risultati alimentano reputazione, promozioni, ritiri e
  mercato. Se il numero di piloti disponibili scende, entrano giovani debuttanti generati dal gioco per mantenere
  sempre griglie complete.
- Storico stagionale, palmarès, statistiche e calendario con i vincitori di ogni gara.

## Editor nomi

Accessibile dal menu principale, permette di rinominare:

- piloti (nome e cognome separati),
- scuderie (denominazione e sigla),
- sponsor, motori e fornitori,
- circuiti e Gran Premi,
- competizioni e trofei,
- mescole.

Ogni elemento mostra il nome predefinito, il nome attuale e un pulsante di ripristino; la ricerca filtra per nome o
categoria. Le modifiche sono salvate in un archivio separato (`localStorage`) e applicate tramite **identificatori**:
tutte le schermate, comprese le carriere in corso e i risultati delle gare passate, mostrano sempre il nome aggiornato.
Non vengono duplicati dati e non si perde nulla al riavvio.

## Salvataggi

- Più carriere indipendenti (pilota o scuderia), con nome, stagione, categoria e data di aggiornamento.
- Salvataggio automatico dopo weekend, contratti, acquisti, sviluppi e passaggi di stagione (disattivabile).
- Salvataggio manuale con il pulsante «Salva» nella barra della carriera.
- Salvataggio automatico anche quando la scheda passa in background.
- Caricamento, rinomina ed eliminazione delle carriere.
- Ripresa di una stagione interrotta, compreso un weekend in corso.
- I dati restano sul dispositivo: nessun server, nessun account.

## Struttura del progetto

```
src/
  game/
    data/catalog.ts        dataset di piloti, scuderie, circuiti, sponsor, motori, competizioni
    engine/world.ts        creazione del mondo, contratti, punteggi, classifiche
    engine/race.ts         qualifiche e simulazione giro per giro
    engine/career.ts       carriere, weekend, mercato, economia, sviluppo, passaggio stagione
    engine/format.ts       punteggi, formattazione tempi/denaro, descrizione eventi
    engine/rng.ts          generatore deterministico (seed) per simulazioni riproducibili
    names/registry.ts      nomi predefiniti + override dell'editor nomi
    save/storage.ts        salvataggi, indice carriere, impostazioni
    types.ts               modello dati completo
  ui/                      schermate React (menu, carriere, gara, mercato, editor nomi)
  styles.css               design system dell'interfaccia
tests/                     test di simulazione, classifiche, carriere, nomi e salvataggi
worker/index.js            Worker che serve la build statica (deploy)
```

Stack: **React 18 + TypeScript + Vite**, nessuna dipendenza runtime oltre a React. CSS scritto a mano, nessun asset
grafico ufficiale: emblemi e livree sono disegnati con CSS e colori configurabili.

## Test e build

```bash
npm test
```

Copre:

- qualifiche complete e ordinate;
- gara simulata con classifica coerente, punti, ritiri e giro veloce;
- determinismo della simulazione con lo stesso seed;
- esecuzione del piano soste;
- coerenza tra punti delle classifiche, risultati e squadre;
- ciclo completo di carriera pilota: creazione, weekend, stipendio, XP, fine stagione, offerte e nuova stagione;
- ciclo di carriera scuderia: fondazione, ingaggi, licenziamenti, sviluppo, weekend e stagione successiva;
- editor nomi: override, ripristino, isolamento per categoria;
- salvataggi: round-trip completo e relazioni tra contratti, piloti e squadre.

La build di produzione esegue `tsc --noEmit` prima di Vite: errori di tipo bloccano la pubblicazione.

## Distribuzione

La build è un sito statico in `dist/`, servito dal Worker in `worker/index.js` (fallback SPA + asset). Può essere
pubblicata su qualsiasi host statico o su Freebuff Sites con il manifest `sites-manifest.json`.

Non esiste al momento un packaging Android nativo: il progetto non include un progetto Gradle/Android né una pipeline
per generare un APK. L'installazione su Android avviene tramite il browser (PWA, «Aggiungi alla schermata Home»).
Qualunque futura build APK richiederebbe l'aggiunta di un contenitore nativo e di una toolchain Android.

## Licenza e monetizzazione

- Licenza: **GNU AGPL-3.0-or-later** (vedi `LICENSE`).
- Gioco gratuito, nessuna pubblicità, nessun acquisto in-app, nessun pay-to-win, nessuna funzione bloccata.
- Nessun tracciamento e nessun dato inviato a server.
