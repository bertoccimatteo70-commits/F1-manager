import React, { useMemo, useState } from 'react';
import type { Category, GlobalSettings, SaveGame } from '../game/types';
import type { StandingRow } from '../game/engine/world';
import {
  beginWeekend,
  contractOf,
  driverFullName,
  economicSnapshot,
  nextRoundOf,
  playerCategoryOf,
  playerDriverOf,
  playerSeriesOf,
  playerTeamOf,
  quickSimulateWeekend,
  spendSkillPoint,
  teamLabel,
} from '../game/engine/career';
import { CIRCUITS, circuitCountry, CATEGORY_LABEL } from '../game/data/catalog';
import { computeStandings, overallRating } from '../game/engine/world';
import { countryFlag, formatGap, formatMoney, phaseLabel } from '../game/engine/format';
import { t } from '../game/names/registry';
import {
  Badge,
  Bar,
  Empty,
  MiniBars,
  Modal,
  Money,
  NationFlag,
  Panel,
  PositionBadge,
  Sparkline,
  Stat,
  TeamDot,
  TeamLogo,
} from './components';
import { driverName, newsText, useNames } from './helpers';
import { FinanceTab, MarketTab, OffseasonPanel, DevelopmentTab, StaffTab } from './CareerManagement';
import { ArchiveTab, ContractsTab, CustomizeTab, NewsTab } from './CareerSections';
import { WeekendScreen } from './WeekendScreen';
import { toast } from './toast';

type Tab =
  | 'dashboard'
  | 'calendar'
  | 'standings'
  | 'market'
  | 'contracts'
  | 'finance'
  | 'development'
  | 'staff'
  | 'profile'
  | 'news'
  | 'archive'
  | 'customize';

interface NavEntry {
  id: Tab;
  label: string;
  icon: string;
  group: 'Paddock' | 'Gestione' | 'Mondo' | 'Identità';
  teamOnly?: boolean;
}

const NAV: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈', group: 'Paddock' },
  { id: 'calendar', label: 'Calendario', icon: '▦', group: 'Paddock' },
  { id: 'standings', label: 'Classifiche', icon: '≡', group: 'Paddock' },
  { id: 'market', label: 'Mercato', icon: '⇄', group: 'Gestione' },
  { id: 'contracts', label: 'Contratti', icon: '✎', group: 'Gestione' },
  { id: 'finance', label: 'Finanze', icon: '€', group: 'Gestione' },
  { id: 'development', label: 'Sviluppo', icon: '⚙', group: 'Gestione', teamOnly: true },
  { id: 'staff', label: 'Staff', icon: '☰', group: 'Gestione', teamOnly: true },
  { id: 'news', label: 'Notizie', icon: '◉', group: 'Mondo' },
  { id: 'archive', label: 'Archivio', icon: '▤', group: 'Mondo' },
  { id: 'profile', label: 'Profilo', icon: '◇', group: 'Identità' },
  { id: 'customize', label: 'Personalizza', icon: '◐', group: 'Identità' },
];

const MOBILE_PRIMARY: Tab[] = ['dashboard', 'calendar', 'standings', 'market'];

export function CareerScreen({
  save,
  settings,
  onUpdate,
  onMenu,
  onSave,
  onToggleTheme,
}: {
  save: SaveGame;
  settings: GlobalSettings;
  onUpdate: (next: SaveGame, persist?: boolean) => void;
  onMenu: () => void;
  onSave: () => void;
  onToggleTheme: () => void;
}) {
  useNames();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const isDriver = save.player.kind === 'driver';
  const team = playerTeamOf(save);
  const driver = playerDriverOf(save);
  const category = playerCategoryOf(save);
  const series = playerSeriesOf(save);
  const money = isDriver ? (save.player.kind === 'driver' ? save.player.money : 0) : team?.budget ?? 0;
  const unread = Math.max(0, save.news.length - (save.newsSeenCount ?? 0));

  if (save.phase === 'weekend' && save.weekend) {
    return (
      <WeekendScreen
        save={save}
        settings={settings}
        onUpdate={onUpdate}
        onMenu={onMenu}
        onExit={() => {
          onUpdate(save, true);
          setTab('dashboard');
        }}
      />
    );
  }

  const saveNow = () => {
    onSave();
    setSavedFlash(true);
    toast('Partita salvata sul dispositivo', 'good');
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const entries = NAV.filter((item) => (item.teamOnly ? save.player.kind === 'team' : true));
  const groups = ['Paddock', 'Gestione', 'Mondo', 'Identità'] as const;
  const current = entries.find((entry) => entry.id === tab) ?? entries[0];

  const selectTab = (next: Tab) => {
    setTab(next);
    setMoreOpen(false);
  };

  return (
    <div className="career-shell">
      <header className="career-topbar">
        <div className="career-identity">
          {save.player.kind === 'team' && team ? (
            <TeamLogo team={team} size={42} />
          ) : (
            <span className="helmet-mini" style={{ background: `linear-gradient(135deg, ${driver?.helmet ?? '#e10600'}, #101010)` }}>
              <span className="helmet-visor mini" />
            </span>
          )}
          <div>
            <strong className="career-name">{save.name}</strong>
            <span className="career-sub">
              Stagione {save.world.season}
              {category ? ` · ${CATEGORY_LABEL[category]}` : ''} · {phaseLabel(save.phase)}
              {series ? ` · round ${Math.min(series.roundIndex + 1, series.calendar.length)}/${series.calendar.length}` : ''}
            </span>
          </div>
        </div>
        <div className="career-meta">
          <div className="meta-block">
            <span className="meta-label">{isDriver ? 'Patrimonio' : 'Budget'}</span>
            <span className="meta-value">
              <Money value={money} />
            </span>
          </div>
          <div className="meta-block meta-block-hide-sm">
            <span className="meta-label">Serie</span>
            <span className="meta-value">{category ?? '—'}</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={onToggleTheme} title={settings.theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'} aria-label="Cambia tema">
              {settings.theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={saveNow}>
              {savedFlash ? '✓ Salvato' : 'Salva'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onMenu}>
              Menu
            </button>
          </div>
        </div>
      </header>

      <nav className="career-nav" aria-label="Sezioni carriera">
        {groups.map((group) => {
          const groupEntries = entries.filter((entry) => entry.group === group);
          if (groupEntries.length === 0) return null;
          return (
            <div key={group} className="nav-group">
              <span className="nav-group-label">{group}</span>
              <div className="nav-items">
                {groupEntries.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${tab === item.id ? 'is-active' : ''}`}
                    onClick={() => selectTab(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                    {item.id === 'news' && unread > 0 && <span className="nav-badge">{unread}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <main className="career-main">
        <div className="career-section-head">
          <div>
            <p className="eyebrow">{current.group}</p>
            <h2>{current.label}</h2>
          </div>
          {tab !== 'dashboard' && (
            <button className="btn btn-ghost btn-sm" onClick={() => selectTab('dashboard')}>
              ← Dashboard
            </button>
          )}
        </div>

        {save.phase === 'offseason' && tab === 'dashboard' ? (
          <OffseasonPanel save={save} onUpdate={onUpdate} onOpenMarket={() => setTab('market')} />
        ) : save.phase === 'ended' && tab === 'dashboard' ? (
          <EndedPanel save={save} onMenu={onMenu} />
        ) : tab === 'dashboard' ? (
          <Dashboard save={save} settings={settings} onUpdate={onUpdate} goTo={selectTab} />
        ) : tab === 'calendar' ? (
          <CalendarTab save={save} />
        ) : tab === 'standings' ? (
          <StandingsTab save={save} />
        ) : tab === 'market' ? (
          <MarketTab save={save} onUpdate={onUpdate} />
        ) : tab === 'contracts' ? (
          <ContractsTab save={save} onUpdate={onUpdate} />
        ) : tab === 'finance' ? (
          <FinanceTab save={save} onUpdate={onUpdate} />
        ) : tab === 'development' ? (
          <DevelopmentTab save={save} onUpdate={onUpdate} />
        ) : tab === 'staff' ? (
          <StaffTab save={save} onUpdate={onUpdate} />
        ) : tab === 'news' ? (
          <NewsTab save={save} onUpdate={onUpdate} />
        ) : tab === 'archive' ? (
          <ArchiveTab save={save} />
        ) : tab === 'customize' ? (
          <CustomizeTab save={save} onUpdate={onUpdate} />
        ) : (
          <ProfileTab save={save} onUpdate={onUpdate} goTo={selectTab} />
        )}
      </main>

      <nav className="mobile-nav" aria-label="Navigazione rapida">
        {MOBILE_PRIMARY.map((id) => {
          const entry = entries.find((item) => item.id === id);
          if (!entry) return null;
          return (
            <button key={id} className={`mobile-nav-item ${tab === id ? 'is-active' : ''}`} onClick={() => selectTab(id)}>
              <span>{entry.icon}</span>
              {entry.label}
            </button>
          );
        })}
        <button className={`mobile-nav-item ${!MOBILE_PRIMARY.includes(tab) ? 'is-active' : ''}`} onClick={() => setMoreOpen(true)}>
          <span>⋯</span>
          Altro
        </button>
      </nav>

      <Modal open={moreOpen} title="Tutte le sezioni" onClose={() => setMoreOpen(false)}>
        <div className="sheet-grid">
          {entries.map((entry) => (
            <button key={entry.id} className={`sheet-item ${tab === entry.id ? 'is-active' : ''}`} onClick={() => selectTab(entry.id)}>
              <span className="sheet-icon">{entry.icon}</span>
              <strong>{entry.label}</strong>
              <small>{entry.group}</small>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({
  save,
  settings,
  onUpdate,
  goTo,
}: {
  save: SaveGame;
  settings: GlobalSettings;
  onUpdate: (next: SaveGame, persist?: boolean) => void;
  goTo: (tab: Tab) => void;
}) {
  const category = playerCategoryOf(save);
  const series = playerSeriesOf(save);
  const round = nextRoundOf(save);
  const isDriver = save.player.kind === 'driver';
  const driver = playerDriverOf(save);
  const team = playerTeamOf(save);
  const standings = category ? computeStandings(save.world, category) : { drivers: [], teams: [] };
  const myRow = isDriver
    ? standings.drivers.find((row) => row.id === (save.player.kind === 'driver' ? save.player.driverId : ''))
    : standings.teams.find((row) => row.id === (save.player.kind === 'team' ? save.player.teamId : ''));
  const leaderPoints = isDriver ? standings.drivers[0]?.points ?? 0 : standings.teams[0]?.points ?? 0;
  const snapshot = economicSnapshot(save);
  const circuit = round ? CIRCUITS.find((entry) => entry.id === round.circuitId) : null;
  const lapsAtPct = round ? Math.max(6, Math.round((round.laps * settings.raceDistance) / 100)) : 0;

  const progression = useMemo(() => {
    if (!series) return [];
    const id = save.player.kind === 'driver' ? save.player.driverId : null;
    const teamId = save.player.kind === 'team' ? save.player.teamId : null;
    const sorted = series.results.slice().sort((a, b) => a.roundIndex - b.roundIndex);
    let total = 0;
    return sorted.map((result) => {
      total += result.rows
        .filter((row) => (id ? row.driverId === id : row.teamId === teamId))
        .reduce((sum, row) => sum + row.points, 0);
      return total;
    });
  }, [series, save.player, save.updatedAt]);

  const recent = useMemo(() => {
    if (!series) return [];
    const id = save.player.kind === 'driver' ? save.player.driverId : null;
    const teamId = save.player.kind === 'team' ? save.player.teamId : null;
    return series.results
      .slice()
      .sort((a, b) => b.roundIndex - a.roundIndex)
      .slice(0, 6)
      .reverse()
      .map((result) => {
        const rows = result.rows.filter((row) => (id ? row.driverId === id : row.teamId === teamId));
        return {
          round: result.roundIndex,
          position: rows.length ? Math.min(...rows.map((row) => row.position)) : 0,
          points: rows.reduce((sum, row) => sum + row.points, 0),
        };
      });
  }, [series, save.player, save.updatedAt]);

  const enterWeekend = () => {
    const next = beginWeekend(save, settings.raceDistance);
    onUpdate(next, true);
    toast('Weekend iniziato: qualifiche e strategia pronte', 'info');
  };

  const quickSim = () => {
    const next = quickSimulateWeekend(save, settings.raceDistance);
    onUpdate(next, true);
    toast('Weekend simulato: risultati aggiornati', 'good');
  };

  return (
    <div className="dash">
      <div className="kpi-strip">
        <Stat
          label={isDriver ? 'Posizione piloti' : 'Posizione costruttori'}
          value={myRow ? `P${myRow.position}` : '—'}
          hint={`su ${isDriver ? standings.drivers.length : standings.teams.length} · ${myRow?.points ?? 0} punti`}
          accent="var(--accent)"
        />
        <Stat
          label="Distacco dalla vetta"
          value={myRow ? (leaderPoints <= 0 ? '—' : myRow.position === 1 ? 'Leader' : `−${leaderPoints - myRow.points}`) : '—'}
          hint="punti"
          accent="var(--gold)"
        />
        <Stat
          label={isDriver ? 'Patrimonio' : 'Budget'}
          value={<Money value={isDriver ? (save.player.kind === 'driver' ? save.player.money : 0) : team?.budget ?? 0} />}
          hint={isDriver ? 'stipendi e bonus' : `saldo/gara ${formatMoney(snapshot.balance)}`}
          accent="var(--accent-2)"
        />
        <Stat
          label="Prossimo round"
          value={round ? `${round.index + 1}/${series?.calendar.length ?? 0}` : '—'}
          hint={round ? t(`circuit.${round.circuitId}`) : 'stagione conclusa'}
        />
        {isDriver && driver ? (
          <Stat label="Punti sviluppo" value={driver.devPoints} hint="abilità da assegnare" accent="var(--info)" />
        ) : (
          <Stat label="Progetti attivi" value={team?.projects.length ?? 0} hint="sviluppo monoposto" accent="var(--info)" />
        )}
      </div>

      <div className="dash-grid">
        <Panel
          className="next-race-panel"
          accent={team?.color}
          title={round ? t(round.eventId) : 'Stagione conclusa'}
          subtitle={round ? `${t(`circuit.${round.circuitId}`)} · ${circuitCountry(round.circuitId)}` : 'Nessun round rimasto'}
          actions={<Badge tone="info">{settings.raceDistance}% · {lapsAtPct} giri</Badge>}
        >
          {round && circuit ? (
            <>
              <div className="race-hero">
                <div className="race-hero-number">{String(round.index + 1).padStart(2, '0')}</div>
                <div className="race-hero-info">
                  <span className="race-hero-label">Prossimo appuntamento</span>
                  <strong>{t(round.eventId)}</strong>
                  <span className="muted small">
                    {countryFlag(circuit.country)} {circuitCountry(round.circuitId)} · gara di {round.laps} giri al 100%
                  </span>
                </div>
                <div className="race-hero-weather">
                  <span className="weather-icon">☂</span>
                  <span>{Math.round(circuit.rainChance * 100)}%</span>
                  <small>pioggia</small>
                </div>
              </div>
              <div className="circuit-traits">
                <span className="trait">
                  <span>Degrado gomme</span>
                  <Bar value={circuit.abrasion * 100} color="var(--warn)" />
                </span>
                <span className="trait">
                  <span>Facilità di sorpasso</span>
                  <Bar value={circuit.overtaking * 100} color="var(--accent-2)" />
                </span>
                <span className="trait">
                  <span>Perdita ai box</span>
                  <strong>{circuit.pitLoss}s</strong>
                </span>
              </div>
              <div className="race-actions">
                <button className="btn btn-primary btn-lg" onClick={enterWeekend}>
                  Entra nel weekend
                </button>
                <button className="btn btn-ghost" onClick={quickSim} title="Simula qualifiche e gara con la strategia predefinita">
                  Simula subito
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => goTo('calendar')}>
                  Calendario
                </button>
              </div>
            </>
          ) : (
            <Empty title="Stagione terminata">Passa al mercato per gestire il finale di stagione.</Empty>
          )}
        </Panel>

        <Panel
          title="Campionato"
          subtitle={category ? CATEGORY_LABEL[category] : ''}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => goTo('standings')}>
              Classifiche
            </button>
          }
        >
          {myRow ? (
            <>
              <div className="standing-summary">
                <div className="standing-position">
                  <span className="big-position">P{myRow.position}</span>
                  <span className="muted small">su {isDriver ? standings.drivers.length : standings.teams.length}</span>
                </div>
                <div className="standing-points">
                  <strong>{myRow.points}</strong>
                  <span className="muted small">punti</span>
                  {myRow.position > 1 && <span className="gap-line">{leaderPoints - myRow.points} dalla vetta</span>}
                  {myRow.position === 1 && <Badge tone="good">Leader</Badge>}
                </div>
                <div className="standing-mini">
                  <span>Vittorie <strong>{myRow.wins}</strong></span>
                  <span>Podii <strong>{myRow.podiums}</strong></span>
                  <span>Pole <strong>{myRow.poles}</strong></span>
                </div>
              </div>
              {progression.length > 1 ? (
                <div className="chart-block">
                  <div className="chart-head">
                    <span>Punti cumulati</span>
                    <Badge tone="muted">{progression.length} gare</Badge>
                  </div>
                  <Sparkline values={progression} label="Andamento punti" />
                </div>
              ) : (
                <p className="muted small">Il grafico dei punti appare dopo la prima gara.</p>
              )}
              {recent.length > 0 && (
                <div className="form-strip">
                  <span className="muted small">Ultime gare</span>
                  <div className="form-chips">
                    {recent.map((entry) => (
                      <span key={entry.round} className={`form-chip ${entry.position === 1 ? 'is-win' : entry.position <= 3 ? 'is-podium' : ''}`} title={`Round ${entry.round + 1} · ${entry.points} punti`}>
                        {entry.position ? `P${entry.position}` : '—'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Empty title="Nessun dato">La classifica si popola dopo il primo weekend.</Empty>
          )}
        </Panel>

        <Panel title="Obiettivo stagionale" accent="var(--gold)">
          <p className="objective-text">{save.player.objective}</p>
          <div className="objective-row">
            <span className="muted small">Target</span>
            <Badge tone="muted">P{save.player.objectiveTarget}</Badge>
            {myRow && (
              <Badge tone={myRow.position <= save.player.objectiveTarget ? 'good' : 'warn'}>
                {myRow.position <= save.player.objectiveTarget ? 'In linea' : 'Sotto obiettivo'}
              </Badge>
            )}
          </div>
          <div className="objective-progress">
            <Bar
              value={myRow ? Math.max(0, Math.min(100, (save.player.objectiveTarget / Math.max(1, myRow.position)) * 100)) : 0}
              color="var(--gold)"
            />
            <span className="muted small">
              {myRow ? `P${myRow.position} su obiettivo P${save.player.objectiveTarget}` : 'In attesa di risultati'}
            </span>
          </div>
          {isDriver && driver && driver.devPoints > 0 && (
            <div className="objective-extra">
              <Badge tone="good">{driver.devPoints} punti sviluppo</Badge>
              <button className="btn btn-ghost btn-sm" onClick={() => goTo('profile')}>
                Migliora abilità
              </button>
            </div>
          )}
        </Panel>

        <Panel
          title={isDriver ? 'Contratto attivo' : 'Bilancio della scuderia'}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => goTo('contracts')}>
              {isDriver ? 'Contratti' : 'Gestisci'}
            </button>
          }
        >
          {isDriver ? (
            <ContractSummary save={save} />
          ) : (
            <div className="finance-summary">
              <Stat label="Budget attuale" value={<Money value={team?.budget ?? 0} />} accent="var(--accent-2)" />
              <Stat
                label="Saldo per gara (stima)"
                value={<Money value={snapshot.balance} />}
                hint={`Entrate ${formatMoney(snapshot.income)} · uscite ${formatMoney(snapshot.expenses)}`}
              />
            </div>
          )}
        </Panel>

        <Panel
          className="news-panel"
          title="Ultime notizie"
          subtitle="Cronache del paddock"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => goTo('news')}>
              Tutte
            </button>
          }
        >
          {save.news.length === 0 ? (
            <Empty title="Nessuna notizia">Le notizie compariranno dopo le prime decisioni.</Empty>
          ) : (
            <ul className="news-list">
              {save.news.slice(0, 6).map((item) => (
                <li key={item.id} className={`news-item news-${item.kind}`}>
                  <span className="news-bullet" />
                  <div>
                    <p>{newsText(item, save)}</p>
                    <span className="news-meta">
                      Stagione {item.season} · Round {item.round}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {isDriver && driver ? (
          <Panel
            title="Condizione del pilota"
            actions={
              <button className="btn btn-ghost btn-sm" onClick={() => goTo('profile')}>
                Scheda
              </button>
            }
          >
            <div className="driver-condition">
              <div className="rating-ring">
                <span className="rating-value">{overallRating(driver)}</span>
                <span className="rating-label">Overall</span>
              </div>
              <div className="condition-bars">
                <div>
                  <span className="muted small">Morale</span>
                  <Bar value={driver.morale} color="var(--accent-2)" />
                </div>
                <div>
                  <span className="muted small">Forma</span>
                  <Bar value={(driver.form + 3) * 16.6} color="var(--gold)" />
                </div>
                <div>
                  <span className="muted small">Esperienza</span>
                  <Bar value={driver.xp} color="var(--info)" />
                  <span className="muted small">{driver.xp}/100 per il prossimo punto</span>
                </div>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel
            title="Monoposto"
            actions={
              <button className="btn btn-ghost btn-sm" onClick={() => goTo('development')}>
                Sviluppa
              </button>
            }
          >
            {team && (
              <div className="car-summary">
                <CarBars team={team} />
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function ContractSummary({ save }: { save: SaveGame }) {
  if (save.player.kind !== 'driver') return null;
  const contract = contractOf(save, save.player.driverId);
  const team = playerTeamOf(save);
  if (!contract) {
    return <Empty title="Senza contratto">Firma un contratto nel mercato per tornare in pista.</Empty>;
  }
  return (
    <div className="contract-summary">
      <div className="contract-team">
        <TeamDot team={team ?? undefined} />
        <strong>{team ? t(team.nameId) : '—'}</strong>
        {team && <Badge tone="muted">{t(team.shortId)}</Badge>}
      </div>
      <div className="contract-grid">
        <span>
          Stipendio <strong>{formatMoney(contract.salary)}</strong>
        </span>
        <span>
          Scadenza <strong>{contract.endSeason}</strong>
        </span>
        <span>
          Bonus vittoria <strong>{formatMoney(contract.winBonus)}</strong>
        </span>
        <span>
          Penale <strong>{formatMoney(contract.releaseFee)}</strong>
        </span>
      </div>
      <p className="muted small">{contract.objective}</p>
    </div>
  );
}

function CarBars({ team }: { team: NonNullable<ReturnType<typeof playerTeamOf>> }) {
  const rows: { key: keyof typeof team.car; label: string }[] = [
    { key: 'aero', label: 'Aerodinamica' },
    { key: 'engine', label: 'Motore' },
    { key: 'chassis', label: 'Telaio' },
    { key: 'suspension', label: 'Sospensioni' },
    { key: 'brakes', label: 'Freni' },
    { key: 'reliability', label: 'Affidabilità' },
  ];
  return (
    <div className="car-bars">
      {rows.map((row) => (
        <div key={row.key} className="car-bar-row">
          <span>{row.label}</span>
          <Bar value={team.car[row.key]} color={team.color} />
          <strong>{Math.round(team.car[row.key])}</strong>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

function CalendarTab({ save }: { save: SaveGame }) {
  const series = playerSeriesOf(save);
  const [filter, setFilter] = useState<'all' | 'done' | 'next'>('all');
  if (!series) return <Empty title="Nessun calendario" />;
  const rows = series.calendar.filter((round) => {
    const result = series.results.find((r) => r.roundIndex === round.index);
    if (filter === 'done') return Boolean(result);
    if (filter === 'next') return !result;
    return true;
  });
  const isDriver = save.player.kind === 'driver';
  const myDriverId = isDriver && save.player.kind === 'driver' ? save.player.driverId : null;
  const myTeamId = playerTeamOf(save)?.id ?? null;

  return (
    <Panel
      title="Calendario stagionale"
      subtitle={`${series.calendar.length} appuntamenti · ${series.results.length} disputati`}
      actions={
        <div className="segmented small">
          <button className={`seg ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
            Tutte
          </button>
          <button className={`seg ${filter === 'done' ? 'is-active' : ''}`} onClick={() => setFilter('done')}>
            Disputate
          </button>
          <button className={`seg ${filter === 'next' ? 'is-active' : ''}`} onClick={() => setFilter('next')}>
            Da disputare
          </button>
        </div>
      }
    >
      <div className="calendar-list">
        {rows.map((round) => {
          const result = series.results.find((r) => r.roundIndex === round.index);
          const isNext = series.roundIndex === round.index && !result;
          const winner = result?.rows.find((row) => row.position === 1);
          const mine = result
            ? isDriver
              ? result.rows.find((row) => row.driverId === myDriverId)
              : result.rows.filter((row) => row.teamId === myTeamId).sort((a, b) => a.position - b.position)[0]
            : null;
          const circuit = CIRCUITS.find((entry) => entry.id === round.circuitId);
          return (
            <div key={round.index} className={`calendar-row ${isNext ? 'is-next' : ''} ${result ? 'is-done' : ''}`}>
              <span className="calendar-round">{String(round.index + 1).padStart(2, '0')}</span>
              <div className="calendar-main">
                <strong>{t(round.eventId)}</strong>
                <span className="muted small">
                  {t(`circuit.${round.circuitId}`)} · {circuitCountry(round.circuitId)} · {round.laps} giri
                  {circuit ? ` · pioggia ${Math.round(circuit.rainChance * 100)}%` : ''}
                </span>
              </div>
              <div className="calendar-result">
                {result ? (
                  <>
                    <span className="muted small">Vincitore</span>
                    <strong>{winner ? driverName(save.world, winner.driverId) : '—'}</strong>
                    {mine && <span className="calendar-mine">Tu: P{mine.position} · {mine.points} pt</span>}
                  </>
                ) : isNext ? (
                  <Badge tone="info">Prossimo</Badge>
                ) : (
                  <Badge tone="muted">Da disputare</Badge>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <Empty title="Nessun round" />}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

function StandingsTab({ save }: { save: SaveGame }) {
  const [category, setCategory] = useState<Category>(playerCategoryOf(save) ?? 'F1');
  const [view, setView] = useState<'drivers' | 'teams'>('drivers');
  const standings = computeStandings(save.world, category);
  const rows: StandingRow[] = view === 'drivers' ? standings.drivers : standings.teams;
  const leader = rows[0]?.points ?? 0;
  return (
    <Panel
      title="Classifiche"
      subtitle={`${CATEGORY_LABEL[category]} · stagione ${save.world.season}`}
      actions={
        <div className="inline-actions">
          <div className="segmented small">
            {(['F1', 'F2', 'F3'] as Category[]).map((cat) => (
              <button key={cat} className={`seg ${category === cat ? 'is-active' : ''}`} onClick={() => setCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="segmented small">
            <button className={`seg ${view === 'drivers' ? 'is-active' : ''}`} onClick={() => setView('drivers')}>
              Piloti
            </button>
            <button className={`seg ${view === 'teams' ? 'is-active' : ''}`} onClick={() => setView('teams')}>
              Squadre
            </button>
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty title="Classifica vuota">Nessun risultato registrato in questa categoria.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table standings-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>{view === 'drivers' ? 'Pilota' : 'Squadra'}</th>
                <th className="num">Punti</th>
                <th className="num">Distacco</th>
                <th className="num">Vittorie</th>
                <th className="num">Podii</th>
                <th className="num">Pole</th>
                <th className="num">Gare</th>
                <th className="points-track" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe =
                  save.player.kind === 'driver'
                    ? row.id === save.player.driverId
                    : row.id === (save.player.kind === 'team' ? save.player.teamId : '');
                const team = view === 'drivers' ? save.world.drivers[row.id]?.teamId : row.id;
                return (
                  <tr key={row.id} className={isMe ? 'is-me' : ''}>
                    <td>
                      <PositionBadge position={row.position} />
                    </td>
                    <td>
                      <div className="table-name">
                        <TeamDot team={team ? save.world.teams[team] : undefined} />
                        <span>
                          {view === 'drivers' ? driverName(save.world, row.id) : teamLabel(save.world, row.id)}
                          {isMe && <Badge tone="info">Tu</Badge>}
                        </span>
                      </div>
                    </td>
                    <td className="num strong">{row.points}</td>
                    <td className="num muted">{leader <= 0 || row.position === 1 ? '—' : `−${leader - row.points}`}</td>
                    <td className="num">{row.wins}</td>
                    <td className="num">{row.podiums}</td>
                    <td className="num">{row.poles}</td>
                    <td className="num">{row.races}</td>
                    <td className="points-track">
                      <Bar value={leader ? (row.points / leader) * 100 : 0} color={isMe ? 'var(--accent)' : 'var(--accent-2)'} height={4} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfileTab({
  save,
  onUpdate,
  goTo,
}: {
  save: SaveGame;
  onUpdate: (next: SaveGame, persist?: boolean) => void;
  goTo: (tab: Tab) => void;
}) {
  if (save.player.kind === 'driver') return <DriverProfile save={save} onUpdate={onUpdate} goTo={goTo} />;
  return <TeamProfile save={save} goTo={goTo} />;
}

function DriverProfile({
  save,
  onUpdate,
  goTo,
}: {
  save: SaveGame;
  onUpdate: (next: SaveGame, persist?: boolean) => void;
  goTo: (tab: Tab) => void;
}) {
  const driver = playerDriverOf(save);
  const team = playerTeamOf(save);
  if (!driver) return <Empty title="Pilota non trovato" />;
  const contract = contractOf(save, driver.id);
  const skills: { key: keyof typeof driver.skills; label: string }[] = [
    { key: 'pace', label: 'Velocità pura' },
    { key: 'tyre', label: 'Gestione pneumatici' },
    { key: 'fuel', label: 'Gestione carburante' },
    { key: 'overtaking', label: 'Sorpassi' },
    { key: 'defending', label: 'Difesa' },
    { key: 'consistency', label: 'Costanza' },
    { key: 'wet', label: 'Meteo' },
    { key: 'qualifying', label: 'Qualifica' },
  ];
  return (
    <div className="two-col">
      <Panel title={driverName(save.world, driver.id)} subtitle={`${countryFlag(driver.nat)} ${driver.nat} · ${driver.age} anni · #${driver.number}`}>
        <div className="profile-head">
          <span className="helmet" style={{ background: `linear-gradient(135deg, ${driver.helmet}, #101010)` }}>
            <span className="helmet-visor" />
            <span className="helmet-number">{driver.number}</span>
          </span>
          <div>
            <div className="preview-tags">
              <Badge tone="info">{save.player.category ? CATEGORY_LABEL[save.player.category] : 'Free agent'}</Badge>
              <Badge tone="muted">Overall {overallRating(driver)}</Badge>
              <Badge tone="muted">Potenziale {driver.potential}</Badge>
            </div>
            <p className="muted small">
              {team ? `Contratto con ${t(team.nameId)}` : 'Attualmente senza contratto'}
              {contract ? ` · fino al ${contract.endSeason}` : ''}
            </p>
            <div className="profile-kpis">
              <Stat label="Reputazione" value={Math.round(driver.reputation)} />
              <Stat label="Morale" value={Math.round(driver.morale)} />
              <Stat label="Punti sviluppo" value={driver.devPoints} />
            </div>
          </div>
        </div>
        <div className="skill-list">
          {skills.map((skill) => (
            <div key={skill.key} className="skill-line">
              <div className="skill-line-head">
                <span>{skill.label}</span>
                <strong>{Math.round(driver.skills[skill.key])}</strong>
                <button
                  className="btn btn-mini btn-primary"
                  disabled={driver.devPoints <= 0 || driver.skills[skill.key] >= 99}
                  onClick={() => {
                    onUpdate(spendSkillPoint(save, skill.key), true);
                    toast(`${skill.label} migliorata`, 'good');
                  }}
                >
                  +1
                </button>
              </div>
              <Bar value={driver.skills[skill.key]} color={driver.skills[skill.key] >= 85 ? 'var(--accent-2)' : 'var(--accent)'} />
            </div>
          ))}
        </div>
        <div className="dev-points">
          <Badge tone={driver.devPoints > 0 ? 'good' : 'muted'}>{driver.devPoints} punti sviluppo</Badge>
          <span className="muted small">Ogni 100 XP guadagni un punto abilità.</span>
          <button className="btn btn-ghost btn-sm" onClick={() => goTo('customize')}>
            Cambia casco e numero
          </button>
        </div>
      </Panel>

      <div className="stack">
        <Panel title="Stagione in corso">
          <SeasonStats save={save} />
        </Panel>
        <Panel title="Palmarès e carriera">
          {save.player.kind === 'driver' && save.player.seasonHistory.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Stagione</th>
                    <th>Serie</th>
                    <th>Squadra</th>
                    <th className="num">Pos</th>
                    <th className="num">Punti</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {save.player.seasonHistory.map((record) => (
                    <tr key={`${record.season}-${record.category}`}>
                      <td>{record.season}</td>
                      <td>{record.category === 'none' ? '—' : record.category}</td>
                      <td>{record.teamId ? teamLabel(save.world, record.teamId) : '—'}</td>
                      <td className="num">P{record.position}</td>
                      <td className="num strong">{record.points}</td>
                      <td>{record.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Nessuna stagione conclusa">Il palmarès si popola al termine della prima stagione.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

function SeasonStats({ save }: { save: SaveGame }) {
  const series = playerSeriesOf(save);
  const category = playerCategoryOf(save);
  if (!series || !category) return <Empty title="Nessuna stagione attiva" />;
  const standings = computeStandings(save.world, category);
  const id = save.player.kind === 'driver' ? save.player.driverId : '';
  const row = standings.drivers.find((r) => r.id === id);
  if (!row) return <Empty title="Nessun risultato">Disputa il primo weekend per vedere le statistiche.</Empty>;
  return (
    <div className="stats-grid">
      <Stat label="Posizione" value={`P${row.position}`} />
      <Stat label="Punti" value={row.points} />
      <Stat label="Vittorie" value={row.wins} />
      <Stat label="Podii" value={row.podiums} />
      <Stat label="Pole" value={row.poles} />
      <Stat label="Giri veloci" value={row.fastestLaps} />
    </div>
  );
}

function TeamProfile({ save, goTo }: { save: SaveGame; goTo: (tab: Tab) => void }) {
  const team = playerTeamOf(save);
  if (!team) return <Empty title="Scuderia non trovata" />;
  const standings = computeStandings(save.world, team.category);
  const row = standings.teams.find((r) => r.id === team.id);
  return (
    <div className="two-col">
      <Panel title={t(team.nameId)} subtitle={`${CATEGORY_LABEL[team.category]} · ${t(team.shortId)} · fondata nel ${save.world.season - team.history.length}`}>
        <div className="team-profile-head">
          <TeamLogo team={team} size={68} />
          <div>
            <div className="preview-tags">
              <Badge tone="info">{CATEGORY_LABEL[team.category]}</Badge>
              <Badge tone="muted">Reputazione {Math.round(team.reputation)}</Badge>
              {row && <Badge tone="good">P{row.position} · {row.points} punti</Badge>}
            </div>
            <p className="muted small">
              Motore: {t(`engine.${team.engineId}`)} · {team.staff.length} membri dello staff · {team.driverIds.filter(Boolean).length} piloti
            </p>
            <button className="btn btn-ghost btn-sm" onClick={() => goTo('customize')}>
              Personalizza livrea
            </button>
          </div>
        </div>
        <h4 className="subhead">Monoposto</h4>
        <CarBars team={team} />
        <h4 className="subhead">Piloti</h4>
        <ul className="simple-list">
          {team.driverIds.filter(Boolean).map((id) => {
            const driver = save.world.drivers[id as string];
            if (!driver) return null;
            return (
              <li key={id}>
                <span>
                  <NationFlag nat={driver.nat} /> {driverName(save.world, driver.id)}
                </span>
                <span className="muted small">
                  {driver.age} anni · Overall {overallRating(driver)}
                </span>
              </li>
            );
          })}
          {team.driverIds.every((id) => !id) && <li className="muted">Nessun pilota sotto contratto.</li>}
        </ul>
      </Panel>
      <div className="stack">
        <Panel title="Storico della scuderia">
          {team.history.length === 0 ? (
            <Empty title="Prima stagione">Lo storico si popola a fine campionato.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Stagione</th>
                  <th className="num">Pos</th>
                  <th className="num">Punti</th>
                </tr>
              </thead>
              <tbody>
                {team.history.map((entry) => (
                  <tr key={entry.season}>
                    <td>{entry.season}</td>
                    <td className="num">P{entry.position}</td>
                    <td className="num strong">{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Staff tecnico">
          {team.staff.length === 0 ? (
            <Empty title="Nessun ingegnere">Assumi personale dalla scheda Staff.</Empty>
          ) : (
            <ul className="simple-list">
              {team.staff.map((member) => (
                <li key={member.id}>
                  <span>{member.first} {member.last}</span>
                  <Badge tone="muted">{member.rating}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function EndedPanel({ save, onMenu }: { save: SaveGame; onMenu: () => void }) {
  const career = save.player;
  const isDriver = career.kind === 'driver';
  const history = career.seasonHistory;
  const wins = history.reduce((sum, record) => sum + record.wins, 0);
  const podiums = history.reduce((sum, record) => sum + record.podiums, 0);
  const bestFinish = history.reduce((best, record) => Math.min(best, record.position), 99);
  return (
    <div className="end-screen">
      <Panel title={isDriver ? 'Carriera conclusa' : 'Scuderia fallita'} accent="var(--gold)">
        <div className="end-hero">
          <span className="end-trophy">🏁</span>
          <div>
            <h3>{isDriver ? 'Il casco è appeso al chiodo' : 'Le saracinesche si chiudono'}</h3>
            <p className="muted">
              {isDriver
                ? 'Hai chiuso la tua avventura nel motorsport. La tua storia resta nell\'archivio delle carriere.'
                : 'Il bilancio non ha retto: la scuderia esce dal campionato. Puoi ricominciare con un nuovo progetto.'}
            </p>
          </div>
        </div>
        <div className="stats-grid">
          <Stat label="Stagioni" value={history.length} />
          <Stat label="Vittorie" value={wins} />
          <Stat label="Podii" value={podiums} />
          <Stat label="Miglior piazzamento" value={bestFinish === 99 ? '—' : `P${bestFinish}`} />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={onMenu}>
            Torna al menu
          </button>
        </div>
      </Panel>
    </div>
  );
}

void MiniBars;
void formatGap;
void driverFullName;
