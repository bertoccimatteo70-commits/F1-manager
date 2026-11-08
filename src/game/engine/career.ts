import {
  CATEGORY_CALENDARS,
  CATEGORY_LABEL,
  TEAM_LOGOS,
  categoryTeams,
  teamDefById,
} from '../data/catalog';
import { t } from '../names/registry';
import type {
  Category,
  Compound,
  Contract,
  Driver,
  DriverCareerData,
  Offer,
  PlayerCareer,
  RaceSetup,
  RaceState,
  Round,
  SaveGame,
  SeasonRecord,
  Series,
  SponsorDeal,
  StaffMember,
  StaffRole,
  Team,
  TeamCareerData,
  World,
} from '../types';
import { hashSeed, nextRandom, randInt, randRange, uid } from './rng';
import {
  CATEGORY_BUDGET,
  CATEGORY_PRIZE_POOL,
  CATEGORY_RUNNING_COST,
  CATEGORY_SPONSOR_BASE,
  categoryObjective,
  carPerformance,
  computeStandings,
  createWorld,
  currentRound,
  overallRating,
  prizeMoneyFor,
  seasonPrize,
  suggestedSalary,
} from './world';
import {
  buildRaceResult,
  createRace,
  defaultSetup,
  estimatedTyreLife,
  finalizeRace,
  pitNow,
  runQualifying,
  simulateRemaining,
  stepLap,
} from './race';

export const SAVE_VERSION = 1;

export const SKILL_KEYS = [
  'pace',
  'tyre',
  'fuel',
  'overtaking',
  'defending',
  'consistency',
  'wet',
  'qualifying',
] as const;

export type SkillKey = (typeof SKILL_KEYS)[number];

export const SKILL_LABEL: Record<SkillKey, string> = {
  pace: 'Velocità pura',
  tyre: 'Gestione pneumatici',
  fuel: 'Gestione carburante',
  overtaking: 'Sorpassi',
  defending: 'Difesa',
  consistency: 'Costanza',
  wet: 'Adattamento al meteo',
  qualifying: 'Qualifica',
};

export function cloneSave(save: SaveGame): SaveGame {
  return JSON.parse(JSON.stringify(save)) as SaveGame;
}

function makeSave(id: string, mode: 'driver' | 'team', world: World, player: PlayerCareer, seed: number): SaveGame {
  const save: SaveGame = {
    version: SAVE_VERSION,
    id,
    name: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode,
    world,
    player,
    news: [],
    phase: 'season',
    weekend: null,
    offers: [],
    seed,
  };
  save.name =
    mode === 'driver' && player.kind === 'driver'
      ? `${driverFullName(world, player.driverId)} · ${player.category ? CATEGORY_LABEL[player.category] : 'Mercato'}`
      : `${teamLabel(world, player.kind === 'team' ? player.teamId : '')} · ${player.kind === 'team' ? CATEGORY_LABEL[player.category] : ''}`;
  return save;
}

export function driverFullName(world: World, driverId: string): string {
  const driver = world.drivers[driverId];
  if (!driver) return driverId;
  return `${t(driver.firstId)} ${t(driver.lastId)}`;
}

export function teamLabel(world: World, teamId: string): string {
  const team = world.teams[teamId];
  return team ? t(team.nameId) : teamId;
}

export function teamShortLabel(world: World, teamId: string): string {
  const team = world.teams[teamId];
  return team ? t(team.shortId) : teamId;
}

export function addNews(
  save: SaveGame,
  kind: SaveGame['news'][number]['kind'],
  text: string,
  args: Record<string, string | number> = {}
): void {
  save.news.unshift({
    id: `n-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    season: save.world.season,
    round: playerSeriesOf(save)?.roundIndex ?? 0,
    kind,
    text,
    args,
  });
  save.news = save.news.slice(0, 60);
}

export interface NewDriverInput {
  id: string;
  first: string;
  last: string;
  nat: string;
  age: number;
  number: number;
  helmet: string;
  category: Category;
  difficulty: 'easy' | 'normal' | 'hard';
  seed: number;
}

const ROOKIE_SKILLS: Record<'easy' | 'normal' | 'hard', number> = {
  easy: 66,
  normal: 61,
  hard: 56,
};

export function createDriverCareer(input: NewDriverInput): SaveGame {
  const world = createWorld(2026, input.seed);
  const seed = input.seed >>> 0 || hashSeed(`${input.first}${input.last}`);
  const holder = { rngState: seed };
  const teams = categoryTeams(input.category).slice().sort((a, b) => a.reputation - b.reputation);
  const startTeamDef = teams[0];
  const team = world.teams[startTeamDef.id];
  const roster = [...team.driverIds].filter(Boolean) as string[];
  const replacedId = roster.sort((a, b) => overallRating(world.drivers[a]) - overallRating(world.drivers[b]))[0];
  const slot = team.driverIds[0] === replacedId ? 0 : 1;
  if (replacedId) {
    world.drivers[replacedId].teamId = null;
    world.drivers[replacedId].category = null;
  }
  const base = ROOKIE_SKILLS[input.difficulty];
  const skills = {
    pace: base + randInt(holder, -3, 5),
    tyre: base + randInt(holder, -4, 3),
    fuel: base + randInt(holder, -3, 4),
    overtaking: base + randInt(holder, -4, 4),
    defending: base + randInt(holder, -4, 4),
    consistency: base + randInt(holder, -5, 3),
    wet: base + randInt(holder, -3, 5),
    qualifying: base + randInt(holder, -3, 5),
  };
  const playerDriver: Driver = {
    id: 'player',
    firstId: input.first.trim(),
    lastId: input.last.trim(),
    nat: input.nat,
    age: input.age,
    number: input.number,
    skills,
    potential: input.difficulty === 'easy' ? 96 : input.difficulty === 'normal' ? 93 : 90,
    xp: 0,
    devPoints: 2,
    reputation: 22,
    category: input.category,
    teamId: team.id,
    retired: false,
    form: 0,
    morale: 70,
    isPlayer: true,
    helmet: input.helmet,
  };
  world.drivers.player = playerDriver;
  team.driverIds[slot] = 'player';
  team.driverIds = team.driverIds.map((id) => id ?? null) as [string | null, string | null];

  const salary = suggestedSalary(playerDriver.reputation, input.category, team.reputation) * 0.9;
  const contract: Contract = {
    id: 'ct-player',
    driverId: 'player',
    teamId: team.id,
    salary: Math.round(salary / 10_000) * 10_000,
    seasons: 1,
    startSeason: world.season,
    endSeason: world.season,
    winBonus: Math.round(salary * 0.08),
    podiumBonus: Math.round(salary * 0.03),
    titleBonus: Math.round(salary * 0.5),
    releaseFee: Math.round(salary * 0.3),
    objective: categoryObjective(input.category, 40),
    role: 'race',
  };
  world.contracts[contract.id] = contract;

  const series = world.series[input.category];
  series.driverIds = series.driverIds.filter((id) => id !== replacedId);
  if (!series.driverIds.includes('player')) series.driverIds.push('player');

  const player: DriverCareerData = {
    kind: 'driver',
    driverId: 'player',
    teamId: team.id,
    category: input.category,
    money: Math.round(salary * 0.15),
    skillPoints: 2,
    objective: contract.objective,
    objectiveTarget: expectedPositionForCar(world, team),
    status: 'active',
    seasonHistory: [],
    interest: 0,
    lastRoundPay: 0,
  };

  const save = makeSave(`save-${seed}-${Date.now()}`, 'driver', world, player, seed);
  addNews(save, 'info', 'Benvenuto nel mondo del motorsport, {driver}. La tua carriera comincia con {team}.', {
    driver: 'player',
    team: team.id,
  });
  return save;
}

export interface NewTeamInput {
  id: string;
  name: string;
  short: string;
  color: string;
  accent: string;
  logo: string;
  category: Category;
  budgetLevel: 'low' | 'medium' | 'high';
  seed: number;
}

const BUDGET_FACTOR: Record<'low' | 'medium' | 'high', number> = { low: 0.65, medium: 1, high: 1.45 };

export function createTeamCareer(input: NewTeamInput): SaveGame {
  const world = createWorld(2026, input.seed);
  const seed = input.seed >>> 0 || hashSeed(input.name);
  const teams = categoryTeams(input.category).slice().sort((a, b) => a.reputation - b.reputation);
  const baseTeam = teams[0];
  const team = world.teams[baseTeam.id];

  team.nameId = input.name.trim();
  team.shortId = input.short.trim().toUpperCase().slice(0, 3);
  team.color = input.color;
  team.accent = input.accent;
  team.logo = TEAM_LOGOS.includes(input.logo) ? input.logo : 'wing';
  team.isPlayer = true;
  team.budget = Math.round(CATEGORY_BUDGET[input.category] * BUDGET_FACTOR[input.budgetLevel]);
  team.sponsorDeals = [
    {
      sponsorId: team.sponsorIds[0] ?? 'pirely',
      perRace: Math.round(CATEGORY_SPONSOR_BASE[input.category] * 1.1),
      objective: 'Punti in stagione',
      bonus: CATEGORY_SPONSOR_BASE[input.category] * 8,
    },
  ];
  team.reputation = Math.max(35, baseTeam.reputation - 6);
  team.car = {
    ...baseTeam.car,
    aero: baseTeam.car.aero - 2,
    chassis: baseTeam.car.chassis - 2,
    reliability: baseTeam.car.reliability - 3,
  };
  team.driverIds = [null, null];
  team.staff = [];

  // The two previous drivers of this entry become free agents and are available in the market.
  const previousDrivers = Object.values(world.drivers).filter((d) => d.teamId === team.id);
  for (const driver of previousDrivers) {
    driver.teamId = null;
    driver.category = null;
  }
  const freeAgents = Object.values(world.drivers)
    .filter((d) => d.teamId === null && !d.retired)
    .sort((a, b) => overallRating(b) - overallRating(a));

  const holder = { rngState: seed };
  const pool = freeAgents.slice(0, 6);
  for (let slot = 0; slot < 2; slot++) {
    const candidate = pool[slot] ?? freeAgents[slot];
    if (!candidate) continue;
    const salary = Math.max(80_000, suggestedSalary(candidate.reputation, input.category, team.reputation) * 0.8);
    candidate.teamId = team.id;
    candidate.category = input.category;
    team.driverIds[slot] = candidate.id;
    world.contracts[`ct-${candidate.id}-${team.id}`] = {
      id: `ct-${candidate.id}-${team.id}`,
      driverId: candidate.id,
      teamId: team.id,
      salary: Math.round(salary / 10_000) * 10_000,
      seasons: 1,
      startSeason: world.season,
      endSeason: world.season,
      winBonus: Math.round(salary * 0.05),
      podiumBonus: Math.round(salary * 0.02),
      titleBonus: Math.round(salary * 0.3),
      releaseFee: Math.round(salary * 0.3),
      objective: 'Punti in stagione',
      role: 'race',
    };
  }

  const series = world.series[input.category];
  series.driverIds = Object.values(world.drivers)
    .filter((d) => d.teamId && world.teams[d.teamId]?.category === input.category)
    .map((d) => d.id);

  // Initial staff: two affordable engineers.
  const staffPool = generateStaffPool(holder, 6, input.category);
  team.staff = staffPool.slice(0, 2);
  for (const member of team.staff) {
    team.budget -= member.salary;
  }

  const player: TeamCareerData = {
    kind: 'team',
    teamId: team.id,
    category: input.category,
    objective: categoryObjective(input.category, team.reputation),
    objectiveTarget: expectedPositionForCar(world, team),
    status: 'active',
    seasonHistory: [],
    sponsorOffers: generateSponsorOffers(holder, input.category, 3),
    freeAgentIds: freeAgents.map((d) => d.id),
    staffPool: generateStaffPool(holder, 6, input.category),
    lastRoundIncome: 0,
  };

  const save = makeSave(`save-${seed}-${Date.now()}`, 'team', world, player, seed);
  addNews(save, 'info', '{team} è iscritta al campionato. Budget iniziale: {value}.', {
    team: team.id,
    value: `${Math.round(team.budget / 1_000_000)} Mln €`,
  });
  return save;
}

export function expectedPositionForCar(world: World, team: Team): number {
  const rivals = world.series[team.category].teamIds.map((id) => world.teams[id]);
  const sorted = rivals.slice().sort((a, b) => carPerformance(b.car) - carPerformance(a.car));
  return Math.max(1, sorted.findIndex((x) => x.id === team.id) + 1);
}

export function playerDriverOf(save: SaveGame): Driver | null {
  if (save.player.kind !== 'driver') return null;
  return save.world.drivers[save.player.driverId] ?? null;
}

export function playerTeamOf(save: SaveGame): Team | null {
  if (save.player.kind === 'team') return save.world.teams[save.player.teamId] ?? null;
  const driver = playerDriverOf(save);
  if (!driver || !driver.teamId) return null;
  return save.world.teams[driver.teamId] ?? null;
}

export function playerCategoryOf(save: SaveGame): Category | null {
  if (save.player.kind === 'team') return save.player.category;
  return save.world.drivers[save.player.driverId]?.category ?? null;
}

export function playerSeriesOf(save: SaveGame): Series | null {
  const category = playerCategoryOf(save);
  return category ? save.world.series[category] : null;
}

export function playerDriverIdsOf(save: SaveGame): string[] {
  if (save.player.kind === 'driver') return [save.player.driverId];
  const team = playerTeamOf(save);
  if (!team) return [];
  return team.driverIds.filter(Boolean) as string[];
}

export function nextRoundOf(save: SaveGame): Round | null {
  const series = playerSeriesOf(save);
  return series ? currentRound(save.world, series.category) : null;
}

export function contractOf(save: SaveGame, driverId: string): Contract | null {
  return Object.values(save.world.contracts).find((c) => c.driverId === driverId && c.endSeason >= save.world.season) ?? null;
}

// ---------------------------------------------------------------------------
// Weekend flow
// ---------------------------------------------------------------------------

export function beginWeekend(save: SaveGame, pct: 25 | 50): SaveGame {
  const next = cloneSave(save);
  if (next.phase !== 'season') return next;
  const category = playerCategoryOf(next);
  const series = playerSeriesOf(next);
  if (!category || !series) return next;
  const round = series.calendar[series.roundIndex];
  if (!round) {
    next.phase = 'offseason';
    return next;
  }
  if (!next.world.series[category].qualifying[round.index]) {
    next.world.series[category].qualifying[round.index] = runQualifying(
      next.world,
      category,
      round.index,
      hashSeed(`${next.id}-${round.index}-q`)
    );
  }
  const lapsAtPct = Math.max(6, Math.round((round.laps * pct) / 100));
  next.weekend = {
    roundIndex: round.index,
    pct,
    qualifying: next.world.series[category].qualifying[round.index],
    race: null,
    setup: defaultSetup(category, lapsAtPct),
  };
  next.phase = 'weekend';
  return next;
}

export function updateWeekendSetup(save: SaveGame, setup: Partial<RaceSetup>): SaveGame {
  const next = cloneSave(save);
  if (!next.weekend) return next;
  next.weekend.setup = { ...next.weekend.setup, ...setup };
  return next;
}

export function startRace(save: SaveGame): SaveGame {
  const next = cloneSave(save);
  if (!next.weekend) return next;
  const category = playerCategoryOf(next);
  if (!category) return next;
  const series = next.world.series[category];
  const round = series.calendar[next.weekend.roundIndex];
  const team = playerTeamOf(next);
  const race = createRace(next.world, category, next.weekend.roundIndex, {
    pct: next.weekend.pct,
    setup: next.weekend.setup,
    playerTeamId: team ? team.id : null,
    playerDriverIds: playerDriverIdsOf(next),
    seed: hashSeed(`${next.id}-${round.index}-race-${next.world.season}`),
    qualifying: next.weekend.qualifying,
  });
  next.weekend.race = race;
  return next;
}

export function simulateOneLap(save: SaveGame): SaveGame {
  if (!save.weekend?.race || save.weekend.race.finished) return save;
  const next = cloneSave(save);
  if (!next.weekend?.race) return next;
  stepLap(next.weekend.race, next.world);
  captureWeekendResult(next);
  return next;
}

/** Stores the provisional classification as soon as the race is over. */
function captureWeekendResult(next: SaveGame): void {
  const weekend = next.weekend;
  if (!weekend?.race || !weekend.race.finished || weekend.result) return;
  weekend.result = buildRaceResult(next.world, weekend.race);
}

export function simulateRaceToEnd(save: SaveGame): SaveGame {
  if (!save.weekend?.race || save.weekend.race.finished) return save;
  const next = cloneSave(save);
  if (!next.weekend?.race) return next;
  simulateRemaining(next.weekend.race, next.world);
  captureWeekendResult(next);
  return next;
}

export function pitPlayerCar(save: SaveGame, driverId: string, compound: Compound): SaveGame {
  const next = cloneSave(save);
  if (!next.weekend?.race) return next;
  pitNow(next.weekend.race, driverId, compound);
  return next;
}

export function finishWeekend(save: SaveGame): SaveGame {
  const next = cloneSave(save);
  const weekend = next.weekend;
  if (!weekend || !weekend.race) return next;
  const race = weekend.race;
  if (!race.finished) simulateRemaining(race, next.world);
  const category = playerCategoryOf(next);
  if (!category) return next;
  const series = next.world.series[category];
  const already = series.results.some((r) => r.roundIndex === weekend.roundIndex);
  if (!already) {
    const result = finalizeRace(next.world, race);
    applyRoundOutcome(next, result, category);
  }
  next.weekend = null;
  if (series.roundIndex >= series.calendar.length) {
    next.phase = 'offseason';
    prepareOffseason(next);
  } else {
    next.phase = 'season';
  }
  return next;
}

function applyRoundOutcome(save: SaveGame, result: ReturnType<typeof finalizeRace>, category: Category): void {
  const world = save.world;
  const series = world.series[category];
  const fieldSize = result.rows.length;
  for (const row of result.rows) {
    const driver = world.drivers[row.driverId];
    if (!driver) continue;
    const position = row.position;
    const effect = position === 1 ? 1.4 : position <= 3 ? 0.9 : position <= 10 ? 0.25 : -0.45;
    driver.form = Math.max(-3, Math.min(3, driver.form * 0.65 + effect));
    if (!driver.isPlayer) {
      driver.reputation = Math.max(5, Math.min(99, driver.reputation + (position <= 3 ? 0.8 : position <= 10 ? 0.2 : -0.15)));
    }
  }

  const team = playerTeamOf(save);
  if (save.player.kind === 'driver') {
    const career = save.player;
    const driver = world.drivers[career.driverId];
    const row = result.rows.find((r) => r.driverId === career.driverId);
    if (!row || !team) return;
    const contract = contractOf(save, career.driverId);
    const rounds = series.calendar.length;
    let pay = contract ? contract.salary / rounds : 0;
    if (row.position === 1 && contract) pay += contract.winBonus;
    else if (row.position <= 3 && contract) pay += contract.podiumBonus;
    career.lastRoundPay = Math.round(pay);
    career.money += Math.round(pay);
    const xpGain = Math.round(28 + (fieldSize - row.position) * 5 + (row.points > 0 ? 18 : 0) + (row.status === 'retired' ? 4 : 0));
    driver.xp += xpGain;
    while (driver.xp >= 100) {
      driver.xp -= 100;
      driver.devPoints += 1;
      career.skillPoints += 1;
    }
    const repGain =
      row.position === 1 ? 4 : row.position <= 3 ? 2.2 : row.position <= 8 ? 0.9 : row.position <= 12 ? 0.2 : -0.5;
    driver.reputation = Math.max(1, Math.min(99, driver.reputation + repGain));
    driver.morale = Math.max(20, Math.min(100, driver.morale + (row.position <= 6 ? 3 : -2)));
    career.interest = Math.max(0, driver.reputation - 30);

    const raceName = `${t(`comp.gp.${result.circuitId}`)}`;
    addNews(
      save,
      'result',
      row.status === 'retired'
        ? 'Ritiro a {event}: gara da dimenticare.'
        : 'P{value} a {event} per {driver}. +{points} punti.',
      {
        driver: career.driverId,
        event: raceName,
        value: row.position,
        points: row.points,
      }
    );
    if (row.position === 1) {
      addNews(save, 'title', 'Vittoria! {driver} conquista il gradino più alto del podio a {event}.', {
        driver: career.driverId,
        event: raceName,
      });
    }
    if (row.position <= 3) driver.reputation = Math.min(99, driver.reputation + 0.5);
  } else {
    const playerTeam = playerTeamOf(save);
    if (!playerTeam) return;
    const teamRows = result.rows.filter((r) => r.teamId === playerTeam.id);
    const best = teamRows.reduce((acc, r) => Math.min(acc, r.position), 99);
    const income = playerTeam.sponsorDeals.reduce((sum, deal) => sum + deal.perRace, 0) + prizeMoneyFor(category, best, fieldSize);
    const rounds = series.calendar.length;
    const salaries = playerTeam.driverIds
      .filter(Boolean)
      .map((id) => contractOf(save, id as string)?.salary ?? 0)
      .reduce((a, b) => a + b, 0);
    const staffSalaries = playerTeam.staff.reduce((sum, s) => sum + s.salary, 0);
    const expenses = (salaries + staffSalaries) / rounds + CATEGORY_RUNNING_COST[category];
    playerTeam.budget += Math.round(income - expenses);
    save.player.lastRoundIncome = Math.round(income - expenses);
    progressProjects(save);
    addNews(save, 'finance', 'Bilancio del round: {value}. Miglior risultato: P{position}.', {
      value: `${Math.round((income - expenses) / 1000)} K €`,
      position: best,
    });
    if (playerTeam.budget < 0) {
      playerTeam.reputation = Math.max(10, playerTeam.reputation - 0.5);
      if (playerTeam.budget < -CATEGORY_BUDGET[category] * 0.45) {
        save.player.status = 'bankrupt';
        save.phase = 'ended';
        addNews(save, 'finance', 'La scuderia è in bancarotta: il campionato è finito.');
      }
    }
  }

  // Simulate the same round in the other championships to keep the world alive.
  simulateOtherSeries(save, category);
}

function progressProjects(save: SaveGame): void {
  const team = playerTeamOf(save);
  if (!team) return;
  const staffAvg = team.staff.length ? team.staff.reduce((a, s) => a + s.rating, 0) / team.staff.length : 40;
  const speed = 1 + (staffAvg - 50) / 90;
  const completed: string[] = [];
  const failed: string[] = [];
  for (const project of [...team.projects]) {
    project.remaining -= speed;
    if (project.remaining <= 0) {
      const riskyFail = project.risky && Math.random() < 0.14;
      if (riskyFail) failed.push(project.label);
      else {
        team.car[project.department] = Math.min(99, Math.round((team.car[project.department] + project.gain) * 10) / 10);
        completed.push(project.label);
      }
      team.projects = team.projects.filter((p) => p.id !== project.id);
    }
  }
  if (completed.length) {
    addNews(save, 'info', 'Sviluppo completato: {value}.', { value: completed.join(', ') });
  }
  if (failed.length) {
    addNews(save, 'info', 'Sviluppo fallito (affidabilità del progetto): {value}.', { value: failed.join(', ') });
  }
}

function simulateOtherSeries(save: SaveGame, playerCategory: Category): void {
  const seedBase = hashSeed(`${save.id}-${save.world.season}-${save.world.series[playerCategory].roundIndex}`);
  for (const category of ['F3', 'F2', 'F1'] as Category[]) {
    if (category === playerCategory) continue;
    const series = save.world.series[category];
    const round = series.calendar[series.roundIndex];
    if (!round) continue;
    const qual = runQualifying(save.world, category, round.index, seedBase + round.index * 31);
    series.qualifying[round.index] = qual;
    const race = createRace(save.world, category, round.index, {
      pct: 50,
      setup: defaultSetup(category, round.laps),
      playerTeamId: null,
      playerDriverIds: [],
      seed: seedBase + round.index * 97,
      qualifying: qual,
    });
    simulateRemaining(race, save.world);
    finalizeRace(save.world, race);
  }
}

// ---------------------------------------------------------------------------
// Season end / market
// ---------------------------------------------------------------------------

function prepareOffseason(save: SaveGame): void {
  const category = playerCategoryOf(save);
  if (!category) return;
  const standings = computeStandings(save.world, category);
  if (save.player.kind === 'driver') {
    const career = save.player;
    const row = standings.drivers.find((r) => r.id === career.driverId);
    const position = row?.position ?? standings.drivers.length;
    const target = career.objectiveTarget;
    const contract = contractOf(save, career.driverId);
    career.seasonHistory.push({
      season: save.world.season,
      category,
      teamId: career.teamId,
      position,
      points: row?.points ?? 0,
      wins: row?.wins ?? 0,
      podiums: row?.podiums ?? 0,
      salary: contract?.salary ?? 0,
      note: position <= target ? 'Obiettivo centrato' : 'Obiettivo mancato',
    });
    if (position <= target) {
      career.interest = Math.min(100, career.interest + 12);
      addNews(save, 'info', 'Obiettivo stagionale centrato: P{value} in campionato.', { value: position });
    } else {
      career.interest = Math.max(0, career.interest - 10);
      addNews(save, 'info', 'Obiettivo stagionale mancato: P{value} contro un target di P{target}.', {
        value: position,
        target,
      });
    }
    const driver = save.world.drivers[career.driverId];
    if (driver) driver.reputation = Math.max(1, Math.min(99, driver.reputation + (position <= 3 ? 4 : position <= 6 ? 1.5 : -1)));
    save.offers = generateOffers(save, category, position);
  } else {
    const row = standings.teams.find((r) => r.id === save.player.teamId);
    const position = row?.position ?? standings.teams.length;
    const team = playerTeamOf(save);
    const prize = seasonPrize(category, position, standings.teams.length);
    if (team) {
      team.budget += prize;
      team.history.push({ season: save.world.season, position, points: row?.points ?? 0 });
      addNews(save, 'finance', 'Premio di fine stagione: {value} per il P{position} tra i costruttori.', {
        value: `${Math.round(prize / 1000)} K €`,
        position,
      });
      for (const loan of team.loans) {
        const due = Math.round(loan.amount * (1 + loan.rate));
        team.budget -= due;
        addNews(save, 'finance', 'Rimborso del prestito: {value}.', { value: `${Math.round(due / 1000)} K €` });
      }
      team.loans = [];
      const holder = { rngState: hashSeed(`${save.id}-${save.world.season}-sponsor`) };
      save.player.sponsorOffers = generateSponsorOffers(holder, category, 3);
      save.player.staffPool = generateStaffPool(holder, 7, category);
      save.player.seasonHistory.push({
        season: save.world.season,
        category,
        teamId: team.id,
        position,
        points: row?.points ?? 0,
        wins: row?.wins ?? 0,
        podiums: row?.podiums ?? 0,
        salary: 0,
        note: position <= save.player.objectiveTarget ? 'Obiettivo centrato' : 'Obiettivo mancato',
      });
    }
  }
}

export function generateOffers(save: SaveGame, category: Category, position: number): Offer[] {
  const world = save.world;
  const career = save.player as DriverCareerData;
  const driver = world.drivers[career.driverId];
  if (!driver) return [];
  const holder = { rngState: hashSeed(`${save.id}-${save.world.season}-offers`) };
  const currentTeam = driver.teamId ? world.teams[driver.teamId] : null;
  const offers: Offer[] = [];
  const fieldSize = world.series[category].driverIds.length;
  const performance = 1 - (position - 1) / Math.max(1, fieldSize);
  const seats = availableSeats(world, category, driver.teamId ?? undefined);
  const categoriesOrder: Category[] = ['F3', 'F2', 'F1'];
  const nextCategory = categoriesOrder[Math.min(2, categoriesOrder.indexOf(category) + 1)];
  const prevCategory = categoriesOrder[Math.max(0, categoriesOrder.indexOf(category) - 1)];
  if (currentTeam) {
    const renewalWanted = position <= career.objectiveTarget + 2 || performance > 0.55;
    if (renewalWanted) {
      offers.push(
        buildOffer(holder, currentTeam, driver, 'renewal', Math.max(0.75, 0.9 + performance * 0.25), save)
      );
    }
  }
  const promotionEligible = category !== 'F1' && position <= 3;
  const demotionRisk = position > Math.ceil(fieldSize * 0.72);
  for (const seat of seats) {
    const team = seat.team;
    const sameCategory = team.category === category;
    const isPromotion = categoriesOrder.indexOf(team.category) > categoriesOrder.indexOf(category);
    const isDemotion = categoriesOrder.indexOf(team.category) < categoriesOrder.indexOf(category);
    if (isPromotion && !promotionEligible) continue;
    if (isDemotion && !demotionRisk) continue;
    if (!sameCategory && !isPromotion && !isDemotion) continue;
    if (team.reputation > driver.reputation + 22 && !isPromotion) continue;
    const strength = performance * 0.7 + driver.reputation / 140 + (isPromotion ? 0.2 : 0);
    if (nextRandom(holder) > 0.35 + strength) continue;
    offers.push(buildOffer(holder, team, driver, isPromotion ? 'promotion' : isDemotion ? 'demotion' : 'external', 0.85 + performance * 0.4, save));
  }
  if (offers.length === 0) {
    const fallbackTeam =
      currentTeam ??
      world.series[category].teamIds
        .map((id) => world.teams[id])
        .sort((a, b) => a.reputation - b.reputation)[0];
    if (fallbackTeam) {
      offers.push(buildOffer(holder, fallbackTeam, driver, currentTeam ? 'renewal' : 'external', 0.8, save));
    } else if (prevCategory !== category) {
      const lower = world.series[prevCategory].teamIds.map((id) => world.teams[id]).sort((a, b) => a.reputation - b.reputation)[0];
      if (lower) offers.push(buildOffer(holder, lower, driver, 'demotion', 0.7, save));
    }
  }
  const seen = new Set<string>();
  return offers
    .filter((offer) => {
      if (seen.has(offer.teamId)) return false;
      seen.add(offer.teamId);
      return true;
    })
    .sort((a, b) => b.salary - a.salary)
    .slice(0, 6);
}

function availableSeats(world: World, category: Category, excludeTeamId?: string): { team: Team; replacing: string | null }[] {
  const out: { team: Team; replacing: string | null }[] = [];
  const categories: Category[] = ['F1', 'F2', 'F3'];
  for (const cat of categories) {
    for (const teamId of world.series[cat].teamIds) {
      if (teamId === excludeTeamId) continue;
      const team = world.teams[teamId];
      if (!team) continue;
      for (let slot = 0; slot < 2; slot++) {
        const driverId = team.driverIds[slot];
        if (!driverId) {
          out.push({ team, replacing: null });
          continue;
        }
        const contract = Object.values(world.contracts).find((c) => c.driverId === driverId);
        if (!contract || contract.endSeason <= world.season) out.push({ team, replacing: driverId });
      }
    }
  }
  void category;
  return out;
}

function buildOffer(
  holder: { rngState: number },
  team: Team,
  driver: Driver,
  kind: Offer['kind'],
  factor: number,
  save: SaveGame
): Offer {
  const base = suggestedSalary(Math.max(driver.reputation, 20), team.category, team.reputation);
  const salary = Math.round((base * Math.max(0.7, factor)) / 50_000) * 50_000;
  const seasons = team.reputation > driver.reputation + 15 ? 1 : randInt(holder, 1, 3);
  return {
    id: uid('offer', holder),
    teamId: team.id,
    category: team.category,
    salary,
    seasons,
    winBonus: Math.round(salary * 0.07),
    podiumBonus: Math.round(salary * 0.03),
    titleBonus: Math.round(salary * 0.45),
    releaseFee: Math.round(salary * 0.32),
    objective: categoryObjective(team.category, driver.reputation),
    kind,
    negotiated: false,
    withdrawn: false,
    messageId: kind === 'promotion' ? 'Promozione' : kind === 'renewal' ? 'Rinnovo' : kind === 'demotion' ? 'Nuova sfida' : 'Proposta',
  };
  void save;
}

export function negotiateOffer(save: SaveGame, offerId: string): SaveGame {
  const next = cloneSave(save);
  const offer = next.offers.find((o) => o.id === offerId);
  if (!offer || offer.negotiated || offer.withdrawn) return next;
  const driver = playerDriverOf(next);
  if (!driver) return next;
  const team = next.world.teams[offer.teamId];
  const holder = { rngState: hashSeed(`${offer.id}-neg`) };
  const successChance = 0.35 + driver.reputation / 200 - team.reputation / 500 + (offer.kind === 'renewal' ? 0.1 : 0);
  offer.negotiated = true;
  if (nextRandom(holder) < successChance) {
    offer.salary = Math.round((offer.salary * 1.18) / 50_000) * 50_000;
    offer.winBonus = Math.round(offer.salary * 0.07);
    offer.podiumBonus = Math.round(offer.salary * 0.03);
    offer.releaseFee = Math.round(offer.salary * 0.32);
    addNews(next, 'contract', 'Trattativa riuscita: {team} alza l\'offerta a {value} a stagione.', {
      team: offer.teamId,
      value: `${Math.round(offer.salary / 100_000) / 10} Mln €`,
    });
  } else {
    if (nextRandom(holder) < 0.2) {
      offer.withdrawn = true;
      addNews(next, 'contract', '{team} ritira l\'offerta dopo la richiesta di aumento.', { team: offer.teamId });
    } else {
      addNews(next, 'contract', '{team} rifiuta la richiesta di aumento: l\'offerta resta invariata.', {
        team: offer.teamId,
      });
    }
  }
  return next;
}

export function declineOffer(save: SaveGame, offerId: string): SaveGame {
  const next = cloneSave(save);
  next.offers = next.offers.filter((o) => o.id !== offerId);
  return next;
}

export function acceptOffer(save: SaveGame, offerId: string): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'driver') return next;
  const offer = next.offers.find((o) => o.id === offerId);
  if (!offer || offer.withdrawn) return next;
  const career = next.player;
  const driver = next.world.drivers[career.driverId];
  if (!driver) return next;
  const team = next.world.teams[offer.teamId];
  const oldTeam = driver.teamId ? next.world.teams[driver.teamId] : null;
  if (oldTeam) {
    oldTeam.driverIds = oldTeam.driverIds.map((id) => (id === driver.id ? null : id)) as [string | null, string | null];
  }
  let slot = team.driverIds.findIndex((id) => id === null);
  if (slot === -1) {
    const weakest = (team.driverIds.filter(Boolean) as string[]).sort(
      (a, b) => overallRating(next.world.drivers[a]) - overallRating(next.world.drivers[b])
    )[0];
    slot = team.driverIds.findIndex((id) => id === weakest);
    if (weakest) {
      next.world.drivers[weakest].teamId = null;
      next.world.drivers[weakest].category = null;
      addNews(next, 'contract', '{driver} lascia {team} per fare posto al nuovo acquisto.', {
        driver: weakest,
        team: team.id,
      });
    }
  }
  team.driverIds[slot] = driver.id;
  driver.teamId = team.id;
  driver.category = team.category;
  const oldContracts = Object.values(next.world.contracts).filter((c) => c.driverId === driver.id);
  for (const c of oldContracts) delete next.world.contracts[c.id];
  const contract: Contract = {
    id: `ct-player-${next.world.season}-${team.id}`,
    driverId: driver.id,
    teamId: team.id,
    salary: offer.salary,
    seasons: offer.seasons,
    startSeason: next.world.season + 1,
    endSeason: next.world.season + offer.seasons,
    winBonus: offer.winBonus,
    podiumBonus: offer.podiumBonus,
    titleBonus: offer.titleBonus,
    releaseFee: offer.releaseFee,
    objective: offer.objective,
    role: 'race',
  };
  next.world.contracts[contract.id] = contract;
  career.teamId = team.id;
  career.category = team.category;
  career.objective = offer.objective;
  career.objectiveTarget = expectedPositionForCar(next.world, team);
  career.money += Math.round(offer.salary * 0.1);
  next.offers = [];
  const series = next.world.series[team.category];
  if (!series.driverIds.includes(driver.id)) series.driverIds.push(driver.id);
  addNews(next, 'contract', '{driver} firma con {team}: contratto di {value} stagioni.', {
    driver: driver.id,
    team: team.id,
    value: offer.seasons,
  });
  return startNextSeason(next);
}

export function releaseContractAndRetry(save: SaveGame): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'driver') return next;
  const driver = playerDriverOf(next);
  if (!driver || !driver.teamId) return next;
  const contract = contractOf(next, driver.id);
  const fee = contract?.releaseFee ?? 0;
  const career = next.player;
  if (career.money < fee) {
    addNews(next, 'finance', 'Non hai abbastanza liquidità per pagare la penale di rescissione di {value}.', {
      value: `${Math.round(fee / 1000)} K €`,
    });
    return next;
  }
  career.money -= fee;
  const team = next.world.teams[driver.teamId];
  if (team) {
    team.driverIds = team.driverIds.map((id) => (id === driver.id ? null : id)) as [string | null, string | null];
  }
  driver.teamId = null;
  driver.category = null;
  career.teamId = null;
  if (contract) delete next.world.contracts[contract.id];
  addNews(next, 'finance', 'Contratto rescisso: penale di {value} pagata.', { value: `${Math.round(fee / 1000)} K €` });
  next.offers = next.offers.filter((o) => o.teamId !== team?.id);
  next.phase = 'offseason';
  return next;
}

export function retireCareer(save: SaveGame): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind === 'driver') {
    const driver = playerDriverOf(next);
    if (driver) {
      driver.retired = true;
      const team = driver.teamId ? next.world.teams[driver.teamId] : null;
      if (team) team.driverIds = team.driverIds.map((id) => (id === driver.id ? null : id)) as [string | null, string | null];
      driver.teamId = null;
    }
    next.player.status = 'retired';
  } else {
    next.player.status = 'bankrupt';
  }
  next.phase = 'ended';
  addNews(next, 'info', 'La carriera di {driver} si chiude qui. Grazie per le emozioni.', { driver: 'player' });
  return next;
}

export function spendSkillPoint(save: SaveGame, skill: SkillKey): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'driver') return next;
  const driver = playerDriverOf(next);
  if (!driver || driver.devPoints <= 0) return next;
  const current = driver.skills[skill];
  if (current >= 99) return next;
  driver.skills[skill] = Math.min(99, current + 1);
  driver.devPoints -= 1;
  next.player.skillPoints = driver.devPoints;
  return next;
}

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

export function signFreeAgent(save: SaveGame, driverId: string, salary: number, seasons: number): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  const driver = next.world.drivers[driverId];
  if (!team || !driver || driver.retired || driver.teamId) return next;
  const slot = team.driverIds.findIndex((id) => id === null);
  if (slot === -1) return next;
  const cost = Math.round(salary * 0.25);
  if (team.budget < cost) {
    addNews(next, 'finance', 'Budget insufficiente per l\'anticipo sullo stipendio di {driver}.', { driver: driverId });
    return next;
  }
  team.budget -= cost;
  driver.teamId = team.id;
  driver.category = team.category;
  driver.morale = 75;
  team.driverIds[slot] = driver.id;
  const contract: Contract = {
    id: `ct-${driver.id}-${team.id}-${next.world.season}`,
    driverId: driver.id,
    teamId: team.id,
    salary,
    seasons,
    startSeason: next.world.season,
    endSeason: next.world.season + seasons - 1,
    winBonus: Math.round(salary * 0.06),
    podiumBonus: Math.round(salary * 0.025),
    titleBonus: Math.round(salary * 0.4),
    releaseFee: Math.round(salary * 0.35),
    objective: categoryObjective(team.category, driver.reputation),
    role: 'race',
  };
  next.world.contracts[contract.id] = contract;
  const series = next.world.series[team.category];
  if (!series.driverIds.includes(driver.id)) series.driverIds.push(driver.id);
  addNews(next, 'contract', '{team} ingaggia {driver}: {value} a stagione.', {
    driver: driver.id,
    team: team.id,
    value: `${Math.round(salary / 100_000) / 10} Mln €`,
  });
  return next;
}

export function releaseDriverFromTeam(save: SaveGame, driverId: string): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  if (!team || !team.driverIds.includes(driverId)) return next;
  const contract = contractOf(next, driverId);
  const penalty = contract ? Math.round(contract.salary * 0.25) : 0;
  team.budget -= penalty;
  team.driverIds = team.driverIds.map((id) => (id === driverId ? null : id)) as [string | null, string | null];
  const driver = next.world.drivers[driverId];
  if (driver) {
    driver.teamId = null;
    driver.category = null;
  }
  addNews(next, 'contract', 'Rescissione con {driver}: penale di {value}.', {
    driver: driverId,
    value: `${Math.round(penalty / 1000)} K €`,
  });
  return next;
}

export function generateStaffPool(
  holder: { rngState: number },
  count: number,
  category: Category
): StaffMember[] {
  const roles: StaffRole[] = ['technical', 'aero', 'engine', 'race'];
  const firstNames = ['Luca', 'Marco', 'Elena', 'Andrea', 'Sophie', 'James', 'Klaus', 'Pablo', 'Nina', 'Tom', 'Chiara', 'Rafael'];
  const lastNames = ['Bianchi', 'Rossi', 'Muller', 'Smith', 'Garcia', 'Schmidt', 'Moreau', 'Costa', 'Novak', 'Andersen', 'Ferraro', 'Lopez'];
  const baseSalary: Record<Category, number> = { F1: 1_200_000, F2: 260_000, F3: 120_000 };
  const out: StaffMember[] = [];
  for (let i = 0; i < count; i++) {
    const rating = randInt(holder, 48, 92);
    const role = roles[randInt(holder, 0, roles.length - 1)];
    const salary = Math.round((baseSalary[category] * (0.4 + rating / 70)) / 10_000) * 10_000;
    out.push({
      id: uid('staff', holder),
      first: firstNames[randInt(holder, 0, firstNames.length - 1)],
      last: lastNames[randInt(holder, 0, lastNames.length - 1)],
      role,
      rating,
      salary,
      seasons: randInt(holder, 1, 3),
    });
  }
  return out;
}

export function hireStaff(save: SaveGame, staffId: string): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  const candidate = next.player.staffPool.find((s) => s.id === staffId);
  if (!team || !candidate) return next;
  if (team.staff.length >= 4) {
    addNews(next, 'info', 'Hai già 4 membri dello staff tecnico: liberane uno prima di assumere.');
    return next;
  }
  if (team.budget < candidate.salary) {
    addNews(next, 'finance', 'Budget insufficiente per assumere {value}.', { value: `${Math.round(candidate.salary / 1000)} K €` });
    return next;
  }
  team.budget -= candidate.salary;
  team.staff.push(candidate);
  next.player.staffPool = next.player.staffPool.filter((s) => s.id !== staffId);
  addNews(next, 'contract', 'Nuovo membro dello staff: {value}.', { value: `${candidate.first} ${candidate.last}` });
  return next;
}

export function fireStaff(save: SaveGame, staffId: string): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  if (!team) return next;
  const member = team.staff.find((s) => s.id === staffId);
  if (!member) return next;
  team.staff = team.staff.filter((s) => s.id !== staffId);
  team.budget -= Math.round(member.salary * 0.3);
  next.player.staffPool.push(member);
  return next;
}

export function startDevelopment(
  save: SaveGame,
  department: 'aero' | 'engine' | 'chassis' | 'suspension' | 'brakes' | 'reliability',
  size: 'small' | 'large',
  risky: boolean
): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  if (!team) return next;
  const category = team.category;
  const baseCost: Record<Category, number> = { F1: 3_200_000, F2: 420_000, F3: 140_000 };
  const gainRange = size === 'large' ? [4, 7] : [2, 3.5];
  const duration = size === 'large' ? 4 : 2;
  const cost = Math.round((baseCost[category] * (size === 'large' ? 2.4 : 1) * (risky ? 0.72 : 1)) / 10_000) * 10_000;
  if (team.budget < cost) {
    addNews(next, 'finance', 'Budget insufficiente per il progetto di sviluppo ({value}).', {
      value: `${Math.round(cost / 1000)} K €`,
    });
    return next;
  }
  team.budget -= cost;
  const holder = { rngState: hashSeed(`${save.id}-${department}-${team.projects.length}-${next.world.season}`) };
  const gain = Math.round(randRange(holder, gainRange[0], gainRange[1]) * 10) / 10;
  const labels: Record<string, string> = {
    aero: 'Pacchetto aerodinamico',
    engine: 'Aggiornamento motore',
    chassis: 'Nuovo telaio',
    suspension: 'Sospensioni',
    brakes: 'Freni',
    reliability: 'Affidabilità',
  };
  team.projects.push({
    id: uid('proj', holder),
    department,
    gain,
    cost,
    totalRaces: duration,
    remaining: duration,
    label: `${labels[department]} +${gain}`,
    risky,
  });
  addNews(next, 'finance', 'Avviato sviluppo: {value} (costo {cost}).', {
    value: labels[department],
    cost: `${Math.round(cost / 1000)} K €`,
  });
  return next;
}

function generateSponsorOffers(holder: { rngState: number }, category: Category, count: number): SponsorDeal[] {
  const names = ['santandor', 'petronaz', 'orakle', 'bybiit', 'masterkard', 'lenovoo', 'emiratess', 'qatarairwayz', 'aramko', 'shel', 'heinekenn', 'rolexx', 'dhlexpres', 'mobilon', 'vodafon', 'salesforc', 'kriptocom'];
  const out: SponsorDeal[] = [];
  for (let i = 0; i < count; i++) {
    const sponsorId = names[randInt(holder, 0, names.length - 1)];
    const perRace = Math.round((CATEGORY_SPONSOR_BASE[category] * randRange(holder, 0.6, 1.8)) / 1000) * 1000;
    out.push({
      sponsorId,
      perRace,
      objective: randInt(holder, 0, 2) === 0 ? 'Podio in campionato' : 'Punti in stagione',
      bonus: perRace * randInt(holder, 5, 12),
    });
  }
  return out;
}

export function signSponsor(save: SaveGame, index: number): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  const deal = next.player.sponsorOffers[index];
  if (!team || !deal) return next;
  if (team.sponsorDeals.length >= 4) {
    addNews(next, 'finance', 'Hai già 4 sponsor: chiudi un contratto prima di firmarne un altro.');
    return next;
  }
  if (team.sponsorDeals.some((d) => d.sponsorId === deal.sponsorId)) {
    addNews(next, 'finance', 'Esiste già un contratto con questo sponsor.');
    return next;
  }
  team.sponsorDeals.push(deal);
  if (!team.sponsorIds.includes(deal.sponsorId)) team.sponsorIds.push(deal.sponsorId);
  next.player.sponsorOffers = next.player.sponsorOffers.filter((_, i) => i !== index);
  addNews(next, 'finance', 'Nuovo sponsor: {value}, {amount} a gara.', {
    value: `sponsor.${deal.sponsorId}`,
    amount: `${Math.round(deal.perRace / 1000)} K €`,
  });
  return next;
}

export function takeLoan(save: SaveGame, amount: number): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = next.world.teams[next.player.teamId];
  if (!team) return next;
  const rate = 0.12;
  team.budget += amount;
  team.loans.push({ amount, rate, seasonsLeft: 1 });
  addNews(next, 'finance', 'Prestito acceso: {value}, da restituire con interessi del 12%.', {
    value: `${Math.round(amount / 1000)} K €`,
  });
  return next;
}

export function refreshFreeAgents(save: SaveGame): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  next.player.freeAgentIds = Object.values(next.world.drivers)
    .filter((d) => !d.retired && d.teamId === null)
    .map((d) => d.id);
  return next;
}

// ---------------------------------------------------------------------------
// Season rollover
// ---------------------------------------------------------------------------

export function advanceToNextSeason(save: SaveGame): SaveGame {
  return startNextSeason(cloneSave(save));
}

function startNextSeason(save: SaveGame): SaveGame {
  const world = save.world;
  const holder = { rngState: hashSeed(`${save.id}-season-${world.season}`) };
  world.season += 1;

  for (const driver of Object.values(world.drivers)) {
    driver.age += 1;
    driver.form = 0;
    driver.morale = Math.max(40, Math.min(90, driver.morale + 4));
    const growth = driver.age < 24 ? 2.4 : driver.age < 29 ? 1.1 : driver.age < 34 ? -0.4 : -1.6;
    for (const key of SKILL_KEYS) {
      const target = Math.min(driver.potential, driver.skills[key] + growth);
      driver.skills[key] = Math.round(Math.max(20, Math.min(99, target)) * 10) / 10;
    }
    if (!driver.isPlayer && driver.age >= 36 && nextRandom(holder) < (driver.age - 34) * 0.22) {
      driver.retired = true;
      driver.teamId = null;
      driver.category = null;
      if (driver.category) {
        for (const team of Object.values(world.teams)) {
          team.driverIds = team.driverIds.map((id) => (id === driver.id ? null : id)) as [string | null, string | null];
        }
      }
      addNews(save, 'info', '{driver} annuncia il ritiro dalle competizioni.', { driver: driver.id });
    }
  }

  for (const contract of Object.values(world.contracts)) {
    if (contract.endSeason < world.season) {
      const driver = world.drivers[contract.driverId];
      if (driver && !driver.isPlayer) {
        driver.teamId = null;
        driver.category = null;
      }
      delete world.contracts[contract.id];
    }
  }

  fillAllSeats(world, holder, save);

  for (const category of ['F1', 'F2', 'F3'] as Category[]) {
    const series = world.series[category];
    series.calendar = CATEGORY_CALENDARS[category].map((circuitId, index) => ({
      index,
      circuitId,
      eventId: `comp.gp.${circuitId}`,
      laps: series.calendar[index]?.laps ?? 50,
    }));
    series.results = [];
    series.qualifying = {};
    series.roundIndex = 0;
    series.teamIds = world.series[category].teamIds;
    series.driverIds = Object.values(world.drivers)
      .filter((d) => !d.retired && d.teamId && world.teams[d.teamId]?.category === category)
      .map((d) => d.id);
  }

  if (save.player.kind === 'driver') {
    const driver = world.drivers[save.player.driverId];
    if (driver) {
      save.player.teamId = driver.teamId;
      save.player.category = driver.category;
      if (!driver.teamId) {
        save.player.status = 'free-agent';
      } else {
        save.player.status = 'active';
      }
      save.player.objectiveTarget = driver.teamId ? expectedPositionForCar(world, world.teams[driver.teamId]) : 10;
    }
  } else {
    const team = world.teams[save.player.teamId];
    if (team) {
      save.player.objectiveTarget = expectedPositionForCar(world, team);
      save.player.objective = categoryObjective(team.category, team.reputation);
    }
  }

  save.phase = save.player.status === 'retired' || save.player.status === 'bankrupt' ? 'ended' : 'season';
  save.weekend = null;
  save.offers = [];
  const series = save.player.category ? save.world.series[save.player.category] : null;
  addNews(save, 'info', 'Inizia la stagione {value}. Buona fortuna!', {
    value: series ? `${world.season} di ${t(series.category === 'F1' ? 'comp.f1' : series.category === 'F2' ? 'comp.f2' : 'comp.f3')}` : String(world.season),
  });
  return save;
}

function fillAllSeats(world: World, holder: { rngState: number }, save: SaveGame): void {
  const categories: Category[] = ['F1', 'F2', 'F3'];
  const playerTeamId = save.player.kind === 'team' ? save.player.teamId : null;
  for (const category of categories) {
    const teams = world.series[category].teamIds
      .map((id) => world.teams[id])
      .sort((a, b) => {
        if (playerTeamId) {
          if (a.id === playerTeamId) return -1;
          if (b.id === playerTeamId) return 1;
        }
        return b.reputation - a.reputation;
      });
    for (const team of teams) {
      for (let slot = 0; slot < 2; slot++) {
        const currentId = team.driverIds[slot];
        const current = currentId ? world.drivers[currentId] : null;
        if (current && current.teamId && current.teamId !== team.id) {
          // Stale slot: the driver already signed elsewhere, just free the seat.
          team.driverIds[slot] = null;
        }
        if (current && !current.retired && current.teamId === team.id) {
          const contract = Object.values(world.contracts).find((c) => c.driverId === current.id);
          if (!contract) {
            const salary = suggestedSalary(current.reputation, team.category, team.reputation);
            world.contracts[`ct-${current.id}-${team.id}-${world.season}`] = {
              id: `ct-${current.id}-${team.id}-${world.season}`,
              driverId: current.id,
              teamId: team.id,
              salary,
              seasons: 1,
              startSeason: world.season,
              endSeason: world.season,
              winBonus: Math.round(salary * 0.06),
              podiumBonus: Math.round(salary * 0.025),
              titleBonus: Math.round(salary * 0.4),
              releaseFee: Math.round(salary * 0.35),
              objective: categoryObjective(team.category, current.reputation),
              role: 'race',
            };
          }
          continue;
        }
        if (current && current.isPlayer) continue;
        if (current && current.teamId === team.id) {
          current.teamId = null;
          current.category = null;
        }
        const candidates = Object.values(world.drivers)
          .filter((d) => !d.retired && !d.isPlayer && d.teamId === null && d.age < 40)
          .sort((a, b) => overallRating(b) + b.reputation * 0.3 - (overallRating(a) + a.reputation * 0.3));
        const isRookie = candidates.length === 0;
        const pickCandidate = candidates[0] ?? spawnRookie(world, team, holder);
        if (isRookie && team.id === playerTeamId) {
          addNews(save, 'contract', 'La scuderia completa la lineup con il debuttante {driver}.', {
            driver: pickCandidate.id,
            team: team.id,
          });
        }
        pickCandidate.teamId = team.id;
        pickCandidate.category = team.category;
        team.driverIds[slot] = pickCandidate.id;
        const salary = Math.max(
          Math.round(suggestedSalary(pickCandidate.reputation, team.category, team.reputation) * 0.85),
          Math.round(CATEGORY_BUDGET[category] * 0.02)
        );
        world.contracts[`ct-${pickCandidate.id}-${team.id}-${world.season}`] = {
          id: `ct-${pickCandidate.id}-${team.id}-${world.season}`,
          driverId: pickCandidate.id,
          teamId: team.id,
          salary,
          seasons: randInt(holder, 1, 2),
          startSeason: world.season,
          endSeason: world.season + randInt(holder, 0, 1),
          winBonus: Math.round(salary * 0.06),
          podiumBonus: Math.round(salary * 0.025),
          titleBonus: Math.round(salary * 0.4),
          releaseFee: Math.round(salary * 0.35),
          objective: categoryObjective(team.category, pickCandidate.reputation),
          role: 'race',
        };
      }
    }
  }
  void save;
}

const ROOKIE_FIRST = ['Luca', 'Matteo', 'Elena', 'Jules', 'Kai', 'Diego', 'Noah', 'Yuki', 'Sven', 'Ines', 'Rui', 'Tom'];
const ROOKIE_LAST = ['Baldini', 'Voss', 'Marchetti', 'Duval', 'Tanaka', 'Silva', 'Novak', 'Klein', 'Ferrer', 'Lindqvist', 'Bauer', 'Costa'];

/** Creates a young replacement driver so every grid is always complete. */
function spawnRookie(world: World, team: Team, holder: { rngState: number }): Driver {
  const base = 46 + Math.floor(nextRandom(holder) * 14);
  const id = `rookie-${world.season}-${Object.keys(world.drivers).length}-${Math.floor(nextRandom(holder) * 9999)}`;
  const usedNumbers = new Set(Object.values(world.drivers).map((driver) => driver.number));
  let number = 2 + Math.floor(nextRandom(holder) * 97);
  for (let attempt = 0; attempt < 99 && usedNumbers.has(number); attempt++) {
    number = 2 + ((number + attempt) % 98);
  }
  const driver: Driver = {
    id,
    firstId: ROOKIE_FIRST[Math.floor(nextRandom(holder) * ROOKIE_FIRST.length)],
    lastId: ROOKIE_LAST[Math.floor(nextRandom(holder) * ROOKIE_LAST.length)],
    nat: ['IT', 'FR', 'DE', 'GB', 'ES', 'BR', 'JP', 'NL'][Math.floor(nextRandom(holder) * 8)],
    age: 18 + Math.floor(nextRandom(holder) * 4),
    number,
    skills: {
      pace: base,
      tyre: base - 3,
      fuel: base - 2,
      overtaking: base - 4,
      defending: base - 4,
      consistency: base - 6,
      wet: base - 3,
      qualifying: base - 2,
    },
    potential: 78 + Math.floor(nextRandom(holder) * 16),
    xp: 0,
    devPoints: 0,
    reputation: 12 + Math.floor(nextRandom(holder) * 14),
    category: team.category,
    teamId: team.id,
    retired: false,
    form: 0,
    morale: 72,
    isPlayer: false,
    helmet: team.color,
  };
  world.drivers[id] = driver;
  return driver;
}

export function startTeamNextSeason(save: SaveGame): SaveGame {
  const next = cloneSave(save);
  // Contracts of the player's team are extended automatically: the player can
  // still release or replace drivers, but never starts a season with empty seats.
  if (next.player.kind === 'team') {
    const team = next.world.teams[next.player.teamId];
    if (team) {
      for (const driverId of team.driverIds.filter(Boolean) as string[]) {
        const contract = Object.values(next.world.contracts).find(
          (entry) => entry.driverId === driverId && entry.teamId === team.id
        );
        if (contract && contract.endSeason <= next.world.season) {
          contract.endSeason += 1;
          contract.seasons += 1;
          contract.salary = Math.round((contract.salary * 1.05) / 10_000) * 10_000;
          contract.startSeason = next.world.season + 1;
        }
      }
    }
  }
  return startNextSeason(next);
}

// ---------------------------------------------------------------------------
// Convenience helpers for the UI
// ---------------------------------------------------------------------------

export function quickSimulateWeekend(save: SaveGame, pct: 25 | 50): SaveGame {
  let next = beginWeekend(save, pct);
  if (!next.weekend) return next;
  next = startRace(next);
  next = simulateRaceToEnd(next);
  next = finishWeekend(next);
  return next;
}

export function projectedSetupLaps(save: SaveGame): number {
  const round = nextRoundOf(save);
  if (!round) return 0;
  const pct = save.weekend?.pct ?? 25;
  return Math.max(6, Math.round((round.laps * pct) / 100));
}

export function tyreSuggestion(save: SaveGame): { compound: Compound; laps: number } {
  const round = nextRoundOf(save);
  if (!round) return { compound: 'medium', laps: 0 };
  const driver = playerDriverOf(save);
  const life = estimatedTyreLife('medium', 0.7, driver ? driver.skills.tyre : 70);
  void life;
  return { compound: round.laps > 55 ? 'medium' : 'soft', laps: round.laps };
}

export function driverContractRemaining(save: SaveGame, driverId: string): string {
  const contract = contractOf(save, driverId);
  if (!contract) return 'Senza contratto';
  const remaining = contract.endSeason - save.world.season + 1;
  return `${remaining} stagion${remaining === 1 ? 'e' : 'i'}`;
}

export function categoryFromId(id: string): Category {
  return id === 'F1' ? 'F1' : id === 'F2' ? 'F2' : 'F3';
}

export function teamOfDefId(id: string): string {
  return teamDefById(id).id;
}

export function economicSnapshot(save: SaveGame): {
  income: number;
  expenses: number;
  balance: number;
  salary: number;
} {
  if (save.player.kind === 'driver') {
    const contract = contractOf(save, save.player.driverId);
    const series = playerSeriesOf(save);
    const rounds = series?.calendar.length ?? 20;
    const salary = contract ? contract.salary / rounds : 0;
    return { income: salary, expenses: 0, balance: salary, salary: contract?.salary ?? 0 };
  }
  const team = playerTeamOf(save);
  if (!team) return { income: 0, expenses: 0, balance: 0, salary: 0 };
  const series = playerSeriesOf(save);
  const rounds = series?.calendar.length ?? 20;
  const sponsors = team.sponsorDeals.reduce((sum, d) => sum + d.perRace, 0);
  const prize = prizeMoneyFor(team.category, 5, 22);
  const salaries = team.driverIds
    .filter(Boolean)
    .map((id) => contractOf(save, id as string)?.salary ?? 0)
    .reduce((a, b) => a + b, 0);
  const staff = team.staff.reduce((sum, s) => sum + s.salary, 0);
  const expenses = (salaries + staff) / rounds + CATEGORY_RUNNING_COST[team.category];
  return {
    income: sponsors + prize,
    expenses,
    balance: sponsors + prize - expenses,
    salary: salaries,
  };
}

// ---------------------------------------------------------------------------
// Contracts & identity
// ---------------------------------------------------------------------------

/** Extends a driver contract by one season with an 8% raise. */
export function renewContract(save: SaveGame, driverId: string): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = playerTeamOf(next);
  const driver = next.world.drivers[driverId];
  if (!team || !driver) return next;
  const contract = Object.values(next.world.contracts).find(
    (entry) => entry.driverId === driverId && entry.teamId === team.id && entry.endSeason >= next.world.season
  );
  if (!contract) return next;
  const raise = Math.round((contract.salary * 0.08) / 10_000) * 10_000;
  if (team.budget < raise) {
    addNews(next, 'finance', 'Budget insufficiente per il rinnovo di {driver}.', { driver: driverId });
    return next;
  }
  contract.endSeason += 1;
  contract.seasons += 1;
  contract.salary += raise;
  addNews(next, 'contract', '{team} rinnova con {driver} fino al {value}.', {
    driver: driverId,
    team: team.id,
    value: String(contract.endSeason),
  });
  return next;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Updates the player team livery: primary/secondary colour and emblem. */
export function updateTeamIdentity(
  save: SaveGame,
  patch: { color?: string; accent?: string; logo?: string }
): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'team') return next;
  const team = playerTeamOf(next);
  if (!team) return next;
  if (patch.color && HEX.test(patch.color)) team.color = patch.color;
  if (patch.accent && HEX.test(patch.accent)) team.accent = patch.accent;
  if (patch.logo) team.logo = patch.logo;
  return next;
}

/** Updates the player driver helmet colour and race number. */
export function updateDriverIdentity(
  save: SaveGame,
  patch: { helmet?: string; number?: number }
): SaveGame {
  const next = cloneSave(save);
  if (next.player.kind !== 'driver') return next;
  const driver = playerDriverOf(next);
  if (!driver) return next;
  if (patch.helmet && HEX.test(patch.helmet)) driver.helmet = patch.helmet;
  if (typeof patch.number === 'number' && patch.number >= 1 && patch.number <= 99) {
    driver.number = Math.round(patch.number);
  }
  return next;
}

export function prizePoolFor(category: Category): number {
  return CATEGORY_PRIZE_POOL[category];
}

export function sponsorBaseFor(category: Category): number {
  return CATEGORY_SPONSOR_BASE[category];
}

export function allTeamsOfCategory(world: World, category: Category): Team[] {
  return world.series[category].teamIds.map((id) => world.teams[id]).filter(Boolean);
}

export function totalRoundsOf(save: SaveGame): number {
  return playerSeriesOf(save)?.calendar.length ?? 0;
}
