import type {
  CarState,
  Category,
  Compound,
  QualifyingResult,
  RaceEvent,
  RaceResult,
  RaceResultRow,
  RaceSetup,
  RaceState,
  Series,
  World,
} from '../types';
import { circuitCountry } from '../data/catalog';
import { carPerformance, getCircuit } from './world';
import { chance, nextRandom, randInt, randRange } from './rng';
import { FASTEST_LAP_POINTS, POINTS, POLE_POINTS, pointsFor } from './format';
import { t } from '../names/registry';

export interface CompoundSpec {
  life: number;
  paceOffset: number;
  dryGrip: number;
}

export const COMPOUND_SPEC: Record<Compound, CompoundSpec> = {
  soft: { life: 14, paceOffset: -0.3, dryGrip: 1.0 },
  medium: { life: 21, paceOffset: 0, dryGrip: 0.995 },
  hard: { life: 29, paceOffset: 0.34, dryGrip: 0.988 },
  inter: { life: 18, paceOffset: 0, dryGrip: 0 },
  wet: { life: 15, paceOffset: 0, dryGrip: 0 },
};

export const COMPOUNDS_DRY: Compound[] = ['soft', 'medium', 'hard'];
export const COMPOUNDS_WET: Compound[] = ['inter', 'wet'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function estimatedTyreLife(compound: Compound, abrasion: number, tyreSkill: number): number {
  const spec = COMPOUND_SPEC[compound];
  const circuitFactor = 1.5 - abrasion * 0.85;
  const skillFactor = 0.62 + (tyreSkill / 100) * 0.5;
  return Math.max(6, spec.life * circuitFactor * skillFactor);
}

export function planStops(setup: RaceSetup, lapsTotal: number): { lap: number; compound: Compound }[] {
  const stops = clamp(Math.round(setup.stops), 0, 3);
  if (stops === 0) return [];
  const out: { lap: number; compound: Compound }[] = [];
  for (let i = 1; i <= stops; i++) {
    out.push({
      lap: Math.max(2, Math.round((lapsTotal * i) / (stops + 1))),
      compound: setup.secondCompound,
    });
  }
  return out;
}

export function defaultSetup(category: Category, lapsTotal: number): RaceSetup {
  const stops = lapsTotal > 30 ? 1 : 1;
  return {
    compound: 'medium',
    stops,
    aggression: 'balanced',
    fuelMode: 0,
    fuelMargin: 2,
    secondCompound: lapsTotal > 30 ? 'hard' : 'soft',
  };
}

function driverPaceIndex(world: World, car: CarState, race: RaceState, qualifying = false): number {
  const driver = world.drivers[car.driverId];
  const team = world.teams[car.teamId];
  if (!driver || !team) return 60;
  const s = driver.skills;
  const carPerf = carPerformance(team.car);
  let driverPerf: number;
  if (qualifying) {
    driverPerf = s.pace * 0.34 + s.qualifying * 0.5 + s.consistency * 0.16;
  } else {
    driverPerf =
      s.pace * 0.44 + s.consistency * 0.18 + s.tyre * 0.1 + s.fuel * 0.06 + s.overtaking * 0.06 + s.defending * 0.04 + s.qualifying * 0.06;
    if (race.wetness > 0.12) driverPerf = driverPerf * (1 - 0.16) + s.wet * 0.16;
  }
  return carPerf * 0.62 + driverPerf * 0.38 + driver.form * 0.5 + (driver.morale - 65) * 0.02;
}

export function runQualifying(world: World, category: Category, roundIndex: number, seed: number): QualifyingResult {
  const series = world.series[category];
  const round = series.calendar[roundIndex];
  const circuit = getCircuit(round.circuitId);
  const holder = { rngState: seed >>> 0 || 7 };
  const wetness = nextRandom(holder) < circuit.rainChance * 0.5 ? randRange(holder, 0.3, 0.8) : 0;
  const order = series.driverIds
    .filter((id) => world.drivers[id] && world.drivers[id].teamId)
    .map((driverId) => {
      const driver = world.drivers[driverId];
      const team = world.teams[driver.teamId as string];
      const fakeCar: CarState = {
        driverId,
        teamId: team.id,
        slot: 0,
        isPlayer: false,
        compound: wetness > 0.3 ? 'inter' : 'soft',
        tyreLife: 100,
        fuelLaps: 0,
        fuelMode: 0,
        push: 0,
        totalTime: 0,
        lapsDone: 0,
        lastLap: 0,
        bestLap: 0,
        position: 0,
        grid: 0,
        pitStops: 0,
        plannedStops: [],
        status: 'running',
        penalty: 0,
        damage: 0,
        startedFromPit: false,
      };
      const raceStub = { wetness } as RaceState;
      const pace = driverPaceIndex(world, fakeCar, raceStub, true);
      const base = circuit.baseLap * (1 + (92 - pace) * 0.00115);
      let best = Number.POSITIVE_INFINITY;
      for (let attempt = 0; attempt < 3; attempt++) {
        const noise = (nextRandom(holder) - 0.5) * (0.5 + (1 - driver.skills.consistency / 100) * 0.9);
        const time = base + noise + wetness * 6;
        if (time < best) best = time;
      }
      return { driverId, time: Math.round(best * 1000) / 1000, position: 0 };
    })
    .sort((a, b) => a.time - b.time);
  order.forEach((row, index) => {
    row.position = index + 1;
  });
  return { roundIndex, order };
}

export interface CreateRaceOptions {
  pct: 25 | 50;
  setup: RaceSetup;
  playerTeamId: string | null;
  playerDriverIds: string[];
  seed: number;
  qualifying?: QualifyingResult | null;
}

export function createRace(world: World, category: Category, roundIndex: number, opts: CreateRaceOptions): RaceState {
  const series = world.series[category];
  const round = series.calendar[roundIndex];
  const circuit = getCircuit(round.circuitId);
  const lapsTotal = Math.max(6, Math.round((round.laps * opts.pct) / 100));
  const holder = { rngState: opts.seed >>> 0 || 12345 };
  const qualifying =
    opts.qualifying ?? series.qualifying[roundIndex] ?? runQualifying(world, category, roundIndex, opts.seed);
  const gridOrder = qualifying.order.map((row) => row.driverId).filter((id) => world.drivers[id]?.teamId);

  const rains = nextRandom(holder) < circuit.rainChance * 0.55;
  const startWetness = rains ? randRange(holder, 0.35, 0.95) : 0;
  const cars: CarState[] = gridOrder.map((driverId, index) => {
    const driver = world.drivers[driverId];
    const team = world.teams[driver.teamId as string];
    const isPlayer = opts.playerDriverIds.includes(driverId);
    const isPlayerTeam = opts.playerTeamId !== null && team.id === opts.playerTeamId;
    let compound: Compound;
    let planned: { lap: number; compound: Compound }[] = [];
    let fuelMargin = 1.8;
    let push: -1 | 0 | 1 = 0;
    if (isPlayerTeam) {
      if (startWetness > 0.25) {
        compound = startWetness > 0.6 ? 'wet' : 'inter';
      } else {
        compound = opts.setup.compound;
      }
      planned = planStops(opts.setup, lapsTotal);
      fuelMargin = opts.setup.fuelMargin;
      push = opts.setup.aggression === 'aggressive' ? 1 : opts.setup.aggression === 'conservative' ? -1 : 0;
    } else {
      const softStart = circuit.abrasion < 0.55 || lapsTotal < 16;
      compound = startWetness > 0.6 ? 'wet' : startWetness > 0.25 ? 'inter' : softStart ? 'soft' : 'medium';
      const safeLife = estimatedTyreLife(compound, circuit.abrasion, driver.skills.tyre);
      const stopsNeeded = Math.max(0, Math.ceil(lapsTotal / (safeLife * 0.92)) - 1);
      planned = [];
      for (let i = 1; i <= stopsNeeded; i++) {
        planned.push({
          lap: Math.round((lapsTotal * i) / (stopsNeeded + 1)),
          compound: startWetness > 0.25 ? 'inter' : circuit.abrasion > 0.7 ? 'hard' : 'medium',
        });
      }
      fuelMargin = randRange(holder, 1.2, 2.6);
      push = driver.skills.overtaking > 85 ? 1 : driver.skills.consistency < 60 ? -1 : 0;
    }
    return {
      driverId,
      teamId: team.id,
      slot: index % 2 === 0 ? 0 : 1,
      isPlayer,
      compound,
      tyreLife: 100,
      fuelLaps: lapsTotal * (1 + fuelMargin / 100),
      fuelMode: isPlayerTeam ? opts.setup.fuelMode : -1,
      push,
      totalTime: index * 0.22,
      lapsDone: 0,
      lastLap: 0,
      bestLap: 0,
      position: index + 1,
      grid: index + 1,
      pitStops: 0,
      plannedStops: planned,
      status: 'running',
      penalty: 0,
      damage: 0,
      startedFromPit: false,
    };
  });

  const race: RaceState = {
    category,
    roundIndex,
    circuitId: round.circuitId,
    season: world.season,
    pct: opts.pct,
    lapsTotal,
    lap: 0,
    flag: 'green',
    flagUntil: 0,
    cars,
    events: [{ lap: 0, code: 'start' }],
    rngState: holder.rngState,
    wetness: startWetness,
    rainNext: startWetness > 0 ? startWetness : 0,
    temperature: Math.round(randRange(holder, 18, 38)),
    fastestLap: null,
    safetyCars: 0,
    finished: false,
    playerTeamId: opts.playerTeamId,
    playerDriverIds: [...opts.playerDriverIds],
    startWeather: weatherLabel(startWetness),
  };
  return race;
}

export function weatherLabel(wetness: number): string {
  if (wetness < 0.1) return 'Asciutto';
  if (wetness < 0.35) return 'Umido';
  if (wetness < 0.7) return 'Pioggia leggera';
  return 'Pioggia intensa';
}

export function raceOrder(race: RaceState): CarState[] {
  return race.cars.slice().sort((a, b) => {
    const aRetired = a.status === 'retired';
    const bRetired = b.status === 'retired';
    if (aRetired !== bRetired) return aRetired ? 1 : -1;
    if (aRetired && bRetired) {
      if (b.lapsDone !== a.lapsDone) return b.lapsDone - a.lapsDone;
    }
    return a.totalTime + a.penalty - (b.totalTime + b.penalty);
  });
}

function tyreWeatherPenalty(compound: Compound, wetness: number): number {
  if (compound === 'soft' || compound === 'medium' || compound === 'hard') {
    return wetness > 0.12 ? wetness * 15 : 0;
  }
  if (compound === 'inter') {
    return Math.abs(wetness - 0.45) * 7 + (wetness < 0.05 ? 2.5 : 0);
  }
  return Math.abs(wetness - 0.85) * 7 + (wetness < 0.2 ? 4 : 0);
}

function paceFor(world: World, car: CarState, race: RaceState): number {
  return driverPaceIndex(world, car, race);
}

function applyWear(world: World, car: CarState, race: RaceState): void {
  const driver = world.drivers[car.driverId];
  const circuit = getCircuit(race.circuitId);
  const spec = COMPOUND_SPEC[car.compound];
  const circuitFactor = 1.5 - circuit.abrasion * 0.85;
  const skillFactor = 0.62 + (driver.skills.tyre / 100) * 0.5;
  const pushFactor = 1 + car.push * 0.17;
  const fuelFactor = 1 + Math.max(0, car.fuelLaps) * 0.004;
  const wetFactor = 1 - race.wetness * 0.45;
  const life = Math.max(6, spec.life * circuitFactor * skillFactor);
  const wear = (100 / life) * pushFactor * fuelFactor * wetFactor * (race.flag === 'sc' ? 0.35 : race.flag === 'vsc' ? 0.65 : 1);
  car.tyreLife -= wear;
}

function consumeFuel(world: World, car: CarState): void {
  const driver = world.drivers[car.driverId];
  const modeFactor = car.fuelMode === 1 ? 1.07 : car.fuelMode === -1 ? 0.92 : 1;
  const skillFactor = 1.02 - ((driver.skills.fuel - 50) / 100) * 0.08;
  car.fuelLaps -= modeFactor * skillFactor;
}

function lapTimeFor(world: World, car: CarState, race: RaceState): number {
  const circuit = getCircuit(race.circuitId);
  const driver = world.drivers[car.driverId];
  if (race.flag === 'sc') return circuit.baseLap * 1.45;
  const pace = paceFor(world, car, race);
  const base = circuit.baseLap * (1 + (92 - pace) * 0.0012);
  const spec = COMPOUND_SPEC[car.compound];
  let lap = base + spec.paceOffset;
  const life = clamp(car.tyreLife, 0, 100) / 100;
  lap += Math.pow(1 - life, 1.3) * 3.4;
  if (car.tyreLife <= 0) lap += 1.6 + Math.min(6, -car.tyreLife * 0.09);
  lap += Math.max(0, car.fuelLaps) * 0.026;
  lap += car.push === 1 ? -0.24 : car.push === -1 ? 0.28 : 0;
  lap += car.fuelMode === 1 ? -0.16 : car.fuelMode === -1 ? 0.16 : 0;
  lap += race.wetness * 6.5;
  lap += tyreWeatherPenalty(car.compound, race.wetness);
  lap += car.damage * 0.02;
  lap += (nextRandom(race) - 0.5) * (0.3 + (1 - driver.skills.consistency / 100) * 0.85);
  if (race.flag === 'vsc') lap *= 1.25;
  return lap;
}

function compressField(race: RaceState): void {
  const order = raceOrder(race);
  const leader = order.find((c) => c.status !== 'retired');
  if (!leader) return;
  let offset = 0;
  for (const car of order) {
    if (car.status === 'retired') continue;
    car.totalTime = leader.totalTime + offset;
    offset += 0.9;
  }
}

function deploy(race: RaceState, kind: 'sc' | 'vsc'): void {
  if (race.flag === 'sc' || race.flag === 'red') return;
  if (kind === 'sc') {
    race.flag = 'sc';
    race.flagUntil = race.lap + randInt(race, 2, 4);
    race.safetyCars += 1;
    race.events.push({ lap: race.lap, code: 'sc' });
    compressField(race);
  } else {
    race.flag = 'vsc';
    race.flagUntil = race.lap + randInt(race, 1, 3);
    race.events.push({ lap: race.lap, code: 'vsc' });
  }
}

function retire(race: RaceState, car: CarState, code: 'dnf-mechanical' | 'dnf-crash' | 'dnf-fuel'): void {
  car.status = 'retired';
  car.dnfCode = code;
  race.events.push({ lap: race.lap, code, driverId: car.driverId });
}

export function pitCar(race: RaceState, car: CarState, compound: Compound): void {
  const circuit = getCircuit(race.circuitId);
  const base = circuit.pitLoss * (race.flag === 'sc' ? 0.55 : race.flag === 'vsc' ? 0.72 : 1);
  const loss = base * (0.94 + nextRandom(race) * 0.1) + 0.35;
  car.totalTime += loss;
  car.pitStops += 1;
  car.compound = compound;
  car.tyreLife = 100;
  car.push = 0;
  race.events.push({ lap: race.lap, code: 'pit', driverId: car.driverId, compound });
}

function handlePitStops(world: World, race: RaceState): void {
  const circuit = getCircuit(race.circuitId);
  for (const car of race.cars) {
    if (car.status !== 'running') continue;
    const driver = world.drivers[car.driverId];
    const remaining = race.lapsTotal - race.lap;
    if (car.isPlayer) {
      const planned = car.plannedStops[0];
      if (planned && race.lap >= planned.lap && race.flag !== 'sc' && race.flag !== 'vsc') {
        pitCar(race, car, planned.compound);
        car.plannedStops.shift();
      }
      continue;
    }
    const planned = car.plannedStops[0];
    const wetMismatch =
      (car.compound === 'soft' || car.compound === 'medium' || car.compound === 'hard') && race.wetness > 0.3;
    const dryMismatch = (car.compound === 'inter' || car.compound === 'wet') && race.wetness < 0.15;
    if (planned && race.lap >= planned.lap) {
      const compound = wetMismatch ? (race.wetness > 0.6 ? 'wet' : 'inter') : planned.compound;
      pitCar(race, car, compound);
      car.plannedStops.shift();
      continue;
    }
    if ((wetMismatch || dryMismatch) && chance(race, 0.65)) {
      pitCar(race, car, wetMismatch ? (race.wetness > 0.6 ? 'wet' : 'inter') : 'medium');
      continue;
    }
    if (car.tyreLife < 16 && remaining > 2 && chance(race, 0.42)) {
      const tyreWet = race.wetness > 0.3;
      const compound: Compound = tyreWet ? (race.wetness > 0.6 ? 'wet' : 'inter') : circuit.abrasion > 0.65 ? 'hard' : 'medium';
      pitCar(race, car, compound);
      car.plannedStops.shift();
    }
    if (driver && car.tyreLife < -3 && chance(race, 0.1)) {
      car.totalTime += 4;
      car.tyreLife = 40;
      race.events.push({ lap: race.lap, code: 'puncture', driverId: car.driverId });
    }
  }
}

function updateWeather(race: RaceState): void {
  if (Math.abs(race.wetness - race.rainNext) > 0.01) {
    const dir = race.rainNext > race.wetness ? 1 : -1;
    const step = 0.06 + nextRandom(race) * 0.08;
    const before = race.wetness;
    race.wetness = clamp(race.wetness + dir * step, 0, 1);
    if (before < 0.12 && race.wetness >= 0.12) race.events.push({ lap: race.lap, code: 'rain-start' });
    if (before >= 0.12 && race.wetness < 0.12) race.events.push({ lap: race.lap, code: 'rain-stop' });
    return;
  }
  if (chance(race, 0.025)) {
    const roll = nextRandom(race);
    if (race.rainNext > 0.2 && roll < 0.55) race.rainNext = 0;
    else if (roll < 0.8) race.rainNext = Math.min(1, race.rainNext + randRange(race, 0.2, 0.5));
    else race.rainNext = randRange(race, 0.2, 0.7);
  }
}

function handleIncidents(world: World, race: RaceState): void {
  for (const car of race.cars) {
    if (car.status !== 'running') continue;
    const team = world.teams[car.teamId];
    const driver = world.drivers[car.driverId];
    if (!team || !driver) continue;
    if (race.flag === 'sc') continue;
    const reliability = team.car.reliability;
    const mech = (1 - reliability / 100) * 0.055 + car.damage * 0.0007 + (race.wetness > 0.4 ? 0.004 : 0);
    if (chance(race, mech)) {
      retire(race, car, 'dnf-mechanical');
      if (chance(race, 0.25)) deploy(race, 'sc');
      continue;
    }
    const errorChance =
      0.003 + (1 - driver.skills.consistency / 100) * 0.02 + race.wetness * 0.018 + (car.tyreLife < 20 ? 0.006 : 0);
    if (chance(race, errorChance)) {
      const severe = chance(race, 0.2 + race.wetness * 0.2);
      if (severe) {
        retire(race, car, 'dnf-crash');
        race.events.push({ lap: race.lap, code: 'off-track', driverId: car.driverId });
        if (chance(race, 0.6)) deploy(race, 'sc');
        else deploy(race, 'vsc');
      } else {
        car.totalTime += randRange(race, 1.5, 4.5);
        car.damage += randRange(race, 1, 5);
        race.events.push({ lap: race.lap, code: 'off-track', driverId: car.driverId });
      }
      continue;
    }
    if (chance(race, 0.004)) {
      car.penalty += 5;
      race.events.push({ lap: race.lap, code: 'penalty', driverId: car.driverId, value: 5 });
    }
    if (chance(race, 0.006)) {
      deploy(race, 'vsc');
    }
  }
}

function handleOvertakes(world: World, race: RaceState): void {
  if (race.flag !== 'green') return;
  const circuit = getCircuit(race.circuitId);
  const order = raceOrder(race);
  for (let i = 0; i < order.length - 1; i++) {
    const ahead = order[i];
    const behind = order[i + 1];
    if (ahead.status !== 'running' || behind.status !== 'running') continue;
    const gap = behind.totalTime - ahead.totalTime;
    if (gap <= 0 || gap > 1.15) continue;
    const paceDiff = paceFor(world, behind, race) - paceFor(world, ahead, race);
    const od = world.drivers[behind.driverId];
    const dd = world.drivers[ahead.driverId];
    let p =
      0.16 +
      paceDiff * 0.022 +
      ((od.skills.overtaking - dd.skills.defending) / 100) * 0.28 +
      (circuit.overtaking - 0.5) * 0.4;
    p *= 1 - race.wetness * 0.35;
    p = clamp(p, 0.015, 0.72);
    if (world.teams[behind.teamId]?.id === world.teams[ahead.teamId]?.id) p *= 0.45;
    if (chance(race, p)) {
      behind.totalTime = ahead.totalTime - 0.22;
      race.events.push({
        lap: race.lap,
        code: 'overtake',
        driverId: behind.driverId,
        targetId: ahead.driverId,
        value: i,
      });
      if (chance(race, 0.012)) {
        behind.damage += 12;
        ahead.damage += 8;
        race.events.push({ lap: race.lap, code: 'battle', driverId: behind.driverId, targetId: ahead.driverId });
        if (chance(race, 0.35)) {
          retire(race, behind, 'dnf-crash');
          if (chance(race, 0.5)) deploy(race, 'sc');
        }
      }
    } else if (chance(race, 0.25)) {
      race.events.push({ lap: race.lap, code: 'battle', driverId: behind.driverId, targetId: ahead.driverId });
    }
  }
}

export function stepLap(race: RaceState, world: World): void {
  if (race.finished) return;
  race.lap += 1;

  if ((race.flag === 'sc' || race.flag === 'vsc' || race.flag === 'yellow') && race.lap >= race.flagUntil) {
    race.flag = 'green';
    race.events.push({ lap: race.lap, code: 'sc-end' });
  }

  updateWeather(race);
  handlePitStops(world, race);

  for (const car of race.cars) {
    if (car.status !== 'running') continue;
    const lapTime = lapTimeFor(world, car, race);
    car.lastLap = lapTime;
    car.totalTime += lapTime;
    car.lapsDone = race.lap;
    if (lapTime < car.bestLap || car.bestLap === 0) car.bestLap = lapTime;
    if (!race.fastestLap || lapTime < race.fastestLap.time) {
      race.fastestLap = { driverId: car.driverId, time: lapTime };
    }
    applyWear(world, car, race);
    consumeFuel(world, car);
    if (car.fuelLaps < -0.06) {
      retire(race, car, 'dnf-fuel');
      continue;
    }
    if (car.tyreLife < -30) {
      retire(race, car, 'dnf-crash');
      race.events.push({ lap: race.lap, code: 'puncture', driverId: car.driverId });
      continue;
    }
  }

  handleIncidents(world, race);
  handleOvertakes(world, race);

  const order = raceOrder(race);
  order.forEach((car, index) => {
    car.position = index + 1;
  });

  if (race.lap >= race.lapsTotal) {
    for (const car of race.cars) {
      if (car.status === 'running') car.status = 'finished';
      if (car.status === 'finished') car.totalTime += car.penalty;
    }
    race.flag = 'chequered';
    race.finished = true;
    race.events.push({ lap: race.lap, code: 'finish' });
  }
}

export function simulateRemaining(race: RaceState, world: World): void {
  let guard = 0;
  while (!race.finished && guard < 500) {
    stepLap(race, world);
    guard += 1;
  }
}

export function setPush(race: RaceState, driverId: string, push: -1 | 0 | 1): void {
  const car = race.cars.find((c) => c.driverId === driverId);
  if (car && car.status === 'running') car.push = push;
}

export function setFuelMode(race: RaceState, driverId: string, mode: -1 | 0 | 1): void {
  const car = race.cars.find((c) => c.driverId === driverId);
  if (car && car.status === 'running') car.fuelMode = mode;
}

export function pitNow(race: RaceState, driverId: string, compound: Compound): boolean {
  const car = race.cars.find((c) => c.driverId === driverId);
  if (!car || car.status !== 'running') return false;
  if (race.flag === 'red' || race.flag === 'chequered') return false;
  pitCar(race, car, compound);
  if (car.plannedStops.length) car.plannedStops.shift();
  return true;
}

export function addPlannedStop(race: RaceState, driverId: string, lap: number, compound: Compound): void {
  const car = race.cars.find((c) => c.driverId === driverId);
  if (!car) return;
  car.plannedStops = car.plannedStops.filter((s) => s.lap !== lap);
  car.plannedStops.push({ lap: clamp(lap, race.lap + 1, race.lapsTotal), compound });
  car.plannedStops.sort((a, b) => a.lap - b.lap);
}

/**
 * Builds the classification of a finished race without touching the championship.
 * Used to show the result before the weekend is confirmed.
 */
export function buildRaceResult(world: World, race: RaceState): RaceResult {
  const series = world.series[race.category];
  const round = series.calendar[race.roundIndex];
  const order = raceOrder(race);
  const leader = order.find((c) => c.status !== 'retired');
  const leaderTime = leader ? leader.totalTime : 0;
  const pole = series.qualifying[race.roundIndex]?.order[0]?.driverId ?? order[0]?.driverId ?? '';
  const fastest = race.fastestLap?.driverId ?? '';
  const rows: RaceResultRow[] = [];

  order.forEach((car, index) => {
    const position = index + 1;
    const retired = car.status === 'retired';
    let points = 0;
    if (!retired && position <= POINTS[race.category].length) {
      points = pointsFor(race.category, position);
      if (car.driverId === fastest && position <= 10) points += FASTEST_LAP_POINTS[race.category];
    }
    if (car.driverId === pole) points += POLE_POINTS[race.category];
    rows.push({
      driverId: car.driverId,
      teamId: car.teamId,
      position,
      grid: car.grid,
      points,
      status: retired ? 'retired' : car.lapsDone < race.lapsTotal - 1 ? 'lapped' : 'classified',
      reasonId: car.dnfCode,
      totalTime: Math.round((car.totalTime + car.penalty) * 1000) / 1000,
      gap: retired ? 0 : Math.round((car.totalTime + car.penalty - leaderTime) * 1000) / 1000,
      fastestLap: car.driverId === fastest,
      pitStops: car.pitStops,
    });
  });

  const keyEvents = race.events.filter((e) =>
    ['sc', 'vsc', 'rain-start', 'rain-stop', 'dnf-crash', 'dnf-mechanical', 'dnf-fuel', 'finish'].includes(e.code)
  );

  return {
    season: world.season,
    category: race.category,
    roundIndex: race.roundIndex,
    circuitId: round.circuitId,
    pct: race.pct,
    poleDriverId: pole,
    fastestLapDriverId: fastest,
    weather: weatherLabel(race.wetness),
    rows,
    keyEvents: keyEvents.slice(0, 14),
  };
}

/** Persists a finished race into its championship and advances the round. */
export function finalizeRace(world: World, race: RaceState): RaceResult {
  const result = buildRaceResult(world, race);
  const series = world.series[race.category];
  if (!series.results.some((r) => r.roundIndex === race.roundIndex)) {
    series.results.push(result);
    series.qualifying[race.roundIndex] = series.qualifying[race.roundIndex] ?? {
      roundIndex: race.roundIndex,
      order: result.rows.map((row) => ({
        driverId: row.driverId,
        time: race.cars.find((car) => car.driverId === row.driverId)?.bestLap ?? 0,
        position: row.position,
      })),
    };
    series.roundIndex += 1;
  }
  return result;
}

export function poleBonus(category: Category): number {
  return POLE_POINTS[category];
}

export function circuitCountryLabel(circuitId: string): string {
  return circuitCountry(circuitId);
}

export function describeRaceForSeries(series: Series, world: World, roundIndex: number): string {
  const result = series.results.find((r) => r.roundIndex === roundIndex);
  if (!result) return '';
  const winner = result.rows[0];
  if (!winner) return '';
  const driver = world.drivers[winner.driverId];
  if (!driver) return '';
  return `${t(driver.firstId)} ${t(driver.lastId)} vince a ${t(`circuit.${result.circuitId}`)}`;
}

export function raceEventFeed(race: RaceState, limit = 8): RaceEvent[] {
  return race.events.slice(-limit).reverse();
}
