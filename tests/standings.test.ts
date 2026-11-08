import { describe, expect, it } from 'vitest';
import { computeStandings, createWorld } from '../src/game/engine/world';
import { createRace, defaultSetup, finalizeRace, runQualifying, simulateRemaining } from '../src/game/engine/race';
import type { Category } from '../src/game/types';

function playRound(world: ReturnType<typeof createWorld>, category: Category, roundIndex: number, seed: number) {
  const qualifying = runQualifying(world, category, roundIndex, seed);
  world.series[category].qualifying[roundIndex] = qualifying;
  const race = createRace(world, category, roundIndex, {
    pct: 25,
    setup: defaultSetup(category, world.series[category].calendar[roundIndex].laps),
    playerTeamId: null,
    playerDriverIds: [],
    seed,
    qualifying,
  });
  simulateRemaining(race, world);
  return finalizeRace(world, race);
}

describe('classifiche', () => {
  it('ricalcola i punti dai risultati e bilancia piloti e squadre', () => {
    const world = createWorld(2026, 88);
    for (let round = 0; round < 3; round++) {
      playRound(world, 'F1', round, 1000 + round);
    }
    const { drivers, teams } = computeStandings(world, 'F1');
    expect(drivers.length).toBe(20);
    expect(teams.length).toBe(10);

    const totalFromRows = world.series.F1.results.reduce(
      (sum, result) => sum + result.rows.reduce((inner, row) => inner + row.points, 0),
      0
    );
    const totalFromDrivers = drivers.reduce((sum, row) => sum + row.points, 0);
    const totalFromTeams = teams.reduce((sum, row) => sum + row.points, 0);
    expect(totalFromDrivers).toBe(totalFromRows);
    expect(totalFromTeams).toBe(totalFromRows);

    expect(drivers[0].points).toBeGreaterThanOrEqual(drivers[1].points);
    expect(drivers.reduce((sum, row) => sum + row.wins, 0)).toBe(3);
    expect(drivers.reduce((sum, row) => sum + row.races, 0)).toBe(60);
    expect(teams.every((row) => row.races === 6)).toBe(true);
  });

  it('mantiene separate le classifiche delle tre categorie', () => {
    const world = createWorld(2026, 11);
    playRound(world, 'F1', 0, 7);
    playRound(world, 'F2', 0, 8);
    expect(computeStandings(world, 'F1').drivers.length).toBe(20);
    expect(computeStandings(world, 'F2').drivers.length).toBe(22);
    expect(computeStandings(world, 'F3').drivers.length).toBe(22);
    expect(world.series.F2.roundIndex).toBe(1);
    expect(world.series.F3.roundIndex).toBe(0);
  });
});
