# Changelog

Tutte le modifiche rilevanti di F1 Career Simulator.

## [1.0.1] — 2026-11-08

### Corretto

- La classifica finale è visibile subito dopo aver simulato una gara fino alla fine: prima del fix la schermata
  mostrava «Risultato non disponibile» finché non si confermava il weekend. Ora la classifica provvisoria (posizioni,
  griglia, distacchi, punti, soste, pole, giro veloce, momenti chiave) viene calcolata appena la gara termina ed è
  disponibile anche per i salvataggi creati prima della correzione. I risultati entrano nel campionato solo alla conferma.

### Aggiunto

- **Progetto Android nativo con Capacitor** (`android/`, `capacitor.config.json`) e workflow GitHub Actions
  `.github/workflows/android.yml` che compila l'APK debug e lo carica negli artifacts (`f1-career-simulator-apk`).
- Script `npm run android:sync` e `npm run android:apk` per la build locale con JDK 17 e Android SDK.
- Versione applicazione 1.0.1 (versionCode 2) anche nell'APK.

### Note

- L'APK è una build debug firmata con la chiave di debug di Gradle: installabile su Android abilitando le origini
  sconosciute. Non è distribuito su Google Play.

## [1.0.0] — 2026-11-08

Prima versione completa e giocabile.

### Aggiunto

- **Due modalità di carriera indipendenti**: Carriera Pilota e Carriera Scuderia, selezionabili dal menu.
- **Menu principale** con nuova carriera, continua, gestione carriere, impostazioni, editor nomi e informazioni.
- **Creazione pilota**: nome, cognome, nazionalità, età, numero, casco, categoria di partenza, difficoltà.
- **Progressione pilota**: otto abilità influenti, XP per gara, punti abilità spendibili, potenziale e declino legato all'età.
- **Contratti completi**: durata, stipendio, bonus, obiettivi, clausole, penali, rinnovi e trattative.
- **Mercato piloti**: offerte di fine stagione con promozioni F3 → F2 → F1, rinnovi, nuove sfide e fallback per free agent.
- **Carriera scuderia**: fondazione con nome, sigla, colori, emblema, categoria e solidità economica.
- **Gestione del personale**: ingaggio e licenziamento di piloti, quattro ruoli tecnici con valutazione e stipendio.
- **Ricerca e sviluppo**: sei aree della monoposto, progetti con costo, durata, guadagno e rischio.
- **Economia di squadra**: budget, sponsor, premi, stipendi, costi di gestione, prestiti e bancarotta.
- **Simulazione gara giro per giro**: qualifiche, griglia, passo, degrado, carburante, meteo variabile, Safety Car, VSC,
  incidenti, guasti, forature, penalità, sorpassi, difese e giri veloci.
- **Strategia interattiva**: mescole, soste programmate, pit immediato, aggressività e mappa carburante per ogni vettura.
- **Tre campionati** con calendari dedicati, classifiche piloti e costruttori ricalcolate dai risultati.
- **Simulazione parallela** delle categorie non giocate, con promozioni, ritiri, mercato e debuttanti generati.
- **Editor nomi** per piloti, scuderie, sponsor, motori, circuiti, Gran Premi, competizioni e mescole, con ricerca,
  valore predefinito, ripristino puntuale e ripristino per categoria; le modifiche si applicano anche alle carriere in corso.
- **Salvataggi multipli**, autosalvataggio, salvataggio manuale, caricamento, rinomina, eliminazione e ripresa del weekend.
- **Interfaccia completa**: dashboard, calendario, classifiche, mercato, finanze, sviluppo, staff, profilo, weekend di gara,
  risultati, mercato di fine stagione e schermata di fine carriera.
- **PWA installabile e offline** con manifest, icona e service worker.
- **Suite di test** su simulazione, classifiche, carriere, nomi e persistenza.

### Note

- Nessuna pubblicità, nessun acquisto in-app, nessun pay-to-win.
- Packaging APK: disponibile dalla versione 1.0.1 tramite la workflow GitHub Actions (build debug).
