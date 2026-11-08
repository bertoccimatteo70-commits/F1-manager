import { describe, expect, it } from 'vitest';
import {
  acceptOffer,
  beginWeekend,
  createDriverCareer,
  createTeamCareer,
  finishWeekend,
  hireStaff,
  quickSimulateWeekend,
  releaseDriverFromTeam,
  signFreeAgent,
  simulateRaceToEnd,
  simulateOneLap,
  spendSkillPoint,
  startDevelopment,
  startRace,
  startTeamNextSeason,
  updateWeekendSetup,
} from '../src/game/engine/career';
import { computeStandings, overallRating, suggestedSalary } from '../src/game/engine/world';

function driverCareer() {
  return createDriverCareer({
    id: 'player',
    first: 'Mario',
    last: 'Rossi',
    nat: 'IT',
    age: 19,
    number: 27,
    helmet: '#e10600',
    category: 'F3',
    difficulty: 'normal',
    seed: 4321,
  });
}

describe('carriera pilota', () => {
  it('crea pilota, contratto e squadra coerenti', () => {
    const save = driverCareer();
    const driver = save.world.drivers.player;
    expect(driver).toBeDefined();
    expect(driver.teamId).toBeTruthy();
    expect(driver.category).toBe('F3');
    expect(save.world.teams[driver.teamId as string].driverIds).toContain('player');
    expect(save.world.series.F3.driverIds).toContain('player');
    expect(save.player.kind).toBe('driver');
    expect(save.phase).toBe('season');
    expect(driver.devPoints).toBeGreaterThan(0);
  });

  it('percorre un weekend completo, aggiorna soldi, esperienza e risultato', () => {
    let save = driverCareer();
    save = beginWeekend(save, 25);
    expect(save.phase).toBe('weekend');
    expect(save.weekend?.qualifying?.order.length).toBe(22);
    save = updateWeekendSetup(save, { stops: 1, compound: 'soft', secondCompound: 'medium' });
    save = startRace(save);
    expect(save.weekend?.race).toBeDefined();
    save = simulateOneLap(save);
    expect(save.weekend?.race?.lap).toBe(1);
    save = simulateRaceToEnd(save);
    expect(save.weekend?.race?.finished).toBe(true);
    // The classification is available before the weekend is confirmed...
    expect(save.weekend?.result?.rows.length).toBe(22);
    expect(save.weekend?.result?.rows[0].position).toBe(1);
    // ...but it only enters the championship on confirmation.
    expect(save.world.series.F3.results.length).toBe(0);
    const moneyBefore = save.player.kind === 'driver' ? save.player.money : 0;
    save = finishWeekend(save);
    expect(save.phase).toBe('season');
    expect(save.world.series.F3.results.length).toBe(1);
    expect(save.world.series.F3.roundIndex).toBe(1);
    expect(save.world.drivers.player.xp + save.world.drivers.player.devPoints).toBeGreaterThan(0);
    if (save.player.kind === 'driver') {
      expect(save.player.money).toBeGreaterThanOrEqual(moneyBefore);
    }
    const standings = computeStandings(save.world, 'F3');
    expect(standings.drivers.some((row) => row.id === 'player')).toBe(true);
  });

  it('chiude la stagione, genera offerte e apre la stagione successiva', () => {
    let save = driverCareer();
    const rounds = save.world.series.F3.calendar.length;
    for (let round = 0; round < rounds; round++) {
      save = quickSimulateWeekend(save, 25);
      if (save.phase === 'offseason') break;
    }
    expect(save.phase).toBe('offseason');
    expect(save.offers.length).toBeGreaterThan(0);
    expect(save.player.kind === 'driver' && save.player.seasonHistory.length).toBe(1);
    const offer = save.offers[0];
    save = acceptOffer(save, offer.id);
    expect(save.phase).toBe('season');
    expect(save.world.season).toBe(2027);
    expect(save.world.series.F3.results.length).toBe(0);
    expect(save.world.series.F3.roundIndex).toBe(0);
    const driver = save.world.drivers.player;
    expect(driver.teamId).toBe(offer.teamId);
    expect(driver.category).toBe(offer.category);
  });

  it('spende i punti abilità senza superare il limite', () => {
    const save = driverCareer();
    const before = save.world.drivers.player.skills.pace;
    const after = spendSkillPoint(save, 'pace');
    expect(after.world.drivers.player.skills.pace).toBe(Math.min(99, before + 1));
  });

  it('mantiene i nomi personalizzati nelle carriere già avviate', () => {
    const save = driverCareer();
    expect(save.world.drivers.player.firstId).toBe('Mario');
  });
});

describe('carriera scuderia', () => {
  it('fonda la squadra con piloti, staff e budget', () => {
    const save = createTeamCareer({
      id: 'player-team',
      name: 'Scuderia Aurora',
      short: 'AUR',
      color: '#123456',
      accent: '#ffffff',
      logo: 'star',
      category: 'F3',
      budgetLevel: 'medium',
      seed: 2026,
    });
    const team = save.world.teams[save.player.kind === 'team' ? save.player.teamId : ''];
    expect(team.nameId).toBe('Scuderia Aurora');
    expect(team.driverIds.filter(Boolean).length).toBe(2);
    expect(team.staff.length).toBe(2);
    expect(team.budget).toBeGreaterThan(0);
    expect(save.world.series.F3.teamIds).toContain(team.id);
  });

  it('gestisce ingaggi, sviluppo e un weekend di gara', () => {
    let save = createTeamCareer({
      id: 'player-team',
      name: 'Aurora Racing',
      short: 'AUR',
      color: '#00aa88',
      accent: '#ffffff',
      logo: 'bolt',
      category: 'F3',
      budgetLevel: 'high',
      seed: 606,
    });
    if (save.player.kind !== 'team') throw new Error('modalità errata');
    const teamId = save.player.teamId;
    const team = save.world.teams[teamId];
    const firstDriver = team.driverIds[0] as string;
    save = releaseDriverFromTeam(save, firstDriver);
    expect(save.world.teams[teamId].driverIds[0]).toBeNull();
    const freeAgent = Object.values(save.world.drivers)
      .filter((driver) => !driver.retired && driver.teamId === null)
      .sort((a, b) => overallRating(b) - overallRating(a))[0];
    const salary = suggestedSalary(freeAgent.reputation, 'F3', save.world.teams[teamId].reputation);
    save = signFreeAgent(save, freeAgent.id, salary, 1);
    expect(save.world.teams[teamId].driverIds).toContain(freeAgent.id);

    const budgetBefore = save.world.teams[teamId].budget;
    save = startDevelopment(save, 'aero', 'small', false);
    expect(save.world.teams[teamId].budget).toBeLessThan(budgetBefore);
    expect(save.world.teams[teamId].projects.length).toBe(1);

    const candidate = save.player.kind === 'team' ? save.player.staffPool[0] : null;
    if (candidate) {
      save = hireStaff(save, candidate.id);
      expect(save.world.teams[teamId].staff.length).toBeGreaterThanOrEqual(3);
    }

    save = quickSimulateWeekend(save, 25);
    expect(save.world.series.F3.results.length).toBe(1);
    expect(Number.isFinite(save.world.teams[teamId].budget)).toBe(true);
    if (save.player.kind === 'team') {
      expect(save.player.lastRoundIncome).not.toBe(0);
    }
  });

  it('porta la scuderia alla stagione successiva', () => {
    let save = createTeamCareer({
      id: 'player-team',
      name: 'Aurora Racing',
      short: 'AUR',
      color: '#00aa88',
      accent: '#ffffff',
      logo: 'bolt',
      category: 'F3',
      budgetLevel: 'high',
      seed: 707,
    });
    const rounds = save.world.series.F3.calendar.length;
    for (let round = 0; round < rounds; round++) {
      save = quickSimulateWeekend(save, 25);
    }
    expect(save.phase).toBe('offseason');
    save = startTeamNextSeason(save);
    expect(save.phase).toBe('season');
    expect(save.world.season).toBe(2027);
    expect(save.world.series.F3.results.length).toBe(0);
    if (save.player.kind === 'team') {
      const team = save.world.teams[save.player.teamId];
      expect(team.driverIds.filter(Boolean).length).toBe(2);
    }
  });
});
