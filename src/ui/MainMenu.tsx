import React from 'react';
import type { SaveMeta } from '../game/save/storage';
import { APP_TAGLINE, APP_VERSION } from '../game/version';
import { Badge } from './components';

export function MainMenu({
  latest,
  onNew,
  onContinue,
  onSaves,
  onSettings,
  onNames,
  onAbout,
  overrideCount,
  theme,
  onToggleTheme,
}: {
  latest: SaveMeta | null;
  onNew: () => void;
  onContinue: () => void;
  onSaves: () => void;
  onSettings: () => void;
  onNames: () => void;
  onAbout: () => void;
  overrideCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  return (
    <div className="menu-screen">
      <div className="menu-glow" />
      <div className="menu-content">
        <div className="menu-topline">
          <span className="brand-mark">
            <span className="brand-mark-bar" style={{ background: 'var(--accent)' }} />
            <span className="brand-mark-bar" style={{ background: 'var(--text)' }} />
            <span className="brand-mark-bar" style={{ background: 'var(--accent-2)' }} />
          </span>
          <span className="menu-topline-text">Simulatore manageriale · Stagione 2026</span>
          <div className="menu-topline-actions">
            <Badge tone="muted">v{APP_VERSION}</Badge>
            <button className="icon-btn" onClick={onToggleTheme} aria-label="Cambia tema" title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>

        <div className="hero">
          <div className="hero-copy">
            <p className="hero-kicker">MOTORSPORT MANAGEMENT</p>
            <h1 className="hero-title">
              F1 <span className="hero-title-accent">CAREER</span>
              <br />
              SIMULATOR
            </h1>
            <p className="hero-sub">{APP_TAGLINE}</p>
            <p className="hero-desc">
              Costruisci la carriera di un pilota dalla Formula 3 alla Formula 1, oppure fonda una scuderia e guidala
              tra contratti, sviluppo e gare simulate giro per giro. Tutto gratuito, offline e senza pubblicità.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={onNew}>
                Nuova carriera
              </button>
              {latest ? (
                <button className="btn btn-secondary btn-lg" onClick={onContinue}>
                  Continua
                </button>
              ) : (
                <button className="btn btn-ghost btn-lg" disabled>
                  Nessuna carriera
                </button>
              )}
            </div>
            {latest && (
              <div className="continue-card">
                <div className="continue-head">
                  <span className="continue-label">Ultimo salvataggio</span>
                  <span className="continue-phase">
                    {latest.phase === 'weekend' ? 'Weekend' : latest.phase === 'offseason' ? 'Mercato' : latest.phase === 'ended' ? 'Conclusa' : 'Stagione'} {latest.season}
                  </span>
                </div>
                <strong className="continue-name">{latest.name}</strong>
                <span className="continue-meta">
                  {latest.mode === 'driver' ? 'Carriera pilota' : 'Carriera scuderia'} · {latest.category ?? '—'} ·{' '}
                  {new Date(latest.updatedAt).toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
          </div>

          <div className="hero-visual" aria-hidden>
            <div className="hero-ring" />
            <div className="hero-car">
              <div className="hero-car-body" />
              <div className="hero-car-wing" />
              <div className="hero-car-wing rear" />
              <div className="hero-wheel left" />
              <div className="hero-wheel right" />
            </div>
            <div className="hero-telemetry">
              <div>
                <span>Velocità</span>
                <strong>324</strong>
                <em>km/h</em>
              </div>
              <div>
                <span>Giri</span>
                <strong>57</strong>
                <em>GP</em>
              </div>
              <div>
                <span>Gomma</span>
                <strong>S</strong>
                <em>soft</em>
              </div>
            </div>
          </div>
        </div>

        <div className="menu-cards">
          <button className="menu-card" onClick={onSaves}>
            <span className="menu-card-icon">▤</span>
            <strong>Gestisci carriere</strong>
            <small>Carica, rinomina o elimina i salvataggi</small>
          </button>
          <button className="menu-card" onClick={onNames}>
            <span className="menu-card-icon">✎</span>
            <strong>Editor nomi</strong>
            <small>
              Personalizza piloti, scuderie, sponsor e circuiti
              {overrideCount > 0 ? ` · ${overrideCount} modificati` : ''}
            </small>
          </button>
          <button className="menu-card" onClick={onSettings}>
            <span className="menu-card-icon">⚙</span>
            <strong>Impostazioni</strong>
            <small>Tema, audio, lingua, difficoltà e simulazione</small>
          </button>
          <button className="menu-card" onClick={onAbout}>
            <span className="menu-card-icon">ⓘ</span>
            <strong>Informazioni</strong>
            <small>Come funziona il gioco e note legali</small>
          </button>
        </div>

        <footer className="menu-footer">
          <span>Gratuito · Nessuna pubblicità · Nessun acquisto in-app · AGPL-3.0</span>
          <span>
            Gioco non affiliato a Formula 1, FIA o ai team reali. Nomi e livree sono liberamente ispirati e distinti.
          </span>
        </footer>
      </div>
    </div>
  );
}
