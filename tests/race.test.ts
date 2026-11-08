import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/game/engine/world';
import { createRace, defaultSetup, finalizeRace, runQualifying, simulateRemaining } from '../src/game/engine/race';

function freshWorld() {
  return createWorld(2026, 4242);
}

describe('qualifiche', () => {
  it('produce una griglia completa e ordinata per tempo', () => {
    const world = freshWorld();
    const result = runQualifying(world, 'F1', 0, 1234);
    expect(result.order.length).toBe(20);
    expect(new Set(result.order.map((row) => row.driverId)).size).toBe(20);
    for (let i = 1; i < result.order.length; i++) {
      expect(result.order[i].time).toBeGreaterThanOrEqual(result.order[i - 1].time);
      expect(result.order[i].position).toBe(i + 1);
    }
    expect(result.order.every((row) => row.time > 60 && row.time < 130)).toBe(true);
  });
});

describe('simulazione gara', () => {
  it('simula una gara al 25% con classifica completa e coerente', () => {
    const world = freshWorld();
    const qualifying = runQualifying(world, 'F1', 0, 99);
    world.series.F1.qualifying[0] = qualifying;
    const race = createRace(world, 'F1', 0, {
      pct: 25,
      setup: defaultSetup('F1', 14),
      playerTeamId: 'mclare',
      playerDriverIds: ['nor'],
      seed: 777,
      qualifying,
    });
    expect(race.lapsTotal).toBe(Math.round((58 * 25) / 100));
    expect(race.cars.length).toBe(20);
    simulateRemaining(race, world);
    expect(race.finished).toBe(true);
    expect(race.lap).toBe(race.lapsTotal);

    const result = finalizeRace(world, race);
    expect(result.rows.length).toBe(20);
    expect(new Set(result.rows.map((row) => row.position)).size).toBe(20);
    expect(result.rows[0].points).toBeGreaterThanOrEqual(25);
    expect(world.series.F1.roundIndex).toBe(1);
    expect(world.series.F1.results.length).toBe(1);
    for (const row of result.rows) {
      expect(Number.isFinite(row.totalTime)).toBe(true);
      expect(row.pitStops).toBeGreaterThanOrEqual(0);
      expect(row.points).toBeGreaterThanOrEqual(0);
    }
    const retired = result.rows.filter((row) => row.status === 'retired');
    expect(retired.every((row) => row.points === 0)).toBe(true);
    expect(result.rows.some((row) => row.fastestLap)).toBe(true);
  });

  it('è deterministica con lo stesso seed', () => {
    const build = () => {
      const world = freshWorld();
      const qualifying = runQualifying(world, 'F1', 0, 55);
      world.series.F1.qualifying[0] = qualifying;
      const race = createRace(world, 'F1', 0, {
        pct: 25,
        setup: defaultSetup('F1', 14),
        playerTeamId: null,
        playerDriverIds: [],
        seed: 2024,
        qualifying,
      });
      simulateRemaining(race, world);
      return finalizeRace(world, race);
    };
    const a = build();
    const b = build();
    expect(a.rows.map((row) => row.driverId)).toEqual(b.rows.map((row) => row.driverId));
    expect(a.rows[0].totalTime).toBe(b.rows[0].totalTime);
  });

  it('il piano soste del giocatore viene eseguito', () => {
    const world = freshWorld();
    const qualifying = runQualifying(world, 'F1', 2, 31);
    world.series.F1.qualifying[2] = qualifying;
    const setup = { ...defaultSetup('F1', 12), stops: 2, secondCompound: 'hard' as const };
    const race = createRace(world, 'F1', 2, {
      pct: 25,
      setup,
      playerTeamId: 'ferari',
      playerDriverIds: ['lec', 'ham'],
      seed: 4040,
      qualifying,
    });
    simulateRemaining(race, world);
    const lec = race.cars.find((car) => car.driverId === 'lec');
    expect(lec).toBeDefined();
    expect(lec?.pitStops).toBeGreaterThanOrEqual(1);
    expect(race.cars.every((car) => Number.isFinite(car.totalTime))).toBe(true);
  });
});
