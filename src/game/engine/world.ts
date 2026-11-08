import {
  CATEGORY_CALENDARS,
  CIRCUITS,
  DRIVERS,
  TEAMS,
  categoryTeams,
} from '../data/catalog';
import type {
  CarSpec,
  Category,
  Circuit,
  Contract,
  Driver,
  Round,
  Series,
  Team,
  World,
} from '../types';
import { POLE_POINTS } from './format';

export const CATEGORY_BUDGET: Record<Category, number> = {
  F1: 120_000_000,
  F2: 12_000_000,
  F3: 4_000_000,
};

export const CATEGORY_SALARY: Record<Category, number> = {
  F1: 6_000_000,
  F2: 650_000,
  F3: 180_000,
};

export const CATEGORY_RUNNING_COST: Record<Category, number> = {
  F1: 620_000,
  F2: 78_000,
  F3: 26_000,
};

export const CATEGORY_PRIZE_POOL: Record<Category, number> = {
  F1: 62_000_000,
  F2: 6_500_000,
  F3: 2_200_000,
};

export const CATEGORY_SPONSOR_BASE: Record<Category, number> = {
  F1: 420_000,
  F2: 55_000,
  F3: 16_000,
};

export const CIRCUIT_BY_ID: Record<string, Circuit> = Object.fromEntries(CIRCUITS.map((c) => [c.id, c]));

export function getCircuit(id: string): Circuit {
  const circuit = CIRCUIT_BY_ID[id];
  if (!circuit) throw new Error(`Circuit ${id} not found`);
  return circuit;
}

export function buildCalendar(category: Category): Round[] {
  return CATEGORY_CALENDARS[category].map((circuitId, index) => ({
    index,
    circuitId,
    eventId: `comp.gp.${circuitId}`,
    laps: getCircuit(circuitId).fullLaps,
  }));
}

export function suggestedSalary(reputation: number, category: Category, teamReputation: number): number {
  const base = CATEGORY_SALARY[category];
  const factor = 0.45 + (reputation / 100) * 1.7 + (teamReputation / 100) * 0.45;
  return Math.round((base * factor) / 100_000) * 100_000;
}

function makeContract(season: number, driver: Driver, team: Team, reputation: number): Contract {
  const salary = suggestedSalary(reputation, team.category, team.reputation);
  return {
    id: `ct-${driver.id}-${team.id}`,
    driverId: driver.id,
    teamId: team.id,
    salary,
    seasons: 1 + (reputation > 70 ? 1 : 0),
    startSeason: season,
    endSeason: season + (reputation > 70 ? 1 : 0),
    winBonus: Math.round(salary * 0.06),
    podiumBonus: Math.round(salary * 0.025),
    titleBonus: Math.round(salary * 0.4),
    releaseFee: Math.round(salary * 0.35),
    objective: categoryObjective(team.category, reputation),
    role: 'race',
  };
}

export function categoryObjective(category: Category, reputation: number): string {
  if (category === 'F1') return reputation > 80 ? 'Lotta per il titolo' : reputation > 62 ? 'Chiudi tra i primi 5' : 'Porta punti a casa';
  if (category === 'F2') return reputation > 70 ? 'Vinci il campionato' : 'Chiudi tra i primi 8';
  return reputation > 62 ? 'Podio in campionato' : 'Mostra progressi e chiudi tra i primi 10';
}

export function createWorld(season: number, seed: number): World {
  const drivers: Record<string, Driver> = {};
  const teams: Record<string, Team> = {};
  const contracts: Record<string, Contract> = {};

  for (const def of TEAMS) {
    teams[def.id] = {
      id: def.id,
      nameId: `team.${def.id}.name`,
      shortId: `team.${def.id}.short`,
      color: def.color,
      accent: def.accent,
      category: def.category,
      engineId: def.engineId,
      car: { ...def.car },
      sponsorIds: [...def.sponsorIds],
      sponsorDeals: def.sponsorIds.map((sponsorId, i) => ({
        sponsorId,
        perRace: Math.round((CATEGORY_SPONSOR_BASE[def.category] * (1.25 - i * 0.2)) / 1000) * 1000,
        objective: i === 0 ? 'Podio in campionato' : 'Punti in stagione',
        bonus: Math.round(CATEGORY_SPONSOR_BASE[def.category] * 6),
      })),
      budget: def.budget,
      driverIds: [null, null],
      staff: [],
      logo: def.logo,
      isPlayer: false,
      projects: [],
      history: [],
      loans: [],
      reputation: def.reputation,
    };
  }

  for (const def of DRIVERS) {
    const teamId = def.teamId;
    const team = teamId ? teams[teamId] : null;
    const driver: Driver = {
      id: def.id,
      firstId: `drv.${def.id}.first`,
      lastId: `drv.${def.id}.last`,
      nat: def.nat,
      age: def.age,
      number: def.number,
      skills: {
        pace: def.skills[0],
        tyre: def.skills[1],
        fuel: def.skills[2],
        overtaking: def.skills[3],
        defending: def.skills[4],
        consistency: def.skills[5],
        wet: def.skills[6],
        qualifying: def.skills[7],
      },
      potential: def.potential,
      xp: 0,
      devPoints: 0,
      reputation: def.reputation,
      category: team ? team.category : null,
      teamId: teamId,
      retired: false,
      form: 0,
      morale: 65,
      isPlayer: false,
      helmet: team ? team.color : '#888888',
    };
    drivers[driver.id] = driver;
    if (team) {
      const contract = makeContract(season, driver, team, def.reputation);
      contracts[contract.id] = contract;
      const slot = team.driverIds[0] === null ? 0 : 1;
      team.driverIds[slot] = driver.id;
    }
  }

  const series: Record<Category, Series> = {
    F1: emptySeries('F1'),
    F2: emptySeries('F2'),
    F3: emptySeries('F3'),
  };
  for (const category of ['F1', 'F2', 'F3'] as Category[]) {
    series[category].teamIds = categoryTeams(category).map((t) => t.id);
    series[category].driverIds = DRIVERS.filter((d) => d.teamId && teams[d.teamId]?.category === category).map((d) => d.id);
    series[category].calendar = buildCalendar(category);
  }

  return {
    season,
    drivers,
    teams,
    contracts,
    series,
  };
}

export function emptySeries(category: Category): Series {
  return {
    category,
    teamIds: [],
    driverIds: [],
    calendar: buildCalendar(category),
    roundIndex: 0,
    results: [],
    qualifying: {},
  };
}

export function cloneWorld(world: World): World {
  return JSON.parse(JSON.stringify(world)) as World;
}

export function carPerformance(car: CarSpec): number {
  return car.aero * 0.27 + car.engine * 0.22 + car.chassis * 0.24 + car.suspension * 0.14 + car.brakes * 0.13;
}

export function overallRating(driver: Driver): number {
  const s = driver.skills;
  return Math.round(
    s.pace * 0.28 + s.tyre * 0.13 + s.fuel * 0.08 + s.overtaking * 0.12 + s.defending * 0.08 + s.consistency * 0.13 + s.wet * 0.07 + s.qualifying * 0.11
  );
}

export interface StandingRow {
  id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  races: number;
  bestFinish: number;
  category: Category;
}

interface Tally {
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  races: number;
  bestFinish: number;
}

function emptyTally(): Tally {
  return { points: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, races: 0, bestFinish: 99 };
}

export function computeStandings(world: World, category: Category): { drivers: StandingRow[]; teams: StandingRow[] } {
  const series = world.series[category];
  const driverMap = new Map<string, Tally>();
  const teamMap = new Map<string, Tally>();
  for (const id of series.driverIds) driverMap.set(id, emptyTally());
  for (const id of series.teamIds) teamMap.set(id, emptyTally());

  for (const result of series.results) {
    for (const row of result.rows) {
      const dt = driverMap.get(row.driverId) ?? emptyTally();
      const tt = teamMap.get(row.teamId) ?? emptyTally();
      dt.races += 1;
      tt.races += 1;
      dt.points += row.points;
      tt.points += row.points;
      if (row.position === 1) {
        dt.wins += 1;
        tt.wins += 1;
      }
      if (row.position <= 3) {
        dt.podiums += 1;
        tt.podiums += 1;
      }
      dt.bestFinish = Math.min(dt.bestFinish, row.position);
      tt.bestFinish = Math.min(tt.bestFinish, row.position);
      if (result.poleDriverId === row.driverId) {
        dt.poles += 1;
      }
      if (result.fastestLapDriverId === row.driverId) {
        dt.fastestLaps += 1;
        tt.fastestLaps += 1;
      }
      driverMap.set(row.driverId, dt);
      teamMap.set(row.teamId, tt);
    }
  }

  const toRows = (map: Map<string, Tally>): StandingRow[] => {
    const rows = [...map.entries()].map(([id, tally]) => ({ id, ...tally, points: tally.points, category }));
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.bestFinish !== a.bestFinish) return a.bestFinish - b.bestFinish;
      return a.id.localeCompare(b.id);
    });
    return rows.map((row, index) => ({ ...row, position: index + 1 }));
  };

  return { drivers: toRows(driverMap), teams: toRows(teamMap) };
}

export function currentRound(world: World, category: Category): Round | null {
  const series = world.series[category];
  return series.calendar[series.roundIndex] ?? null;
}

export function roundsCompleted(world: World, category: Category): number {
  return world.series[category].results.length;
}

export function playerDriverTeam(world: World, driverId: string): Team | null {
  const driver = world.drivers[driverId];
  if (!driver || !driver.teamId) return null;
  return world.teams[driver.teamId] ?? null;
}

export function categoryOf(world: World, teamId: string): Category {
  return world.teams[teamId]?.category ?? 'F3';
}

export function prizeMoneyFor(category: Category, position: number, fieldSize: number): number {
  const pool = CATEGORY_PRIZE_POOL[category];
  const perRound = pool / 20;
  const factor = Math.max(0, (fieldSize - position + 1) / fieldSize);
  return Math.round((perRound * (0.25 + factor)) / 1000) * 1000;
}

export function seasonPrize(category: Category, position: number, fieldSize: number): number {
  const pool = CATEGORY_PRIZE_POOL[category];
  const factor = Math.max(0, (fieldSize - position + 1) / fieldSize);
  return Math.round((pool * (0.15 + factor * 1.1)) / 10_000) * 10_000;
}

export function bestDriverForTeam(world: World, teamId: string): string | null {
  const team = world.teams[teamId];
  if (!team) return null;
  const candidates = Object.values(world.drivers)
    .filter((d) => !d.retired && d.teamId === null)
    .sort((a, b) => overallRating(b) - overallRating(a));
  return candidates[0]?.id ?? null;
}

export function freeDrivers(world: World): Driver[] {
  return Object.values(world.drivers)
    .filter((d) => !d.retired && d.teamId === null)
    .sort((a, b) => overallRating(b) - overallRating(a));
}
