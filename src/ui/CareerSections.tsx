import React, { useEffect, useMemo, useState } from 'react';
import type { NewsItem, SaveGame } from '../game/types';
import {
  contractOf,
  playerCategoryOf,
  playerDriverOf,
  playerSeriesOf,
  playerTeamOf,
  renewContract,
  releaseDriverFromTeam,
  updateDriverIdentity,
  updateTeamIdentity,
} from '../game/engine/career';
import { computeStandings, overallRating } from '../game/engine/world';
import { CIRCUITS, CATEGORY_LABEL, TEAM_LOGOS } from '../game/data/catalog';
import { countryFlag, formatMoney } from '../game/engine/format';
import { t } from '../game/names/registry';
import { Badge, Bar, ConfirmButton, Empty, Field, InfoHint, Money, Panel, PositionBadge, Stat, TeamDot, TeamLogo } from './components';
import { driverName, newsText, teamName } from './helpers';
import { toast } from './toast';

type Updater = (next: SaveGame, persist?: boolean) => void;

const HELMET_COLORS = ['#e10600', '#00d2be', '#ffd200', '#1e41ff', '#ff8000', '#22c55e', '#f5f5f5', '#8b5cf6', '#111111'];

function contractYearsLeft(endSeason: number, season: number): number {
  return Math.max(0, endSeason - season + 1);
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export function ContractsTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const team = playerTeamOf(save);
  if (save.player.kind === 'driver') {
    const driver = playerDriverOf(save);
    if (!driver) return <Empty title="Pilota non trovato" />;
    const contract = contractOf(save, driver.id);
    const category = playerCategoryOf(save);
    return (
      <div className="stack">
        <Panel
          title={contract && team ? `Contratto con ${t(team.nameId)}` : 'Nessun contratto attivo'}
          subtitle={contract ? `${CATEGORY_LABEL[category ?? 'F3']} · scadenza ${contract.endSeason}` : 'Firma un contratto dal mercato'}
          accent={team?.color}
          actions={
            contract ? (
              <Badge tone={contract.endSeason > save.world.season ? 'good' : 'warn'}>
                {contractYearsLeft(contract.endSeason, save.world.season)}{' '}
                {contractYearsLeft(contract.endSeason, save.world.season) === 1 ? 'stagione residua' : 'stagioni residue'}
              </Badge>
            ) : undefined
          }
        >
          {contract && team ? (
            <div className="contract-hero">
              <div className="contract-hero-team">
                <TeamLogo team={team} size={52} />
                <div>
                  <strong>{t(team.nameId)}</strong>
                  <span className="muted small">{t(team.shortId)} · {CATEGORY_LABEL[team.category]}</span>
                </div>
              </div>
              <div className="contract-hero-money">
                <span className="muted small">Stipendio annuo</span>
                <strong>{formatMoney(contract.salary)}</strong>
                <span className="muted small">fino alla stagione {contract.endSeason}</span>
              </div>
            </div>
          ) : null}
          {contract ? (
            <div className="contract-clauses">
              <div className="clause">
                <span>Bonus vittoria</span>
                <strong>{formatMoney(contract.winBonus)}</strong>
                <InfoHint text="Importo accreditato sul patrimonio per ogni gara vinta." />
              </div>
              <div className="clause">
                <span>Bonus podio</span>
                <strong>{formatMoney(contract.podiumBonus)}</strong>
              </div>
              <div className="clause">
                <span>Bonus titolo</span>
                <strong>{formatMoney(contract.titleBonus)}</strong>
              </div>
              <div className="clause">
                <span>Clausola di rescissione</span>
                <strong>{formatMoney(contract.releaseFee)}</strong>
                <InfoHint text="Penale da pagare se decidi di liberarti prima della scadenza." />
              </div>
              <div className="clause">
                <span>Obiettivo contrattuale</span>
                <strong>{contract.objective}</strong>
              </div>
              <div className="clause">
                <span>Ruolo</span>
                <strong>{contract.role === 'race' ? 'Pilota titolare' : 'Riserva'}</strong>
              </div>
            </div>
          ) : (
            <Empty title="Sei un free agent">Durante la fase di mercato puoi valutare le offerte delle scuderie.</Empty>
          )}
          <div className="contract-foot">
            <Stat label="Reputazione" value={`${Math.round(driver.reputation)}/100`} hint="Cresce con risultati e titoli" />
            <Stat label="Overall" value={overallRating(driver)} />
            <Stat label="Patrimonio" value={<Money value={save.player.kind === 'driver' ? save.player.money : 0} />} />
          </div>
        </Panel>

        <Panel title="Storico stipendi" subtitle="Quanto hai guadagnato stagione per stagione">
          {save.player.seasonHistory.length === 0 ? (
            <Empty title="Nessuna stagione conclusa">Lo storico parte dal primo campionato completato.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Stagione</th>
                  <th>Serie</th>
                  <th>Squadra</th>
                  <th className="num">Stipendio</th>
                  <th className="num">Posizione</th>
                </tr>
              </thead>
              <tbody>
                {save.player.seasonHistory.map((record) => (
                  <tr key={`${record.season}-${record.category}`}>
                    <td>{record.season}</td>
                    <td>{record.category === 'none' ? '—' : record.category}</td>
                    <td>{record.teamId ? teamName(save.world, record.teamId) : '—'}</td>
                    <td className="num">{formatMoney(record.salary)}</td>
                    <td className="num strong">P{record.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    );
  }

  if (!team) return <Empty title="Scuderia non trovata" />;
  const drivers = team.driverIds.filter(Boolean) as string[];
  const staffCost = team.staff.reduce((sum, member) => sum + member.salary, 0);
  const driverCost = drivers.reduce((sum, driverId) => sum + (contractOf(save, driverId)?.salary ?? 0), 0);
  return (
    <div className="stack">
      <Panel
        title="Contratti piloti"
        subtitle={`${drivers.length}/2 sedili occupati · budget ${formatMoney(team.budget)}`}
        actions={<Badge tone={team.budget < 0 ? 'bad' : 'muted'}>Monte stipendi {formatMoney(driverCost + staffCost)}</Badge>}
      >
        {drivers.length === 0 ? (
          <Empty title="Nessun pilota sotto contratto">Firma due piloti dal mercato per scendere in pista.</Empty>
        ) : (
          <div className="contract-cards">
            {drivers.map((driverId) => {
              const driver = save.world.drivers[driverId];
              const contract = contractOf(save, driverId);
              if (!driver || !contract) return null;
              const remaining = contractYearsLeft(contract.endSeason, save.world.season);
              return (
                <article key={driverId} className="contract-card" style={{ borderLeftColor: team.color }}>
                  <header className="contract-card-head">
                    <div className="table-name">
                      <span className="driver-stripe" style={{ background: team.color }} />
                      <strong>{countryFlag(driver.nat)} {driverName(save.world, driver.id)}</strong>
                    </div>
                    <Badge tone={remaining > 1 ? 'good' : remaining === 1 ? 'warn' : 'bad'}>
                      {remaining === 0 ? 'Scaduto' : `${remaining} stagion${remaining === 1 ? 'e' : 'i'}`}
                    </Badge>
                  </header>
                  <div className="contract-card-grid">
                    <span>Stipendio<strong>{formatMoney(contract.salary)}</strong></span>
                    <span>Scadenza<strong>{contract.endSeason}</strong></span>
                    <span>Bonus vittoria<strong>{formatMoney(contract.winBonus)}</strong></span>
                    <span>Bonus titolo<strong>{formatMoney(contract.titleBonus)}</strong></span>
                    <span>Rescissione<strong>{formatMoney(contract.releaseFee)}</strong></span>
                    <span>Overall<strong>{overallRating(driver)}</strong></span>
                  </div>
                  <p className="muted small">{contract.objective}</p>
                  <div className="contract-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        onUpdate(renewContract(save, driverId), true);
                        toast(`Rinnovo firmato con ${driverName(save.world, driverId)}`, 'good');
                      }}
                    >
                      Rinnova (+1 stagione)
                    </button>
                    <ConfirmButton
                      label="Rescindi"
                      confirmLabel="Confermi la rescissione?"
                      className="btn btn-ghost btn-sm"
                      onConfirm={() => {
                        onUpdate(releaseDriverFromTeam(save, driverId), true);
                        toast(`Contratto rescisso con ${driverName(save.world, driverId)}`, 'warn');
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Staff tecnico" subtitle={`${team.staff.length} membri · stipendi ${formatMoney(staffCost)} a stagione`}>
        {team.staff.length === 0 ? (
          <Empty title="Nessun tecnico">Assumi ingegneri dalla scheda Staff.</Empty>
        ) : (
          <ul className="simple-list">
            {team.staff.map((member) => (
              <li key={member.id}>
                <span>{member.first} {member.last}</span>
                <span className="muted small">{formatMoney(member.salary)} · valutazione {member.rating}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customisation
// ---------------------------------------------------------------------------

export function CustomizeTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const team = playerTeamOf(save);
  const teamCareer = save.player.kind === 'team';
  if (teamCareer && !team) return <Empty title="Scuderia non trovata" />;
  const driver = save.player.kind === 'driver' ? playerDriverOf(save) : null;

  return (
    <div className="stack">
      <div className="two-col">
        <Panel title="Identità visiva" subtitle="Le modifiche si applicano subito a schede, classifiche e gara">
          {teamCareer && team ? (
            <div className="custom-form">
              <Field label="Colore principale" hint="Livrea, barre prestazioni e identificazione in pista.">
                <div className="swatches">
                  <input
                    className="input input-color"
                    type="color"
                    value={team.color}
                    onChange={(event) => onUpdate(updateTeamIdentity(save, { color: event.target.value }), true)}
                  />
                  <span className="color-code">{team.color.toUpperCase()}</span>
                </div>
              </Field>
              <Field label="Colore secondario">
                <div className="swatches">
                  <input
                    className="input input-color"
                    type="color"
                    value={team.accent}
                    onChange={(event) => onUpdate(updateTeamIdentity(save, { accent: event.target.value }), true)}
                  />
                  <span className="color-code">{team.accent.toUpperCase()}</span>
                </div>
              </Field>
              <Field label="Emblema">
                <div className="logo-picker">
                  {TEAM_LOGOS.map((id) => (
                    <button
                      key={id}
                      className={`logo-choice ${team.logo === id ? 'is-active' : ''}`}
                      aria-label={`Emblema ${id}`}
                      onClick={() => {
                        onUpdate(updateTeamIdentity(save, { logo: id }), true);
                        toast('Emblema aggiornato', 'good');
                      }}
                    >
                      <TeamLogo team={{ ...team, logo: id }} size={38} />
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          ) : driver ? (
            <div className="custom-form">
              <Field label="Colore del casco" hint="Usato nelle schede pilota e nell'anteprima.">
                <div className="swatches">
                  {HELMET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`swatch ${driver.helmet === color ? 'is-active' : ''}`}
                      style={{ background: color }}
                      aria-label={`Colore ${color}`}
                      onClick={() => onUpdate(updateDriverIdentity(save, { helmet: color }), true)}
                    />
                  ))}
                  <input
                    className="input input-color"
                    type="color"
                    value={driver.helmet}
                    onChange={(event) => onUpdate(updateDriverIdentity(save, { helmet: event.target.value }), true)}
                  />
                </div>
              </Field>
              <Field label="Numero di gara" hint="Da 1 a 99. Compare in schede e risultati.">
                <input
                  className="input input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={driver.number}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value >= 1 && value <= 99) onUpdate(updateDriverIdentity(save, { number: value }), true);
                  }}
                />
              </Field>
            </div>
          ) : null}
        </Panel>

        <Panel title="Anteprima" subtitle="Come apparirà nel paddock">
          {teamCareer && team ? (
            <div className="livery-preview" style={{ background: `linear-gradient(140deg, ${team.color}, ${shadeHex(team.color, -42)})` }}>
              <div className="livery-stripe" style={{ background: team.accent }} />
              <div className="livery-logo">
                <TeamLogo team={team} size={56} />
              </div>
              <div className="livery-text">
                <strong>{t(team.nameId)}</strong>
                <span>{t(team.shortId)}</span>
              </div>
            </div>
          ) : driver ? (
            <div className="driver-preview custom-preview">
              <div className="helmet" style={{ background: `linear-gradient(135deg, ${driver.helmet}, #101010)` }}>
                <span className="helmet-visor" />
                <span className="helmet-number">{driver.number}</span>
              </div>
              <div>
                <strong className="preview-name">{driverName(save.world, driver.id)}</strong>
                <span className="preview-meta">
                  {countryFlag(driver.nat)} {driver.nat} · {driver.age} anni · #{driver.number}
                </span>
                <div className="preview-tags">
                  <Badge tone="info">{save.player.kind === 'driver' && save.player.category ? CATEGORY_LABEL[save.player.category] : 'Free agent'}</Badge>
                  <Badge tone="muted">Overall {overallRating(driver)}</Badge>
                </div>
              </div>
            </div>
          ) : null}
          <p className="muted small">
            Nessun logo, livrea o marchio ufficiale: colori ed emblemi sono originali e servono solo a identificare la tua
            squadra o il tuo pilota.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

export function ArchiveTab({ save }: { save: SaveGame }) {
  const series = playerSeriesOf(save);
  const category = playerCategoryOf(save);
  const history = save.player.seasonHistory;
  const team = playerTeamOf(save);
  const isDriver = save.player.kind === 'driver';
  const playerDriverId = isDriver && save.player.kind === 'driver' ? save.player.driverId : null;
  const playerTeamId = team?.id ?? null;

  const seasonRows = useMemo(() => {
    if (!series) return [];
    return series.results
      .slice()
      .sort((a, b) => a.roundIndex - b.roundIndex)
      .map((result) => {
        const round = series.calendar.find((entry) => entry.index === result.roundIndex);
        const winner = result.rows.find((row) => row.position === 1);
        let position = 0;
        let points = 0;
        if (isDriver) {
          const row = result.rows.find((entry) => entry.driverId === playerDriverId);
          position = row?.position ?? 0;
          points = row?.points ?? 0;
        } else {
          const teamRows = result.rows.filter((entry) => entry.teamId === playerTeamId);
          position = teamRows.length ? Math.min(...teamRows.map((entry) => entry.position)) : 0;
          points = teamRows.reduce((sum, entry) => sum + entry.points, 0);
        }
        return { result, round, winner, position, points };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, save.updatedAt]);

  const wins = history.reduce((sum, record) => sum + record.wins, 0);
  const podiums = history.reduce((sum, record) => sum + record.podiums, 0);
  const bestFinish = history.length ? Math.min(...history.map((record) => record.position)) : null;
  const titles = history.filter((record) => record.position === 1).length;
  const points = history.reduce((sum, record) => sum + record.points, 0);
  const currentPoles = series
    ? series.results.filter((result) => result.poleDriverId === playerDriverId).length
    : 0;
  const currentFastest = series
    ? series.results.filter((result) => result.rows.some((row) => row.driverId === playerDriverId && row.fastestLap)).length
    : 0;

  return (
    <div className="stack">
      <div className="kpi-strip">
        <Stat label="Stagioni" value={history.length} />
        <Stat label="Titoli" value={titles} accent="var(--gold)" />
        <Stat label="Vittorie" value={wins} />
        <Stat label="Podii" value={podiums} />
        <Stat label="Punti totali" value={points} />
        <Stat label="Miglior piazzamento" value={bestFinish ? `P${bestFinish}` : '—'} />
      </div>

      <Panel
        title="Archivio stagioni"
        subtitle="Risultati consolidati di ogni campionato concluso"
      >
        {history.length === 0 ? (
          <Empty title="Archivio vuoto">La prima stagione verrà archiviata al termine del campionato.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Stagione</th>
                <th>Serie</th>
                <th>Squadra</th>
                <th className="num">Pos</th>
                <th className="num">Punti</th>
                <th className="num">Vittorie</th>
                <th className="num">Podii</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={`${record.season}-${record.category}`}>
                  <td className="strong">{record.season}</td>
                  <td>{record.category === 'none' ? '—' : CATEGORY_LABEL[record.category]}</td>
                  <td>{record.teamId ? teamName(save.world, record.teamId) : '—'}</td>
                  <td className="num">
                    <PositionBadge position={record.position} />
                  </td>
                  <td className="num strong">{record.points}</td>
                  <td className="num">{record.wins}</td>
                  <td className="num">{record.podiums}</td>
                  <td className="muted small">{record.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="two-col">
        <Panel
          title={`Stagione ${save.world.season} in corso`}
          subtitle={
            category
              ? `${CATEGORY_LABEL[category]} · ${series?.results.length ?? 0} ${(series?.results.length ?? 0) === 1 ? 'gara archiviata' : 'gare archiviate'}`
              : ''
          }
        >
          {seasonRows.length === 0 ? (
            <Empty title="Nessuna gara disputata">I risultati compaiono dopo il primo weekend confermato.</Empty>
          ) : (
            <ul className="archive-list">
              {seasonRows.map(({ result, round, winner, position, points }) => (
                <li key={result.roundIndex} className="archive-row">
                  <span className="archive-round">{String(result.roundIndex + 1).padStart(2, '0')}</span>
                  <div className="archive-main">
                    <strong>{round ? t(round.eventId) : `Round ${result.roundIndex + 1}`}</strong>
                    <span className="muted small">
                      {round ? t(`circuit.${round.circuitId}`) : ''} · vincitore {winner ? driverName(save.world, winner.driverId) : '—'}
                    </span>
                  </div>
                  <div className="archive-mine">
                    <span className="muted small">Il tuo risultato</span>
                    <strong>{position ? `P${position} · ${points} pt` : '—'}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Record personali" subtitle="Calcolati su tutte le stagioni archiviate">
          <ul className="record-list">
            <li>
              <span>Titoli conquistati</span>
              <strong>{titles}</strong>
            </li>
            <li>
              <span>Vittorie in carriera</span>
              <strong>{wins}</strong>
            </li>
            <li>
              <span>Podii in carriera</span>
              <strong>{podiums}</strong>
            </li>
            <li>
              <span>Pole stagione corrente</span>
              <strong>{currentPoles}</strong>
            </li>
            <li>
              <span>Giri veloci stagione corrente</span>
              <strong>{currentFastest}</strong>
            </li>
            <li>
              <span>Miglior piazzamento</span>
              <strong>{bestFinish ? `P${bestFinish}` : '—'}</strong>
            </li>
          </ul>
          {team && team.history.length > 0 && (
            <>
              <h4 className="subhead">Storico scuderia</h4>
              <table className="table compact">
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
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

const NEWS_FILTERS: { id: 'all' | NewsItem['kind']; label: string }[] = [
  { id: 'all', label: 'Tutte' },
  { id: 'result', label: 'Risultati' },
  { id: 'contract', label: 'Contratti' },
  { id: 'finance', label: 'Finanza' },
  { id: 'title', label: 'Titoli' },
  { id: 'info', label: 'Paddock' },
];

export function NewsTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const [filter, setFilter] = useState<'all' | NewsItem['kind']>('all');
  const unread = Math.max(0, save.news.length - (save.newsSeenCount ?? 0));

  useEffect(() => {
    if (unread > 0) {
      const timer = window.setTimeout(() => onUpdate({ ...save, newsSeenCount: save.news.length }, true), 900);
      return () => window.clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  const items = save.news
    .slice()
    .sort((a, b) => b.season - a.season || b.round - a.round)
    .filter((item) => filter === 'all' || item.kind === filter);

  const counts = save.news.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="stack">
      <Panel
        title="Sala stampa"
        subtitle={`${save.news.length} ${save.news.length === 1 ? 'comunicazione' : 'comunicazioni'} · ${unread} ${unread === 1 ? 'non letta' : 'non lette'}`}
        actions={
          unread > 0 ? (
            <button className="btn btn-ghost btn-sm" onClick={() => onUpdate({ ...save, newsSeenCount: save.news.length }, true)}>
              Segna come lette
            </button>
          ) : undefined
        }
      >
        <div className="news-filters">
          {NEWS_FILTERS.map((entry) => (
            <button
              key={entry.id}
              className={`chip ${filter === entry.id ? 'is-active' : ''}`}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
              {entry.id !== 'all' && counts[entry.id] ? <span className="chip-count">{counts[entry.id]}</span> : null}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <Empty title="Nessuna notizia">Le notizie arrivano da gare, contratti, mercato e bilanci.</Empty>
        ) : (
          <ul className="news-feed">
            {items.map((item) => (
              <li key={item.id} className={`news-entry news-${item.kind}`}>
                <span className="news-entry-icon" aria-hidden>
                  {item.kind === 'contract' ? '✎' : item.kind === 'finance' ? '€' : item.kind === 'result' ? '🏁' : item.kind === 'title' ? '★' : '●'}
                </span>
                <div>
                  <p>{newsText(item, save)}</p>
                  <span className="news-meta">
                    Stagione {item.season} · Round {item.round} · {NEWS_FILTERS.find((entry) => entry.id === item.kind)?.label ?? 'Paddock'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
