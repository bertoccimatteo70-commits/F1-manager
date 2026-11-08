import React, { useEffect, useRef, useState } from 'react';
import type { CarState, Compound, GlobalSettings, RaceState, SaveGame } from '../game/types';
import {
  finishWeekend,
  pitPlayerCar,
  playerDriverIdsOf,
  playerTeamOf,
  simulateOneLap,
  simulateRaceToEnd,
  startRace,
  teamLabel,
  updateWeekendSetup,
} from '../game/engine/career';
import { addPlannedStop, buildRaceResult, raceOrder, weatherLabel } from '../game/engine/race';
import { CIRCUITS, circuitCountry } from '../game/data/catalog';
import { COMPOUND_COLOR, describeEvent, formatGap, formatLap } from '../game/engine/format';
import { t } from '../game/names/registry';
import {
  Badge,
  Bar,
  Empty,
  Field,
  FlagTag,
  Panel,
  PositionBadge,
  Stat,
  TeamDot,
  TyrePill,
} from './components';
import { driverName, useNames } from './helpers';
import type { RaceResultRow } from '../game/types';

type Updater = (next: SaveGame, persist?: boolean) => void;

const COMPOUND_OPTIONS: { value: Compound; label: string }[] = [
  { value: 'soft', label: 'Morbida' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Dura' },
  { value: 'inter', label: 'Intermedia' },
  { value: 'wet', label: 'Bagnata' },
];

export function WeekendScreen({
  save,
  settings,
  onUpdate,
  onMenu,
  onExit,
}: {
  save: SaveGame;
  settings: GlobalSettings;
  onUpdate: Updater;
  onMenu: () => void;
  onExit: () => void;
}) {
  useNames();
  const weekend = save.weekend;
  const category = save.player.category;
  const series = category ? save.world.series[category] : null;
  const round = weekend && series ? series.calendar[weekend.roundIndex] : null;
  const race = weekend?.race ?? null;

  const cancelWeekend = () => {
    onUpdate({ ...save, weekend: null, phase: 'season' }, true);
  };

  return (
    <div className="career-shell">
      <header className="career-topbar weekend-topbar">
        <div className="career-identity">
          <span className="weekend-flag">{round ? countryFlagFor(round.circuitId) : '🏁'}</span>
          <div>
            <strong className="career-name">{round ? t(round.eventId) : 'Weekend di gara'}</strong>
            <span className="career-sub">
              {round ? `${t(`circuit.${round.circuitId}`)} · ${circuitCountry(round.circuitId)}` : ''} · stagione {save.world.season}
            </span>
          </div>
        </div>
        <div className="career-meta">
          {race && (
            <div className="meta-block">
              <span className="meta-label">Giro</span>
              <span className="meta-value">
                {Math.min(race.lap, race.lapsTotal)}/{race.lapsTotal}
              </span>
            </div>
          )}
          {weekend && (
            <div className="meta-block">
              <span className="meta-label">Distanza</span>
              <span className="meta-value">{weekend.pct}%</span>
            </div>
          )}
          <div className="topbar-actions">
            {!race && (
              <button className="btn btn-ghost btn-sm" onClick={cancelWeekend}>
                Annulla weekend
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onMenu}>
              Menu
            </button>
          </div>
        </div>
      </header>

      <main className="career-main weekend-main">
        {!weekend ? (
          <Empty title="Nessun weekend attivo" />
        ) : !race ? (
          <QualifyingSetup save={save} onUpdate={onUpdate} />
        ) : !race.finished ? (
          <LiveRace save={save} settings={settings} onUpdate={onUpdate} />
        ) : (
          <RaceClassification save={save} onUpdate={onUpdate} />
        )}
      </main>
    </div>
  );
}

function countryFlagFor(_circuitId: string): string {
  return '🏁';
}

// ---------------------------------------------------------------------------
// Qualifying + strategy setup
// ---------------------------------------------------------------------------

function QualifyingSetup({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const weekend = save.weekend;
  const category = save.player.category;
  const series = category ? save.world.series[category] : null;
  if (!weekend || !series) return <Empty title="Weekend non disponibile" />;
  const round = series.calendar[weekend.roundIndex];
  const qualifying = weekend.qualifying ?? series.qualifying[weekend.roundIndex];
  const playerIds = playerDriverIdsOf(save);
  const team = playerTeamOf(save);
  const setup = weekend.setup;

  const update = (patch: Partial<typeof setup>) => onUpdate(updateWeekendSetup(save, patch), false);
  const circuit = CIRCUITS.find((entry) => entry.id === round.circuitId);
  const practiceLaps = Math.max(6, Math.round((round.laps * weekend.pct) / 100));
  const recommendedCompound: Compound = circuit && circuit.abrasion > 0.78 ? 'hard' : circuit && circuit.abrasion > 0.58 ? 'medium' : 'soft';
  const recommendedStops = circuit && circuit.abrasion > 0.8 ? 2 : circuit && circuit.abrasion > 0.55 ? 1 : 0;

  return (
    <div className="weekend-grid">
      <Panel
        title="Risultato delle qualifiche"
        subtitle={`${t(round.eventId)} · ${weekend.pct}% di distanza`}
        accent={team?.color}
      >
        <table className="table qualifying-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Pilota</th>
              <th>Squadra</th>
              <th className="num">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {qualifying?.order.map((row) => {
              const driver = save.world.drivers[row.driverId];
              const teamOfDriver = driver?.teamId ? save.world.teams[driver.teamId] : null;
              const isPlayer = playerIds.includes(row.driverId);
              return (
                <tr key={row.driverId} className={isPlayer ? 'is-me' : ''}>
                  <td>
                    <PositionBadge position={row.position} />
                  </td>
                  <td className="strong">{driverName(save.world, row.driverId)}</td>
                  <td>
                    <div className="table-name">
                      <TeamDot team={teamOfDriver ?? undefined} />
                      <span>{teamOfDriver ? t(teamOfDriver.nameId) : '—'}</span>
                    </div>
                  </td>
                  <td className="num mono">{formatLap(row.time)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="grid-legend">
          {playerIds.map((id) => {
            const row = qualifying?.order.find((entry) => entry.driverId === id);
            return (
              <Badge key={id} tone="info">
                {driverName(save.world, id)} parte P{row?.position ?? '—'}
              </Badge>
            );
          })}
        </div>
      </Panel>

      <div className="stack">
        {circuit && (
          <Panel
            title="Prove libere"
            subtitle={`${practiceLaps} giri di riferimento · dati rilevati sul circuito`}
            actions={<Badge tone="info">FP</Badge>}
          >
            <div className="practice-stats">
              <div>
                <span className="muted small">Giro di riferimento</span>
                <strong>{formatLap(circuit.baseLap)}</strong>
              </div>
              <div>
                <span className="muted small">Degrado gomme</span>
                <strong>{Math.round(circuit.abrasion * 100)}%</strong>
                <Bar value={circuit.abrasion * 100} color="var(--warn)" height={4} />
              </div>
              <div>
                <span className="muted small">Sorpassi</span>
                <strong>{Math.round(circuit.overtaking * 100)}%</strong>
                <Bar value={circuit.overtaking * 100} color="var(--accent-2)" height={4} />
              </div>
              <div>
                <span className="muted small">Pioggia</span>
                <strong>{Math.round(circuit.rainChance * 100)}%</strong>
              </div>
              <div>
                <span className="muted small">Pit lane</span>
                <strong>{circuit.pitLoss}s</strong>
              </div>
            </div>
            <div className="practice-plan">
              <span>
                Consigliato: <strong>{COMPOUND_OPTIONS.find((option) => option.value === recommendedCompound)?.label}</strong> ·{' '}
                <strong>{recommendedStops}</strong> sost{recommendedStops === 1 ? 'a' : 'e'} ·{' '}
                {circuit.overtaking > 0.65 ? 'approccio aggressivo' : 'gestione delle gomme'}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  update({
                    compound: recommendedCompound,
                    secondCompound: recommendedCompound === 'hard' ? 'medium' : 'soft',
                    stops: recommendedStops,
                    fuelMargin: 1.5,
                    aggression: circuit.overtaking > 0.65 ? 'aggressive' : 'balanced',
                  })
                }
              >
                Applica setup consigliato
              </button>
            </div>
          </Panel>
        )}

        <Panel title="Strategia di gara" subtitle="Le scelte valgono per tutta la squadra">
          <div className="setup-form">
            <Field label="Gomma di partenza">
              <div className="tyre-select">
                {COMPOUND_OPTIONS.filter((option) => ['soft', 'medium', 'hard'].includes(option.value)).map((option) => (
                  <button
                    key={option.value}
                    className={`tyre-choice ${setup.compound === option.value ? 'is-active' : ''}`}
                    onClick={() => update({ compound: option.value })}
                  >
                    <span className="tyre-dot" style={{ background: COMPOUND_COLOR[option.value] }} />
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Numero di soste programmate" hint="Puoi sempre chiamare il pit durante la gara.">
              <div className="segmented">
                {[0, 1, 2, 3].map((stops) => (
                  <button key={stops} className={`seg ${setup.stops === stops ? 'is-active' : ''}`} onClick={() => update({ stops })}>
                    {stops}
                  </button>
                ))}
              </div>
            </Field>

            {setup.stops > 0 && (
              <Field label="Gomma per le soste">
                <div className="tyre-select">
                  {COMPOUND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`tyre-choice ${setup.secondCompound === option.value ? 'is-active' : ''}`}
                      onClick={() => update({ secondCompound: option.value })}
                    >
                      <span className="tyre-dot" style={{ background: COMPOUND_COLOR[option.value] }} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Approccio in pista">
              <div className="segmented">
                {([
                  { id: 'conservative', label: 'Conservativo' },
                  { id: 'balanced', label: 'Bilanciato' },
                  { id: 'aggressive', label: 'Aggressivo' },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    className={`seg ${setup.aggression === option.id ? 'is-active' : ''}`}
                    onClick={() => update({ aggression: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Mappa carburante" hint="Risparmiare peso aiuta il passo ma richiede gestione.">
              <div className="segmented">
                {([
                  { id: -1, label: 'Risparmio' },
                  { id: 0, label: 'Normale' },
                  { id: 1, label: 'Prestazione' },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    className={`seg ${setup.fuelMode === option.id ? 'is-active' : ''}`}
                    onClick={() => update({ fuelMode: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={`Margine carburante: ${setup.fuelMargin.toFixed(1)}%`} hint="Più margine significa più peso e un giro leggermente più lento.">
              <input
                className="range"
                type="range"
                min={0.5}
                max={5}
                step={0.5}
                value={setup.fuelMargin}
                onChange={(e) => update({ fuelMargin: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Piano gara">
          <div className="stats-grid three">
            <Stat label="Giri previsti" value={Math.max(6, Math.round((round.laps * weekend.pct) / 100))} />
            <Stat label="Soste" value={setup.stops} />
            <Stat label="Mescola" value={COMPOUND_OPTIONS.find((o) => o.value === setup.compound)?.label ?? setup.compound} />
          </div>
          <p className="muted small">
            In caso di pioggia potrai montare intermedie o bagnate ai box. La Safety Car riduce il tempo perso ai box.
          </p>
          <div className="form-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onUpdate(startRace(save), true)}>
              Scendi in pista
            </button>
            <button className="btn btn-ghost" onClick={() => onUpdate({ ...save, weekend: null, phase: 'season' }, true)}>
              Torna al paddock
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live race
// ---------------------------------------------------------------------------

function LiveRace({ save, settings, onUpdate }: { save: SaveGame; settings: GlobalSettings; onUpdate: Updater }) {
  const race = save.weekend?.race;
  const team = playerTeamOf(save);
  const [playing, setPlaying] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [pitCompound, setPitCompound] = useState<Compound>('medium');
  const saveRef = useRef(save);
  saveRef.current = save;

  const playerIds = race?.playerDriverIds ?? [];
  const activeDriver = selectedDriver && playerIds.includes(selectedDriver) ? selectedDriver : playerIds[0] ?? '';

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const current = saveRef.current;
      if (!current.weekend?.race || current.weekend.race.finished) {
        setPlaying(false);
        return;
      }
      onUpdate(simulateOneLap(current), false);
    }, settings.simSpeed);
    return () => clearInterval(timer);
  }, [playing, settings.simSpeed, onUpdate]);

  useEffect(() => {
    if (race?.finished) setPlaying(false);
  }, [race?.finished]);

  if (!race) return <Empty title="Gara non disponibile" />;
  const circuit = { id: race.circuitId };
  const order = raceOrder(race);
  const leader = order.find((car) => car.status !== 'retired');
  const activeCar = race.cars.find((car) => car.driverId === activeDriver);

  return (
    <div className="live-race">
      <div className="race-status-bar">
        <div className="race-status-main">
          <span className="race-circuit">{t(`circuit.${circuit.id}`)}</span>
          <span className="race-lap">
            Giro <strong>{Math.min(race.lap + 1, race.lapsTotal)}</strong> / {race.lapsTotal}
          </span>
          <span className="race-progress" aria-hidden>
            <Bar value={(race.lap / Math.max(1, race.lapsTotal)) * 100} color="var(--accent)" height={4} />
          </span>
          <FlagTag flag={race.flag} />
          <Badge tone={race.wetness > 0.3 ? 'info' : 'muted'}>{weatherLabel(race.wetness)}</Badge>
          <span className="muted small">{race.temperature}°C · Safety Car: {race.safetyCars}</span>
        </div>
        <div className="race-status-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onUpdate(simulateOneLap(save), false)} disabled={race.finished}>
            Giro successivo
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPlaying((value) => !value)}
            disabled={race.finished}
          >
            {playing ? '⏸ Pausa' : '▶ Auto'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onUpdate(simulateRaceToEnd(save), true)}
            disabled={race.finished}
          >
            Simula fino alla fine
          </button>
        </div>
      </div>

      <div className="live-grid">
        <div className="live-main">
          <Panel title="Classifica in pista" subtitle={`${race.cars.filter((c) => c.status !== 'retired').length} vetture in gara`}>
            <div className="live-table-wrap">
              <table className="table live-table">
                <thead>
                  <tr>
                    <th>P</th>
                    <th>Δ</th>
                    <th>Pilota</th>
                    <th>Squadra</th>
                    <th className="num">Distacco</th>
                    <th className="num">Ultimo</th>
                    <th>Gomme</th>
                    <th className="num">Soste</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {order.map((car, index) => {
                    const driver = save.world.drivers[car.driverId];
                    const team = save.world.teams[car.teamId];
                    const gap = leader && car.status !== 'retired' ? Math.max(0, car.totalTime + car.penalty - (leader.totalTime + leader.penalty)) : 0;
                    const isPlayer = playerIds.includes(car.driverId);
                    const delta = car.grid - (index + 1);
                    return (
                      <tr key={car.driverId} className={isPlayer ? 'is-me' : ''}>
                        <td>
                          <PositionBadge position={index + 1} />
                        </td>
                        <td className="num">
                          <span className={`delta ${delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : ''}`}>
                            {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '–'}
                          </span>
                        </td>
                        <td>
                          <div className="table-name">
                            <span className="driver-stripe" style={{ background: team?.color }} />
                            <span className="strong">{driver ? driverName(save.world, car.driverId) : car.driverId}</span>
                            {isPlayer && <Badge tone="info">Tu</Badge>}
                          </div>
                        </td>
                        <td className="muted">{team ? t(team.shortId) : '—'}</td>
                        <td className="num mono">{index === 0 ? 'Leader' : car.status === 'retired' ? '—' : formatGap(gap)}</td>
                        <td className="num mono">{car.lastLap ? formatLap(car.lastLap) : '—'}</td>
                        <td>
                          <TyrePill compound={car.compound} life={car.tyreLife} />
                        </td>
                        <td className="num">{car.pitStops}</td>
                        <td>
                          {car.status === 'retired' ? (
                            <Badge tone="bad">Ritirato</Badge>
                          ) : car.status === 'finished' ? (
                            <Badge tone="good">Traguardo</Badge>
                          ) : (
                            <span className="muted small">In pista</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Radio e cronaca" subtitle="Gli eventi del giro">
            <ul className="event-feed">
              {race.events
                .slice(-12)
                .reverse()
                .map((event, index) => (
                  <li key={`${event.lap}-${event.code}-${index}`}>
                    <span className="event-lap">G{event.lap}</span>
                    <span>{describeEvent(event, (id) => driverName(save.world, id))}</span>
                  </li>
                ))}
              {race.events.length === 0 && <li className="muted">La gara non è ancora iniziata.</li>}
            </ul>
          </Panel>
        </div>

        <aside className="live-side">
          <Panel title="La tua vettura" subtitle={team ? teamLabel(save.world, team.id) : ''}>
            {playerIds.length > 1 && (
              <div className="segmented small driver-tabs">
                {playerIds.map((id) => (
                  <button key={id} className={`seg ${id === activeDriver ? 'is-active' : ''}`} onClick={() => setSelectedDriver(id)}>
                    {driverName(save.world, id)}
                  </button>
                ))}
              </div>
            )}
            {activeCar ? <CarTelemetry car={activeCar} race={race} /> : <Empty title="Vettura non trovata" />}
          </Panel>

          {activeCar && activeCar.status === 'running' && (
            <Panel title="Ordini di scuderia" subtitle="Le decisioni si applicano subito">
              <div className="race-controls">
                <div className="control-group">
                  <span className="control-label">Spinta</span>
                  <div className="segmented small">
                    <button className={`seg ${activeCar.push === -1 ? 'is-active' : ''}`} onClick={() => onUpdate(withRace(save, (r) => setCarPush(r, activeCar.driverId, -1)), false)}>
                      Risparmia
                    </button>
                    <button className={`seg ${activeCar.push === 0 ? 'is-active' : ''}`} onClick={() => onUpdate(withRace(save, (r) => setCarPush(r, activeCar.driverId, 0)), false)}>
                      Normale
                    </button>
                    <button className={`seg ${activeCar.push === 1 ? 'is-active' : ''}`} onClick={() => onUpdate(withRace(save, (r) => setCarPush(r, activeCar.driverId, 1)), false)}>
                      Spingi
                    </button>
                  </div>
                </div>
                <div className="control-group">
                  <span className="control-label">Carburante</span>
                  <div className="segmented small">
                    <button className={`seg ${activeCar.fuelMode === -1 ? 'is-active' : ''}`} onClick={() => onUpdate(withRace(save, (r) => setCarFuel(r, activeCar.driverId, -1)), false)}>
                      Risparmia
                    </button>
                    <button className={`seg ${activeCar.fuelMode === 0 ? 'is-active' : ''}`} onClick={() => onUpdate(withRace(save, (r) => setCarFuel(r, activeCar.driverId, 0)), false)}>
                      Normale
                    </button>
                    <button className={`seg ${activeCar.fuelMode === 1 ? 'is-active' : ''}`} onClick={() => onUpdate(withRace(save, (r) => setCarFuel(r, activeCar.driverId, 1)), false)}>
                      Prestazione
                    </button>
                  </div>
                </div>
                <div className="control-group">
                  <span className="control-label">Pit stop immediato</span>
                  <div className="pit-row">
                    <select className="input input-sm" value={pitCompound} onChange={(e) => setPitCompound(e.target.value as Compound)}>
                      {COMPOUND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const pitted = pitPlayerCar(save, activeCar.driverId, pitCompound);
                        onUpdate(simulateOneLap(pitted), false);
                      }}
                    >
                      Ai box
                    </button>
                  </div>
                  <span className="muted small">La sosta avviene subito e il giro viene simulato.</span>
                </div>
                <div className="control-group">
                  <span className="control-label">Prossima sosta programmata</span>
                  <div className="pit-row">
                    <input
                      className="input input-sm"
                      type="number"
                      min={race.lap + 1}
                      max={race.lapsTotal}
                      value={activeCar.plannedStops[0]?.lap ?? ''}
                      placeholder="giro"
                      onChange={(e) => {
                        const lap = Number(e.target.value);
                        if (!lap) return;
                        onUpdate(withRace(save, (r) => addPlannedStop(r, activeCar.driverId, lap, pitCompound)), false);
                      }}
                    />
                    <span className="muted small">Giro di sosta</span>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Meteo" subtitle="Le condizioni cambiano durante la gara">
            <div className="weather-panel">
              <span className={`weather-orb ${race.wetness > 0.3 ? 'is-wet' : ''}`}>{race.wetness > 0.3 ? '🌧' : '☀'}</span>
              <div>
                <strong>{weatherLabel(race.wetness)}</strong>
                <span className="muted small">
                  Pista {Math.round(race.wetness * 100)}% bagnata · {race.temperature}°C
                </span>
                <Bar value={race.wetness * 100} color="#2f6bff" />
              </div>
            </div>
            <div className="stats-grid three">
              <Stat label="Giro veloce" value={race.fastestLap ? formatLap(race.fastestLap.time) : '—'} small />
              <Stat label="Safety Car" value={race.safetyCars} />
              <Stat label="Ritirati" value={race.cars.filter((c) => c.status === 'retired').length} />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function CarTelemetry({ car, race }: { car: CarState; race: RaceState }) {
  const fuelPct = Math.max(0, Math.min(100, (car.fuelLaps / Math.max(1, race.lapsTotal)) * 100));
  return (
    <div className="telemetry">
      <div className="telemetry-top">
        <TyrePill compound={car.compound} life={car.tyreLife} />
        <div className="telemetry-gap">
          <span className="muted small">Posizione</span>
          <strong>P{car.position}</strong>
        </div>
        <div className="telemetry-gap">
          <span className="muted small">Soste</span>
          <strong>{car.pitStops}</strong>
        </div>
      </div>
      <div className="telemetry-row">
        <span>Gomme</span>
        <Bar value={car.tyreLife} color={car.tyreLife < 25 ? 'var(--bad)' : 'var(--accent-2)'} />
        <strong>{Math.max(0, Math.round(car.tyreLife))}%</strong>
      </div>
      <div className="telemetry-row">
        <span>Carburante</span>
        <Bar value={fuelPct} color={fuelPct < 10 ? 'var(--bad)' : 'var(--gold)'} />
        <strong>{car.fuelLaps.toFixed(1)} giri</strong>
      </div>
      <div className="telemetry-row">
        <span>Danni</span>
        <Bar value={Math.min(100, car.damage)} color="var(--accent)" />
        <strong>{Math.round(car.damage)}</strong>
      </div>
      <div className="telemetry-stats">
        <span>Ultimo giro <strong>{car.lastLap ? formatLap(car.lastLap) : '—'}</strong></span>
        <span>Migliore <strong>{car.bestLap ? formatLap(car.bestLap) : '—'}</strong></span>
      </div>
      {car.plannedStops.length > 0 && (
        <p className="muted small">
          Piano: {car.plannedStops.map((stop) => `G${stop.lap} ${stop.compound}`).join(' · ')}
        </p>
      )}
      {car.status === 'retired' && <Badge tone="bad">Ritirato</Badge>}
    </div>
  );
}

function withRace(save: SaveGame, mutate: (race: RaceState) => void): SaveGame {
  const next = JSON.parse(JSON.stringify(save)) as SaveGame;
  if (next.weekend?.race) mutate(next.weekend.race);
  return next;
}

function setCarPush(race: RaceState, driverId: string, push: -1 | 0 | 1): void {
  const car = race.cars.find((c) => c.driverId === driverId);
  if (car) car.push = push;
}

function setCarFuel(race: RaceState, driverId: string, mode: -1 | 0 | 1): void {
  const car = race.cars.find((c) => c.driverId === driverId);
  if (car) car.fuelMode = mode;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function RaceClassification({ save, onUpdate }: { save: SaveGame; onUpdate: Updater }) {
  const weekend = save.weekend;
  const category = save.player.category;
  const series = category ? save.world.series[category] : null;
  if (!weekend || !series) return <Empty title="Gara non disponibile" />;
  const round = series.calendar[weekend.roundIndex];
  const result =
    weekend.result ??
    (weekend.race?.finished ? buildRaceResult(save.world, weekend.race) : undefined) ??
    series.results.find((entry) => entry.roundIndex === weekend.roundIndex);
  const playerIds = playerDriverIdsOf(save);
  const rows: RaceResultRow[] = result?.rows ?? [];
  const fastest = result?.fastestLapDriverId;
  const pole = result?.poleDriverId;

  return (
    <div className="stack">
      <Panel
        title={`Classifica finale · ${t(round.eventId)}`}
        subtitle={`${t(`circuit.${round.circuitId}`)} · ${weatherLabelFromString(result?.weather)} · ${weekend.pct}% di distanza`}
        accent="var(--gold)"
        actions={
          <div className="inline-actions">
            {pole && <Badge tone="info">Pole: {driverName(save.world, pole)}</Badge>}
            {fastest && <Badge tone="good">Giro veloce: {driverName(save.world, fastest)}</Badge>}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty title="Risultato non disponibile" />
        ) : (
          <table className="table result-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Pilota</th>
                <th>Squadra</th>
                <th className="num">Griglia</th>
                <th className="num">Distacco</th>
                <th className="num">Punti</th>
                <th className="num">Soste</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isPlayer = playerIds.includes(row.driverId);
                const team = save.world.teams[row.teamId];
                return (
                  <tr key={row.driverId} className={isPlayer ? 'is-me' : ''}>
                    <td>
                      <PositionBadge position={row.position} />
                    </td>
                    <td>
                      <div className="table-name">
                        <TeamDot team={team} />
                        <span className="strong">{driverName(save.world, row.driverId)}</span>
                        {row.fastestLap && <Badge tone="good">GV</Badge>}
                        {row.driverId === pole && <Badge tone="info">Pole</Badge>}
                        {isPlayer && <Badge tone="info">Tu</Badge>}
                      </div>
                    </td>
                    <td className="muted">{team ? t(team.nameId) : '—'}</td>
                    <td className="num">{row.grid}</td>
                    <td className="num mono">{row.status === 'retired' ? '—' : row.position === 1 ? '—' : formatGap(row.gap)}</td>
                    <td className="num strong">{row.points}</td>
                    <td className="num">{row.pitStops}</td>
                    <td>
                      {row.status === 'retired' ? (
                        <Badge tone="bad">{retireReason(row.reasonId)}</Badge>
                      ) : row.status === 'lapped' ? (
                        <Badge tone="muted">Doppiato</Badge>
                      ) : (
                        <span className="muted small">Classificato</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="two-col">
        <Panel title="Momenti chiave">
          {!result || result.keyEvents.length === 0 ? (
            <p className="muted small">Una gara senza grandi scossoni.</p>
          ) : (
            <ul className="event-feed">
              {result.keyEvents.map((event, index) => (
                <li key={index}>
                  <span className="event-lap">G{event.lap}</span>
                  <span>{describeEvent(event, (id) => driverName(save.world, id))}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Archivia il weekend">
          <p className="muted small">
            Confermando, i risultati entrano nelle classifiche, i premi vengono accreditati e il mondo avanza. Il
            salvataggio automatico scatta subito dopo.
          </p>
          <div className="form-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onUpdate(finishWeekend(save), true)}>
              Conferma e torna al paddock
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function weatherLabelFromString(label: string | undefined): string {
  return label ?? 'Asciutto';
}

function retireReason(reasonId: string | undefined): string {
  switch (reasonId) {
    case 'dnf-mechanical':
      return 'Guasto';
    case 'dnf-crash':
      return 'Incidente';
    case 'dnf-fuel':
      return 'Carburante';
    default:
      return 'Ritirato';
  }
}

