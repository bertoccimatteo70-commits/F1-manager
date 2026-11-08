import React, { useState } from 'react';
import type { Category, GlobalSettings, SaveGame } from '../game/types';
import type { StandingRow } from '../game/engine/world';
import {
  beginWeekend,
  contractOf,
  driverFullName,
  economicSnapshot,
  nextRoundOf,
  playerCategoryOf,
  playerDriverIdsOf,
  playerDriverOf,
  playerSeriesOf,
  playerTeamOf,
  quickSimulateWeekend,
  spendSkillPoint,
  teamLabel,
} from '../game/engine/career';
import { circuitCountry, CATEGORY_LABEL } from '../game/data/catalog';
import { computeStandings, overallRating } from '../game/engine/world';
import { countryFlag, formatGap, formatMoney, ordinal, phaseLabel } from '../game/engine/format';
import { t } from '../game/names/registry';
import { Badge, Bar, Empty, Money, NationFlag, Panel, PositionBadge, Stat, TeamDot, TeamLogo } from './components';
import { driverName, newsText, useNames } from './helpers';
import { FinanceTab, MarketTab, OffseasonPanel, DevelopmentTab, StaffTab } from './CareerManagement';
import { WeekendScreen } from './WeekendScreen';

type Tab = 'dashboard' | 'calendar' | 'standings' | 'market' | 'finance' | 'development' | 'staff' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'calendar', label: 'Calendario', icon: '▦' },
  { id: 'standings', label: 'Classifiche', icon: '≡' },
  { id: 'market', label: 'Mercato', icon: '⇄' },
  { id: 'finance', label: 'Finanze', icon: '€' },
  { id: 'development', label: 'Sviluppo', icon: '⚙' },
  { id: 'staff', label: 'Staff', icon: '☰' },
  { id: 'profile', label: 'Profilo', icon: '◇' },
];

export function CareerScreen({
  save,
  settings,
  onUpdate,
  onMenu,
  onSave,
}: {
  save: SaveGame;
  settings: GlobalSettings;
  onUpdate: (next: SaveGame, persist?: boolean) => void;
  onMenu: () => void;
  onSave: () => void;
}) {
  useNames();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [savedFlash, setSavedFlash] = useState(false);
  const isDriver = save.player.kind === 'driver';
  const team = playerTeamOf(save);
  const driver = playerDriverOf(save);
  const category = playerCategoryOf(save);
  const series = playerSeriesOf(save);
  const playerTeam = team;
  const money = isDriver ? (save.player.kind === 'driver' ? save.player.money : 0) : playerTeam?.budget ?? 0;

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
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const tabs = TABS.filter((item) => {
    if (item.id === 'development' || item.id === 'staff') return save.player.kind === 'team';
    return true;
  });

  return (
    <div className="career-shell">
      <header className="career-topbar">
        <div className="career-identity">
          {save.player.kind === 'team' && playerTeam ? (
            <TeamLogo team={playerTeam} size={40} />
          ) : (
            <span className="helmet-mini" style={{ background: `linear-gradient(135deg, ${driver?.helmet ?? '#e10600'}, #101010)` }}>
              <span className="helmet-visor mini" />
            </span>
          )}
          <div>
            <strong className="career-name">{save.name}</strong>
            <span className="career-sub">
              Stagione {save.world.season} · {category ? CATEGORY_LABEL[category] : '—'} · {phaseLabel(save.phase)}
            </span>
          </div>
        </div>
        <div className="career-meta">
          {series && (
            <div className="meta-block">
              <span className="meta-label">Round</span>
              <span className="meta-value">
                {Math.min(series.roundIndex + 1, series.calendar.length)}/{series.calendar.length}
              </span>
            </div>
          )}
          <div className="meta-block">
            <span className="meta-label">{isDriver ? 'Patrimonio' : 'Budget'}</span>
            <span className="meta-value">
              <Money value={money} />
            </span>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost btn-sm" onClick={saveNow}>
              {savedFlash ? '✓ Salvato' : 'Salva'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onMenu}>
              Menu
            </button>
          </div>
        </div>
      </header>

      <nav className="career-nav">
        {tabs.map((item) => (
          <button key={item.id} className={`nav-item ${tab === item.id ? 'is-active' : ''}`} onClick={() => setTab(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="career-main">
        {save.phase === 'offseason' && tab === 'dashboard' ? (
          <OffseasonPanel save={save} onUpdate={onUpdate} onOpenMarket={() => setTab('market')} />
        ) : save.phase === 'ended' && tab === 'dashboard' ? (
          <EndedPanel save={save} onMenu={onMenu} />
        ) : tab === 'dashboard' ? (
          <Dashboard save={save} settings={settings} onUpdate={onUpdate} goTo={setTab} />
        ) : tab === 'calendar' ? (
          <CalendarTab save={save} />
        ) : tab === 'standings' ? (
          <StandingsTab save={save} />
        ) : tab === 'market' ? (
          <MarketTab save={save} onUpdate={onUpdate} />
        ) : tab === 'finance' ? (
          <FinanceTab save={save} onUpdate={onUpdate} />
        ) : tab === 'development' ? (
          <DevelopmentTab save={save} onUpdate={onUpdate} />
        ) : tab === 'staff' ? (
          <StaffTab save={save} onUpdate={onUpdate} />
        ) : (
          <ProfileTab save={save} onUpdate={onUpdate} />
        )}
      </main>
    </div>
  );
}

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
  const lapsAtPct = round ? Math.max(6, Math.round((round.laps * settings.raceDistance) / 100)) : 0;

  const enterWeekend = () => {
    const next = beginWeekend(save, settings.raceDistance);
    onUpdate(next, true);
  };

  const quickSim = () => {
    const next = quickSimulateWeekend(save, settings.raceDistance);
    onUpdate(next, true);
  };

  return (
    <div className="dash">
      <div className="dash-grid">
        <Panel
          className="next-race-panel"
          accent={team?.color}
          title={round ? t(round.eventId) : 'Stagione conclusa'}
          subtitle={round ? `${t(`circuit.${round.circuitId}`)} · ${circuitCountry(round.circuitId)}` : 'Nessun round rimasto'}
          actions={<Badge tone="info">{settings.raceDistance}% · {lapsAtPct} giri</Badge>}
        >
          {round ? (
            <>
              <div className="race-hero">
                <div className="race-hero-number">{String(round.index + 1).padStart(2, '0')}</div>
                <div className="race-hero-info">
                  <span className="race-hero-label">Prossimo appuntamento</span>
                  <strong>{t(`circuit.${round.circuitId}`)}</strong>
                  <span className="muted small">
                    {countryFlag(circuitCountry(round.circuitId) ? countryIso(round.circuitId) : 'IT')} Gara di{' '}
                    {round.laps} giri al 100% · meteo variabile
                  </span>
                </div>
                <div className="race-hero-weather">
                  <span className="weather-icon">☂</span>
                  <span>{Math.round(rainChance(round.circuitId) * 100)}%</span>
                  <small>pioggia</small>
                </div>
              </div>
              <div className="race-actions">
                <button className="btn btn-primary btn-lg" onClick={enterWeekend}>
                  Entra nel weekend
                </button>
                <button className="btn btn-ghost" onClick={quickSim} title="Simula qualifiche e gara con la strategia predefinita">
                  Simula subito
                </button>
              </div>
              <p className="muted small">
                Qualifiche, scelta mescole, soste e decisioni in pista. Le gare vengono simulate giro per giro con
                degrado, meteo, incidenti e Safety Car.
              </p>
            </>
          ) : (
            <Empty title="Stagione terminata">Passa al mercato per gestire il finale di stagione.</Empty>
          )}
        </Panel>

        <Panel title="Posizione in campionato" subtitle={category ? CATEGORY_LABEL[category] : ''}>
          {myRow ? (
            <div className="standing-summary">
              <div className="standing-position">
                <span className="big-position">P{myRow.position}</span>
                <span className="muted small">su {isDriver ? standings.drivers.length : standings.teams.length}</span>
              </div>
              <div className="standing-points">
                <strong>{myRow.points}</strong>
                <span className="muted small">punti</span>
                {myRow.position > 1 && <span className="gap-line">{leaderPoints - myRow.points} punti dalla vetta</span>}
                {myRow.position === 1 && <Badge tone="good">Leader</Badge>}
              </div>
              <div className="standing-mini">
                <span>Vittorie <strong>{myRow.wins}</strong></span>
                <span>Podii <strong>{myRow.podiums}</strong></span>
                <span>Pole <strong>{myRow.poles}</strong></span>
              </div>
            </div>
          ) : (
            <Empty title="Nessun dato">La classifica si popola dopo il primo weekend.</Empty>
          )}
        </Panel>

        <Panel title="Obiettivo stagionale" accent="var(--gold)">
          <p className="objective-text">{save.player.kind === 'driver' ? save.player.objective : save.player.objective}</p>
          <div className="objective-row">
            <span className="muted small">Target</span>
            <Badge tone="muted">P{save.player.objectiveTarget}</Badge>
            {myRow && (
              <Badge tone={myRow.position <= save.player.objectiveTarget ? 'good' : 'warn'}>
                {myRow.position <= save.player.objectiveTarget ? 'In linea' : 'Sotto obiettivo'}
              </Badge>
            )}
          </div>
          {isDriver && driver && (
            <div className="objective-extra">
              <span className="muted small">Punti sviluppo disponibili</span>
              <Badge tone={driver.devPoints > 0 ? 'good' : 'muted'}>{driver.devPoints}</Badge>
              {driver.devPoints > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => goTo('profile')}>
                  Migliora abilità
                </button>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title={isDriver ? 'Contratto attivo' : 'Bilancio della scuderia'}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => goTo('finance')}>
              Dettagli
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

        <Panel className="news-panel" title="Ultime notizie" subtitle="Cronache del paddock">
          {save.news.length === 0 ? (
            <Empty title="Nessuna notizia">Le notizie compariranno dopo le prime decisioni.</Empty>
          ) : (
            <ul className="news-list">
              {save.news.slice(0, 7).map((item) => (
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

function CalendarTab({ save }: { save: SaveGame }) {
  const series = playerSeriesOf(save);
  if (!series) return <Empty title="Nessun calendario" />;
  return (
    <Panel title="Calendario stagionale" subtitle={`${series.calendar.length} appuntamenti · ${series.results.length} disputati`}>
      <div className="calendar-list">
        {series.calendar.map((round) => {
          const result = series.results.find((r) => r.roundIndex === round.index);
          const isNext = series.roundIndex === round.index;
          const winner = result?.rows.find((row) => row.position === 1);
          return (
            <div key={round.index} className={`calendar-row ${isNext ? 'is-next' : ''} ${result ? 'is-done' : ''}`}>
              <span className="calendar-round">{String(round.index + 1).padStart(2, '0')}</span>
              <div className="calendar-main">
                <strong>{t(round.eventId)}</strong>
                <span className="muted small">
                  {t(`circuit.${round.circuitId}`)} · {circuitCountry(round.circuitId)} · {round.laps} giri
                </span>
              </div>
              <div className="calendar-result">
                {result ? (
                  <>
                    <span className="muted small">Vincitore</span>
                    <strong>{winner ? driverName(save.world, winner.driverId) : '—'}</strong>
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
      </div>
    </Panel>
  );
}

function StandingsTab({ save }: { save: SaveGame }) {
  const [category, setCategory] = useState<Category>(playerCategoryOf(save) ?? 'F1');
  const [view, setView] = useState<'drivers' | 'teams'>('drivers');
  const standings = computeStandings(save.world, category);
  const rows: StandingRow[] = view === 'drivers' ? standings.drivers : standings.teams;
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
        <table className="table standings-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>{view === 'drivers' ? 'Pilota' : 'Squadra'}</th>
              <th className="num">Punti</th>
              <th className="num">Vittorie</th>
              <th className="num">Podii</th>
              <th className="num">Pole</th>
              <th className="num">Gare</th>
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
                  <td className="num">{row.wins}</td>
                  <td className="num">{row.podiums}</td>
                  <td className="num">{row.poles}</td>
                  <td className="num">{row.races}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function ProfileTab({ save, onUpdate }: { save: SaveGame; onUpdate: (next: SaveGame, persist?: boolean) => void }) {
  if (save.player.kind === 'driver') return <DriverProfile save={save} onUpdate={onUpdate} />;
  return <TeamProfile save={save} />;
}

function DriverProfile({ save, onUpdate }: { save: SaveGame; onUpdate: (next: SaveGame, persist?: boolean) => void }) {
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
                  onClick={() => onUpdate(spendSkillPoint(save, skill.key), true)}
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
        </div>
      </Panel>

      <div className="stack">
        <Panel title="Stagione in corso">
          <SeasonStats save={save} />
        </Panel>
        <Panel title="Palmarès e carriera">
          {save.player.kind === 'driver' && save.player.seasonHistory.length > 0 ? (
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

function TeamProfile({ save }: { save: SaveGame }) {
  const team = playerTeamOf(save);
  if (!team) return <Empty title="Scuderia non trovata" />;
  const standings = computeStandings(save.world, team.category);
  const row = standings.teams.find((r) => r.id === team.id);
  return (
    <div className="two-col">
      <Panel title={t(team.nameId)} subtitle={`${CATEGORY_LABEL[team.category]} · ${t(team.shortId)} · fondata nel ${save.world.season - team.history.length}`}>
        <div className="team-profile-head">
          <TeamLogo team={team} size={64} />
          <div>
            <div className="preview-tags">
              <Badge tone="info">{CATEGORY_LABEL[team.category]}</Badge>
              <Badge tone="muted">Reputazione {Math.round(team.reputation)}</Badge>
              {row && <Badge tone="good">P{row.position} · {row.points} punti</Badge>}
            </div>
            <p className="muted small">
              Motore: {t(`engine.${team.engineId}`)} · {team.staff.length} membri dello staff · {team.driverIds.filter(Boolean).length} piloti
            </p>
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

function countryIso(circuitId: string): string {
  const map: Record<string, string> = {
    sakhir: 'BH', jeddah: 'SA', melbourne: 'AU', suzuka: 'JP', shanghai: 'CN', imola: 'IT', monaco: 'MC',
    catalunya: 'ES', montreal: 'CA', spielberg: 'AT', silverstone: 'GB', spa: 'BE', hungaroring: 'HU',
    zandvoort: 'NL', monza: 'IT', baku: 'AZ', marinabay: 'SG', austin: 'US', mexico: 'MX', interlagos: 'BR',
    vegas: 'US', lusail: 'QA', yasmarina: 'AE',
  };
  return map[circuitId] ?? 'IT';
}

function rainChance(circuitId: string): number {
  const map: Record<string, number> = {
    sakhir: 0.05, jeddah: 0.08, melbourne: 0.28, suzuka: 0.3, shanghai: 0.25, imola: 0.22, monaco: 0.18,
    catalunya: 0.12, montreal: 0.25, spielberg: 0.3, silverstone: 0.42, spa: 0.45, hungaroring: 0.2,
    zandvoort: 0.32, monza: 0.15, baku: 0.1, marinabay: 0.35, austin: 0.18, mexico: 0.15, interlagos: 0.5,
    vegas: 0.04, lusail: 0.02, yasmarina: 0.02,
  };
  return map[circuitId] ?? 0.15;
}

