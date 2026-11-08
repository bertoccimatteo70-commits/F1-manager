import React, { useMemo, useState } from 'react';
import type { Category, SaveGame, StaffMember } from '../game/types';
import {
  acceptOffer,
  contractOf,
  declineOffer,
  economicSnapshot,
  expectedPositionForCar,
  fireStaff,
  hireStaff,
  negotiateOffer,
  playerCategoryOf,
  playerDriverOf,
  playerSeriesOf,
  playerTeamOf,
  releaseContractAndRetry,
  releaseDriverFromTeam,
  retireCareer,
  signFreeAgent,
  signSponsor,
  startDevelopment,
  startTeamNextSeason,
  takeLoan,
  teamLabel,
  type SkillKey,
} from '../game/engine/career';
import { overallRating, suggestedSalary } from '../game/engine/world';
import { CATEGORY_LABEL } from '../game/data/catalog';
import { countryFlag, formatMoney, ordinal } from '../game/engine/format';
import { t } from '../game/names/registry';
import {
  Badge,
  Bar,
  ConfirmButton,
  Empty,
  Field,
  Modal,
  Money,
  Panel,
  Select,
  Stat,
  TeamDot,
  TeamLogo,
} from './components';
import { driverName, isPlayerDriver, newsText, teamName, useNames } from './helpers';

type Updater = (next: SaveGame, persist?: boolean) => void;

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

export function MarketTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  useNames();
  if (save.player.kind === 'driver') return <DriverMarket save={save} onUpdate={onUpdate} />;
  return <TeamMarket save={save} onUpdate={onUpdate} />;
}

function DriverMarket({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const career = save.player;
  if (career.kind !== 'driver') return null;
  const driver = playerDriverOf(save);
  if (!driver) return <Empty title="Pilota non trovato" />;
  const contract = contractOf(save, driver.id);
  const team = playerTeamOf(save);
  const freeAgents = Object.values(save.world.drivers)
    .filter((d) => !d.retired && d.teamId === null)
    .sort((a, b) => overallRating(b) - overallRating(a))
    .slice(0, 12);

  return (
    <div className="stack">
      <Panel title="La tua posizione contrattuale" subtitle="Il mercato si apre al termine della stagione, con offerte basate sui risultati.">
        {contract && team ? (
          <div className="contract-detail">
            <div className="contract-team">
              <TeamLogo team={team} size={36} />
              <div>
                <strong>{teamName(save.world, team.id)}</strong>
                <span className="muted small">
                  {CATEGORY_LABEL[team.category]} · scadenza {contract.endSeason}
                </span>
              </div>
            </div>
            <div className="contract-detail-grid">
              <Stat label="Stipendio annuo" value={formatMoney(contract.salary)} />
              <Stat label="Bonus vittoria" value={formatMoney(contract.winBonus)} />
              <Stat label="Bonus podio" value={formatMoney(contract.podiumBonus)} />
              <Stat label="Bonus titolo" value={formatMoney(contract.titleBonus)} />
              <Stat label="Penale rescissione" value={formatMoney(contract.releaseFee)} />
              <Stat label="Obiettivo" value={contract.objective} small />
            </div>
          </div>
        ) : (
          <Empty title="Nessun contratto attivo">
            Sei un free agent: nella fase di mercato puoi accettare una delle offerte disponibili.
          </Empty>
        )}
      </Panel>

      <Panel title="Offerte sul tavolo" subtitle={save.offers.length ? 'Tratta il contratto o firma subito.' : 'Nessuna offerta in corso'}>
        {save.offers.length === 0 ? (
          <Empty title="Il telefono non squilla">Le scuderie si muovono a fine campionato. Chiudi bene la stagione.</Empty>
        ) : (
          <OffersList save={save} onUpdate={onUpdate} />
        )}
      </Panel>

      <Panel title="Piloti liberi" subtitle="I nomi che potrebbero incrociare la tua strada in pista">
        <div className="free-agent-grid">
          {freeAgents.map((free) => (
            <div key={free.id} className="free-agent">
              <span className="free-agent-name">
                {countryFlag(free.nat)} {driverName(save.world, free.id)}
              </span>
              <span className="muted small">
                {free.age} anni · Overall {overallRating(free)}
              </span>
            </div>
          ))}
          {freeAgents.length === 0 && <span className="muted small">Tutti i piloti sono sotto contratto.</span>}
        </div>
      </Panel>
    </div>
  );
}

function TeamMarket({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const career = save.player;
  if (career.kind !== 'team') return null;
  const team = playerTeamOf(save);
  const [selected, setSelected] = useState<string | null>(null);
  const [salary, setSalary] = useState(0);
  const [seasons, setSeasons] = useState(1);

  const freeAgents = useMemo(
    () =>
      Object.values(save.world.drivers)
        .filter((d) => !d.retired && d.teamId === null)
        .sort((a, b) => overallRating(b) - overallRating(a)),
    [save.world.drivers, save.updatedAt]
  );

  if (!team) return <Empty title="Scuderia non trovata" />;
  const drivers = team.driverIds.filter(Boolean) as string[];
  const openSeat = team.driverIds.some((id) => id === null);
  const selectedDriver = selected ? save.world.drivers[selected] : null;

  const openSign = (driverId: string) => {
    const driver = save.world.drivers[driverId];
    if (!driver || !team) return;
    const demand = suggestedSalary(driver.reputation, team.category, team.reputation);
    setSelected(driverId);
    setSalary(Math.round((demand * 0.95) / 50_000) * 50_000);
    setSeasons(1);
  };

  return (
    <div className="stack">
      <Panel
        title="Linea piloti"
        subtitle={`${drivers.length}/2 sedili occupati`}
        actions={
          openSeat ? <Badge tone="warn">1+ sedile libero</Badge> : <Badge tone="good">Lineup completa</Badge>
        }
      >
        {drivers.length === 0 ? (
          <Empty title="Nessun pilota">Firma due piloti per scendere in pista.</Empty>
        ) : (
          <div className="lineup">
            {team.driverIds.map((driverId, slot) => {
              if (!driverId) {
                return (
                  <div key={`empty-${slot}`} className="lineup-slot is-empty">
                    <span className="lineup-number">#{slot + 1}</span>
                    <div>
                      <strong>Sedile libero</strong>
                      <span className="muted small">Firma un pilota dal mercato</span>
                    </div>
                  </div>
                );
              }
              const driver = save.world.drivers[driverId];
              const contract = contractOf(save, driverId);
              return (
                <div key={driverId} className="lineup-slot">
                  <span className="lineup-number">#{slot + 1}</span>
                  <div className="lineup-info">
                    <strong>
                      {countryFlag(driver.nat)} {driverName(save.world, driverId)}
                    </strong>
                    <span className="muted small">
                      {driver.age} anni · Overall {overallRating(driver)} · {contract ? `${formatMoney(contract.salary)}/anno` : 'senza contratto'}
                    </span>
                  </div>
                  <ConfirmButton
                    label="Licenzia"
                    confirmLabel={`Penale ${contract ? formatMoney(Math.round(contract.salary * 0.25)) : '0 €'}`}
                    className="btn btn-ghost btn-sm"
                    onConfirm={() => onUpdate(releaseDriverFromTeam(save, driverId), true)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Mercato piloti" subtitle="Piloti senza contratto, pronti a firmare">
        <table className="table">
          <thead>
            <tr>
              <th>Pilota</th>
              <th>Naz.</th>
              <th className="num">Età</th>
              <th className="num">Overall</th>
              <th className="num">Pace</th>
              <th className="num">Tecnica</th>
              <th className="num">Richiesta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {freeAgents.map((driver) => {
              const demand = suggestedSalary(driver.reputation, team.category, team.reputation);
              return (
                <tr key={driver.id}>
                  <td className="strong">{driverName(save.world, driver.id)}</td>
                  <td>{countryFlag(driver.nat)}</td>
                  <td className="num">{driver.age}</td>
                  <td className="num strong">{overallRating(driver)}</td>
                  <td className="num">{Math.round(driver.skills.pace)}</td>
                  <td className="num">{Math.round((driver.skills.tyre + driver.skills.consistency) / 2)}</td>
                  <td className="num">{formatMoney(demand)}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" disabled={!openSeat} onClick={() => openSign(driver.id)}>
                      Ingaggia
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {freeAgents.length === 0 && <Empty title="Mercato vuoto">Nessun pilota disponibile in questo momento.</Empty>}
      </Panel>

      <Panel title="Sponsor" subtitle={`${team.sponsorDeals.length}/4 contratti attivi`}>
        <div className="sponsor-grid">
          {team.sponsorDeals.map((deal) => (
            <div key={deal.sponsorId} className="sponsor-card">
              <strong>{t(`sponsor.${deal.sponsorId}`)}</strong>
              <span className="muted small">Attivo</span>
              <span className="sponsor-money">{formatMoney(deal.perRace)} / gara</span>
              <span className="muted small">{deal.objective}</span>
            </div>
          ))}
          {career.sponsorOffers.map((deal, index) => (
            <div key={`${deal.sponsorId}-${index}`} className="sponsor-card is-offer">
              <strong>{t(`sponsor.${deal.sponsorId}`)}</strong>
              <span className="muted small">Proposta</span>
              <span className="sponsor-money">{formatMoney(deal.perRace)} / gara</span>
              <span className="muted small">Bonus obiettivo {formatMoney(deal.bonus)}</span>
              <button
                className="btn btn-sm btn-primary"
                disabled={team.sponsorDeals.length >= 4}
                onClick={() => onUpdate(signSponsor(save, index), true)}
              >
                Firma
              </button>
            </div>
          ))}
          {career.sponsorOffers.length === 0 && <span className="muted small">Nuove proposte arriveranno a fine stagione.</span>}
        </div>
      </Panel>

      <Modal
        open={Boolean(selectedDriver)}
        title={selectedDriver ? `Contratto per ${driverName(save.world, selectedDriver.id)}` : ''}
        onClose={() => setSelected(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>
              Annulla
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!selectedDriver) return;
                onUpdate(signFreeAgent(save, selectedDriver.id, salary, seasons), true);
                setSelected(null);
              }}
            >
              Firma il contratto
            </button>
          </>
        }
      >
        {selectedDriver && (
          <div className="modal-form">
            <p className="muted small">
              Anticipo richiesto: <strong>{formatMoney(Math.round(salary * 0.25))}</strong> · budget disponibile{' '}
              <strong>{formatMoney(team.budget)}</strong>
            </p>
            <Field label={`Stipendio annuo: ${formatMoney(salary)}`} hint="Offri troppo poco? Il pilota può rifiutare. Offri troppo? Peserà sul bilancio.">
              <input
                className="range"
                type="range"
                min={Math.round((suggestedSalary(selectedDriver.reputation, team.category, team.reputation) * 0.6) / 50_000) * 50_000}
                max={Math.round((suggestedSalary(selectedDriver.reputation, team.category, team.reputation) * 1.8) / 50_000) * 50_000}
                step={50_000}
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
              />
            </Field>
            <Field label="Durata">
              <div className="segmented">
                {[1, 2, 3].map((value) => (
                  <button key={value} className={`seg ${seasons === value ? 'is-active' : ''}`} onClick={() => setSeasons(value)}>
                    {value} stagion{value === 1 ? 'e' : 'i'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offers / offseason
// ---------------------------------------------------------------------------

export function OffersPanel({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  if (save.player.kind !== 'driver') return null;
  return <OffersList save={save} onUpdate={onUpdate} />;
}

function OffersList({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const driver = playerDriverOf(save);
  if (!driver) return <Empty title="Pilota non trovato" />;
  return (
    <div className="offers-list">
      {save.offers.map((offer) => {
        const team = save.world.teams[offer.teamId];
        return (
          <article key={offer.id} className={`offer-card ${offer.withdrawn ? 'is-withdrawn' : ''}`} style={{ borderLeftColor: team?.color }}>
            <div className="offer-head">
              <div className="offer-team">
                <TeamLogo team={team} size={40} />
                <div>
                  <strong>{team ? teamName(save.world, team.id) : offer.teamId}</strong>
                  <span className="muted small">
                    {CATEGORY_LABEL[offer.category]} · {offer.messageId}
                  </span>
                </div>
              </div>
              <div className="offer-tags">
                {offer.kind === 'promotion' && <Badge tone="good">Promozione</Badge>}
                {offer.kind === 'renewal' && <Badge tone="info">Rinnovo</Badge>}
                {offer.kind === 'demotion' && <Badge tone="warn">Ripartenza</Badge>}
                {offer.withdrawn && <Badge tone="bad">Ritirata</Badge>}
              </div>
            </div>
            <div className="offer-terms">
              <div>
                <span>Stipendio</span>
                <strong>{formatMoney(offer.salary)}</strong>
              </div>
              <div>
                <span>Durata</span>
                <strong>{offer.seasons} stagioni</strong>
              </div>
              <div>
                <span>Bonus vittoria</span>
                <strong>{formatMoney(offer.winBonus)}</strong>
              </div>
              <div>
                <span>Bonus titolo</span>
                <strong>{formatMoney(offer.titleBonus)}</strong>
              </div>
              <div>
                <span>Penale</span>
                <strong>{formatMoney(offer.releaseFee)}</strong>
              </div>
              <div>
                <span>Obiettivo</span>
                <strong>{offer.objective}</strong>
              </div>
            </div>
            <div className="offer-actions">
              <button className="btn btn-primary btn-sm" disabled={offer.withdrawn} onClick={() => onUpdate(acceptOffer(save, offer.id), true)}>
                Accetta
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={offer.negotiated || offer.withdrawn}
                onClick={() => onUpdate(negotiateOffer(save, offer.id), true)}
              >
                {offer.negotiated ? 'Trattativa conclusa' : 'Tratta +18%'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => onUpdate(declineOffer(save, offer.id), true)}>
                Rifiuta
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function OffseasonPanel({
  save,
  onUpdate,
  onOpenMarket,
}: {
  save: SaveGame;
  onUpdate: Updater;
  onOpenMarket: () => void;
}) {
  useNames();
  const isDriver = save.player.kind === 'driver';
  return (
    <div className="stack">
      <Panel
        title={isDriver ? 'Mercato e trattative' : 'Chiusura della stagione'}
        subtitle={
          isDriver
            ? 'Scegli il prossimo contratto: la nuova stagione inizierà appena firmi.'
            : 'Premi, sponsor e rinnovi: prepara la prossima stagione.'
        }
        accent="var(--gold)"
      >
        {isDriver ? (
          <DriverOffseason save={save} onUpdate={onUpdate} />
        ) : (
          <TeamOffseason save={save} onUpdate={onUpdate} />
        )}
      </Panel>

      <div className="two-col">
        <Panel title="Ultima stagione" subtitle="Riepilogo dei risultati">
          <SeasonRecap save={save} />
        </Panel>
        <Panel title="Prossimi passi">
          <ul className="check-list">
            {isDriver ? (
              <>
                <li>Accetta un'offerta per correre la prossima stagione.</li>
                <li>Puoi trattare lo stipendio una sola volta per offerta.</li>
                <li>Se rifiuti tutto resti free agent: puoi ritirarti o riprovare nel mercato.</li>
              </>
            ) : (
              <>
                <li>I premi di fine stagione sono già stati accreditati.</li>
                <li>Rinnova i contratti in scadenza o ingaggia nuovi piloti.</li>
                <li>Investi in sviluppo per non restare indietro.</li>
              </>
            )}
          </ul>
          <button className="btn btn-ghost btn-sm" onClick={onOpenMarket}>
            Apri il mercato
          </button>
        </Panel>
      </div>
    </div>
  );
}

function DriverOffseason({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const career = save.player;
  if (career.kind !== 'driver') return null;
  const driver = playerDriverOf(save);
  const contract = driver ? contractOf(save, driver.id) : null;
  return (
    <div className="stack">
      {save.offers.length > 0 ? (
        <OffersList save={save} onUpdate={onUpdate} />
      ) : (
        <Empty title="Nessuna offerta disponibile">
          Il paddock non ti ha cercato. Puoi ritirarti oppure liberare il contratto e riprovare nel mercato.
        </Empty>
      )}
      <div className="offseason-actions">
        {contract && (
          <ConfirmButton
            label={`Rescindi il contratto (penale ${formatMoney(contract.releaseFee)})`}
            confirmLabel="Confermi la rescissione?"
            className="btn btn-ghost"
            onConfirm={() => onUpdate(releaseContractAndRetry(save), true)}
          />
        )}
        <ConfirmButton
          label="Ritirati dalle competizioni"
          confirmLabel="Vuoi davvero chiudere la carriera?"
          className="btn btn-ghost"
          onConfirm={() => onUpdate(retireCareer(save), true)}
        />
        <button className="btn btn-ghost" onClick={() => onUpdate(refreshOffers(save), true)}>
          Aggiorna le offerte
        </button>
      </div>
    </div>
  );
}

function refreshOffers(save: SaveGame): SaveGame {
  // Re-entering the market recalculates the board without touching results.
  save.offers = [];
  return save;
}

function TeamOffseason({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const team = playerTeamOf(save);
  if (!team) return <Empty title="Scuderia non trovata" />;
  const snapshot = economicSnapshot(save);
  return (
    <div className="stack">
      <div className="stats-grid">
        <Stat label="Budget" value={<Money value={team.budget} />} />
        <Stat label="Saldo per gara (stima)" value={<Money value={snapshot.balance} />} />
        <Stat label="Piloti sotto contratto" value={team.driverIds.filter(Boolean).length} />
        <Stat label="Progetti in corso" value={team.projects.length} />
      </div>
      {team.budget < 0 && (
        <p className="form-error">
          Attenzione: il budget è negativo. Se scende sotto la soglia di fallimento la carriera si chiude.
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary btn-lg" onClick={() => onUpdate(startTeamNextSeason(save), true)}>
          Inizia la nuova stagione
        </button>
        <span className="muted small">Potrai rinnovare i contratti dal mercato durante la stagione.</span>
      </div>
    </div>
  );
}

function SeasonRecap({ save }: { save: SaveGame }) {
  const history = save.player.seasonHistory;
  if (history.length === 0) return <Empty title="Nessuna stagione conclusa" />;
  const last = history[history.length - 1];
  return (
    <div className="stats-grid">
      <Stat label="Stagione" value={last.season} />
      <Stat label="Categoria" value={last.category === 'none' ? '—' : last.category} />
      <Stat label="Posizione" value={`P${last.position}`} />
      <Stat label="Punti" value={last.points} />
      <Stat label="Vittorie" value={last.wins} />
      <Stat label="Podii" value={last.podiums} />
      <Stat label="Nota" value={last.note} small />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finances
// ---------------------------------------------------------------------------

export function FinanceTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  useNames();
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanOpen, setLoanOpen] = useState(false);
  if (save.player.kind === 'driver') return <DriverFinance save={save} />;
  const team = playerTeamOf(save);
  const career = save.player;
  if (!team) return <Empty title="Scuderia non trovata" />;
  const snapshot = economicSnapshot(save);
  const loanOptions = [Math.round(500_000 / 100) * 100, 2_000_000, 5_000_000];

  return (
    <div className="stack">
      <div className="stats-grid">
        <Stat label="Budget disponibile" value={<Money value={team.budget} />} accent="var(--accent-2)" />
        <Stat label="Entrate per gara" value={<Money value={snapshot.income} />} />
        <Stat label="Uscite per gara" value={<Money value={snapshot.expenses} />} />
        <Stat label="Saldo stimato" value={<Money value={snapshot.balance} />} accent={snapshot.balance < 0 ? 'var(--bad)' : 'var(--good)'} />
        <Stat label="Monte stipendi" value={formatMoney(snapshot.salary)} hint="Piloti, per stagione" />
        <Stat label="Prestiti attivi" value={team.loans.length} />
      </div>

      <div className="two-col">
        <Panel title="Sponsor" subtitle={`${team.sponsorDeals.length}/4 contratti`}>
          <ul className="simple-list">
            {team.sponsorDeals.map((deal) => (
              <li key={deal.sponsorId}>
                <span>{t(`sponsor.${deal.sponsorId}`)}</span>
                <span className="sponsor-money">{formatMoney(deal.perRace)}/gara</span>
              </li>
            ))}
            {team.sponsorDeals.length === 0 && <li className="muted">Nessuno sponsor attivo.</li>}
          </ul>
          {career.sponsorOffers.length > 0 && (
            <div className="sponsor-offers">
              <span className="muted small">Proposte in attesa</span>
              {career.sponsorOffers.map((deal, index) => (
                <div key={`${deal.sponsorId}-${index}`} className="sponsor-offer-row">
                  <span>{t(`sponsor.${deal.sponsorId}`)}</span>
                  <span>{formatMoney(deal.perRace)}/gara</span>
                  <button className="btn btn-sm btn-primary" onClick={() => onUpdate(signSponsor(save, index), true)}>
                    Firma
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Debito" subtitle="I prestiti vengono restituiti a fine stagione con il 12% di interessi.">
          {team.loans.length === 0 ? (
            <Empty title="Nessun debito">La scuderia non ha prestiti attivi.</Empty>
          ) : (
            <ul className="simple-list">
              {team.loans.map((loan, index) => (
                <li key={index}>
                  <span>Prestito {index + 1}</span>
                  <span>{formatMoney(loan.amount)} · interessi 12%</span>
                </li>
              ))}
            </ul>
          )}
          <div className="form-actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setLoanAmount(loanOptions[0]);
                setLoanOpen(true);
              }}
            >
              Accendi un prestito
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Progetti di sviluppo" subtitle="Spese già impegnate nel budget">
        {team.projects.length === 0 ? (
          <Empty title="Nessun progetto attivo">Avvia un progetto dalla scheda Sviluppo.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Progetto</th>
                <th className="num">Costo</th>
                <th className="num">Gare rimanenti</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {team.projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.label}</td>
                  <td className="num">{formatMoney(project.cost)}</td>
                  <td className="num">{Math.max(0, Math.ceil(project.remaining))}</td>
                  <td>
                    <Bar value={project.totalRaces - project.remaining} max={project.totalRaces} color={team.color} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Storico della scuderia">
        {team.history.length === 0 ? (
          <Empty title="Prima stagione" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Stagione</th>
                <th className="num">Posizione</th>
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

      <Modal
        open={loanOpen}
        title="Accendi un prestito"
        onClose={() => setLoanOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setLoanOpen(false)}>
              Annulla
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onUpdate(takeLoan(save, loanAmount), true);
                setLoanOpen(false);
              }}
            >
              Accetta il prestito
            </button>
          </>
        }
      >
        <Field label="Importo" hint="Restituzione a fine stagione con interessi del 12%.">
          <div className="segmented">
            {loanOptions.map((amount) => (
              <button key={amount} className={`seg ${loanAmount === amount ? 'is-active' : ''}`} onClick={() => setLoanAmount(amount)}>
                {formatMoney(amount)}
              </button>
            ))}
          </div>
        </Field>
      </Modal>
    </div>
  );
}

function DriverFinance({ save }: { save: SaveGame }) {
  if (save.player.kind !== 'driver') return null;
  const driver = playerDriverOf(save);
  const contract = driver ? contractOf(save, driver.id) : null;
  const totalEarned = save.player.seasonHistory.reduce((sum, record) => sum + record.salary, 0) + save.player.money;
  return (
    <div className="stack">
      <div className="stats-grid">
        <Stat label="Patrimonio" value={<Money value={save.player.money} />} accent="var(--accent-2)" />
        <Stat label="Stipendio annuo" value={contract ? formatMoney(contract.salary) : '—'} />
        <Stat label="Ultimo incasso" value={<Money value={save.player.lastRoundPay} />} />
        <Stat label="Guadagni stimati in carriera" value={formatMoney(totalEarned)} />
      </div>
      <Panel title="Contratto" subtitle={contract ? 'Bonus e clausole attive' : 'Nessun contratto'}>
        {contract ? (
          <div className="contract-detail-grid">
            <Stat label="Scadenza" value={contract.endSeason} />
            <Stat label="Bonus vittoria" value={formatMoney(contract.winBonus)} />
            <Stat label="Bonus podio" value={formatMoney(contract.podiumBonus)} />
            <Stat label="Bonus titolo" value={formatMoney(contract.titleBonus)} />
            <Stat label="Penale rescissione" value={formatMoney(contract.releaseFee)} />
            <Stat label="Obiettivo" value={contract.objective} small />
          </div>
        ) : (
          <Empty title="Nessun contratto" />
        )}
      </Panel>
      <Panel title="Storico stipendi">
        {save.player.seasonHistory.length === 0 ? (
          <Empty title="Nessuna stagione conclusa" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Stagione</th>
                <th>Squadra</th>
                <th className="num">Stipendio</th>
                <th className="num">Posizione</th>
              </tr>
            </thead>
            <tbody>
              {save.player.seasonHistory.map((record) => (
                <tr key={`${record.season}-${record.category}`}>
                  <td>{record.season}</td>
                  <td>{record.teamId ? teamLabel(save.world, record.teamId) : '—'}</td>
                  <td className="num">{formatMoney(record.salary)}</td>
                  <td className="num">P{record.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Development
// ---------------------------------------------------------------------------

const DEPARTMENTS: { key: 'aero' | 'engine' | 'chassis' | 'suspension' | 'brakes' | 'reliability'; label: string; description: string }[] = [
  { key: 'aero', label: 'Aerodinamica', description: 'Carico e efficienza: passo in curva e velocità di punta.' },
  { key: 'engine', label: 'Motore', description: 'Potenza e guidabilità: trazione e velocità massima.' },
  { key: 'chassis', label: 'Telaio', description: 'Bilanciamento e reattività della vettura.' },
  { key: 'suspension', label: 'Sospensioni', description: 'Tenuta sui cordoli e gestione delle gomme.' },
  { key: 'brakes', label: 'Freni', description: 'Stabilità in staccata e fiducia del pilota.' },
  { key: 'reliability', label: 'Affidabilità', description: 'Riduce i ritiri per guasti meccanici.' },
];

export function DevelopmentTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const team = playerTeamOf(save);
  const [open, setOpen] = useState(false);
  const [department, setDepartment] = useState<'aero' | 'engine' | 'chassis' | 'suspension' | 'brakes' | 'reliability'>('aero');
  const [size, setSize] = useState<'small' | 'large'>('small');
  const [risky, setRisky] = useState(false);
  if (!team) return <Empty title="Scuderia non trovata" />;
  const rivals = save.world.series[team.category].teamIds
    .map((id) => save.world.teams[id])
    .sort((a, b) => carScore(b) - carScore(a));

  return (
    <div className="stack">
      <Panel
        title="Reparto ricerca e sviluppo"
        subtitle={`La monoposto attuale ha un indice di prestazione di ${Math.round(carScore(team))}/100.`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
            + Nuovo progetto
          </button>
        }
      >
        <div className="departments">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.key} className="department">
              <div className="department-head">
                <strong>{dept.label}</strong>
                <span className="department-value">{Math.round(team.car[dept.key])}</span>
              </div>
              <Bar value={team.car[dept.key]} color={team.color} />
              <p className="muted small">{dept.description}</p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDepartment(dept.key);
                  setOpen(true);
                }}
              >
                Sviluppa
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="Progetti in corso" subtitle="Il progresso avanza a ogni gara">
          {team.projects.length === 0 ? (
            <Empty title="Nessun progetto attivo">Avvia un progetto per migliorare la monoposto.</Empty>
          ) : (
            <ul className="project-list">
              {team.projects.map((project) => (
                <li key={project.id}>
                  <div className="project-head">
                    <strong>{project.label}</strong>
                    <Badge tone={project.risky ? 'warn' : 'muted'}>{project.risky ? 'Rischioso' : 'Standard'}</Badge>
                  </div>
                  <Bar value={project.totalRaces - project.remaining} max={project.totalRaces} color={team.color} />
                  <span className="muted small">{Math.max(0, Math.ceil(project.remaining))} gare al completamento</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Confronto monoposto" subtitle={CATEGORY_LABEL[team.category]}>
          <table className="table compact">
            <thead>
              <tr>
                <th>Squadra</th>
                <th className="num">Indice</th>
              </tr>
            </thead>
            <tbody>
              {rivals.map((rival) => (
                <tr key={rival.id} className={rival.id === team.id ? 'is-me' : ''}>
                  <td>
                    <div className="table-name">
                      <TeamDot team={rival} />
                      <span>{teamName(save.world, rival.id)}</span>
                    </div>
                  </td>
                  <td className="num strong">{Math.round(carScore(rival))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Modal
        open={open}
        title="Nuovo progetto di sviluppo"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Annulla
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onUpdate(startDevelopment(save, department, size, risky), true);
                setOpen(false);
              }}
            >
              Avvia progetto
            </button>
          </>
        }
      >
        <div className="modal-form">
          <Field label="Area di sviluppo">
            <Select
              value={department}
              onChange={(value) => setDepartment(value as typeof department)}
              options={DEPARTMENTS.map((dept) => ({ value: dept.key, label: dept.label }))}
            />
          </Field>
          <Field label="Dimensione del progetto">
            <div className="segmented">
              <button className={`seg ${size === 'small' ? 'is-active' : ''}`} onClick={() => setSize('small')}>
                Pacchetto rapido (2 gare)
              </button>
              <button className={`seg ${size === 'large' ? 'is-active' : ''}`} onClick={() => setSize('large')}>
                Grande aggiornamento (4 gare)
              </button>
            </div>
          </Field>
          <Field label="Rischio" hint="I progetti rischiosi costano meno ma possono fallire.">
            <div className="segmented">
              <button className={`seg ${!risky ? 'is-active' : ''}`} onClick={() => setRisky(false)}>
                Standard
              </button>
              <button className={`seg ${risky ? 'is-active' : ''}`} onClick={() => setRisky(true)}>
                Risparmio (-28%) con rischio fallimento
              </button>
            </div>
          </Field>
          <p className="muted small">
            Il costo viene addebitato subito. Gli ingegneri con valutazione alta accelerano lo sviluppo. Budget attuale:{' '}
            {formatMoney(team.budget)}.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function carScore(team: { car: { aero: number; engine: number; chassis: number; suspension: number; brakes: number; reliability: number } }): number {
  return team.car.aero * 0.27 + team.car.engine * 0.22 + team.car.chassis * 0.24 + team.car.suspension * 0.14 + team.car.brakes * 0.13;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<StaffMember['role'], string> = {
  technical: 'Direttore Tecnico',
  aero: 'Capo Aerodinamico',
  engine: 'Capo Motorista',
  race: 'Ingegnere di Pista',
};

export function StaffTab({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const career = save.player;
  const team = playerTeamOf(save);
  if (career.kind !== 'team' || !team) return <Empty title="Scuderia non trovata" />;
  return (
    <div className="stack">
      <Panel title="Organico tecnico" subtitle={`${team.staff.length}/4 posizioni coperte`}>
        {team.staff.length === 0 ? (
          <Empty title="Nessun ingegnere">Assumi personale per accelerare lo sviluppo e ridurre gli errori.</Empty>
        ) : (
          <div className="staff-grid">
            {team.staff.map((member) => (
              <div key={member.id} className="staff-card">
                <div className="staff-head">
                  <strong>
                    {member.first} {member.last}
                  </strong>
                  <Badge tone={member.rating >= 80 ? 'good' : member.rating >= 65 ? 'info' : 'muted'}>{member.rating}</Badge>
                </div>
                <span className="muted small">{ROLE_LABEL[member.role]}</span>
                <Bar value={member.rating} color="var(--accent-2)" />
                <span className="staff-salary">{formatMoney(member.salary)} / stagione</span>
                <ConfirmButton
                  label="Licenzia"
                  confirmLabel="Confermi il licenziamento?"
                  className="btn btn-ghost btn-sm"
                  onConfirm={() => onUpdate(fireStaff(save, member.id), true)}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Candidati disponibili" subtitle="Valuta competenza e costo prima di firmare">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ruolo</th>
              <th className="num">Valutazione</th>
              <th className="num">Stipendio</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {career.staffPool.map((member) => (
              <tr key={member.id}>
                <td className="strong">
                  {member.first} {member.last}
                </td>
                <td>{ROLE_LABEL[member.role]}</td>
                <td className="num">{member.rating}</td>
                <td className="num">{formatMoney(member.salary)}</td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    disabled={team.staff.length >= 4 || team.budget < member.salary}
                    onClick={() => onUpdate(hireStaff(save, member.id), true)}
                  >
                    Assumi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {career.staffPool.length === 0 && <Empty title="Nessun candidato">Nuovi candidati arrivano a fine stagione.</Empty>}
      </Panel>

      <Panel title="Effetto dello staff">
        <ul className="check-list">
          <li>Direttore tecnico e capi reparto accelerano lo sviluppo della monoposto.</li>
          <li>Ingegnere di pista e affidabilità del personale riducono gli errori in gara.</li>
          <li>Stipendi e licenziamenti pesano sul bilancio della scuderia.</li>
        </ul>
      </Panel>
    </div>
  );
}

void ordinal;
void isPlayerDriver;
void newsText;
void playerCategoryOf;
void playerSeriesOf;
void expectedPositionForCar;
