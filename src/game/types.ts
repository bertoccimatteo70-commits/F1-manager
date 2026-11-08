export type Category = 'F3' | 'F2' | 'F1';

export type Compound = 'soft' | 'medium' | 'hard' | 'inter' | 'wet';

export type StaffRole = 'technical' | 'aero' | 'engine' | 'race';

export interface Skills {
  pace: number;
  tyre: number;
  fuel: number;
  overtaking: number;
  defending: number;
  consistency: number;
  wet: number;
  qualifying: number;
}

export interface Driver {
  id: string;
  firstId: string;
  lastId: string;
  nat: string;
  age: number;
  number: number;
  skills: Skills;
  potential: number;
  xp: number;
  devPoints: number;
  reputation: number;
  category: Category | null;
  teamId: string | null;
  retired: boolean;
  form: number;
  morale: number;
  isPlayer: boolean;
  helmet: string;
}

export interface Contract {
  id: string;
  driverId: string;
  teamId: string;
  salary: number;
  seasons: number;
  startSeason: number;
  endSeason: number;
  winBonus: number;
  podiumBonus: number;
  titleBonus: number;
  releaseFee: number;
  objective: string;
  role: 'race' | 'reserve';
}

export interface CarSpec {
  aero: number;
  engine: number;
  chassis: number;
  suspension: number;
  brakes: number;
  reliability: number;
}

export type Department = keyof CarSpec;

export interface DevelopmentProject {
  id: string;
  department: Department;
  gain: number;
  cost: number;
  totalRaces: number;
  remaining: number;
  label: string;
  risky: boolean;
}

export interface StaffMember {
  id: string;
  first: string;
  last: string;
  role: StaffRole;
  rating: number;
  salary: number;
  seasons: number;
}

export interface SponsorDeal {
  sponsorId: string;
  perRace: number;
  objective: string;
  bonus: number;
}

export interface Team {
  id: string;
  nameId: string;
  shortId: string;
  color: string;
  accent: string;
  category: Category;
  engineId: string;
  car: CarSpec;
  sponsorIds: string[];
  sponsorDeals: SponsorDeal[];
  budget: number;
  driverIds: [string | null, string | null];
  staff: StaffMember[];
  logo: string;
  isPlayer: boolean;
  projects: DevelopmentProject[];
  history: { season: number; position: number; points: number }[];
  loans: { amount: number; rate: number; seasonsLeft: number }[];
  reputation: number;
}

export interface Circuit {
  id: string;
  country: string;
  baseLap: number;
  fullLaps: number;
  abrasion: number;
  overtaking: number;
  rainChance: number;
  pitLoss: number;
}

export interface Round {
  index: number;
  circuitId: string;
  eventId: string;
  laps: number;
}

export interface RaceResultRow {
  driverId: string;
  teamId: string;
  position: number;
  grid: number;
  points: number;
  status: 'classified' | 'lapped' | 'retired';
  reasonId?: string;
  totalTime: number;
  gap: number;
  fastestLap: boolean;
  pitStops: number;
}

export interface RaceResult {
  season: number;
  category: Category;
  roundIndex: number;
  circuitId: string;
  pct: number;
  poleDriverId: string;
  fastestLapDriverId: string;
  weather: string;
  rows: RaceResultRow[];
  keyEvents: RaceEvent[];
}

export interface QualifyingResult {
  roundIndex: number;
  order: { driverId: string; time: number; position: number }[];
}

export interface Series {
  category: Category;
  teamIds: string[];
  driverIds: string[];
  calendar: Round[];
  roundIndex: number;
  results: RaceResult[];
  qualifying: Record<number, QualifyingResult>;
}

export interface World {
  season: number;
  drivers: Record<string, Driver>;
  teams: Record<string, Team>;
  contracts: Record<string, Contract>;
  series: Record<Category, Series>;
}

export interface Offer {
  id: string;
  teamId: string;
  category: Category;
  salary: number;
  seasons: number;
  winBonus: number;
  podiumBonus: number;
  titleBonus: number;
  releaseFee: number;
  objective: string;
  kind: 'renewal' | 'external' | 'promotion' | 'demotion';
  negotiated: boolean;
  withdrawn: boolean;
  messageId: string;
}

export interface NewsItem {
  id: string;
  season: number;
  round: number;
  kind: 'info' | 'result' | 'contract' | 'finance' | 'title';
  text: string;
  args?: Record<string, string | number>;
}

export interface SeasonRecord {
  season: number;
  category: Category | 'none';
  teamId: string | null;
  position: number;
  points: number;
  wins: number;
  podiums: number;
  salary: number;
  note: string;
}

export interface DriverCareerData {
  kind: 'driver';
  driverId: string;
  teamId: string | null;
  category: Category | null;
  money: number;
  skillPoints: number;
  objective: string;
  objectiveTarget: number;
  status: 'active' | 'retired' | 'free-agent';
  seasonHistory: SeasonRecord[];
  interest: number;
  lastRoundPay: number;
}

export interface TeamCareerData {
  kind: 'team';
  teamId: string;
  category: Category;
  objective: string;
  objectiveTarget: number;
  status: 'active' | 'bankrupt';
  seasonHistory: SeasonRecord[];
  sponsorOffers: SponsorDeal[];
  freeAgentIds: string[];
  staffPool: StaffMember[];
  lastRoundIncome: number;
}

export type PlayerCareer = DriverCareerData | TeamCareerData;

export type RaceEventCode =
  | 'start'
  | 'pit'
  | 'dnf-mechanical'
  | 'dnf-crash'
  | 'dnf-fuel'
  | 'sc'
  | 'vsc'
  | 'sc-end'
  | 'rain-start'
  | 'rain-stop'
  | 'penalty'
  | 'overtake'
  | 'fastest-lap'
  | 'finish'
  | 'puncture'
  | 'battle'
  | 'off-track'
  | 'lapped';

export interface RaceEvent {
  lap: number;
  code: RaceEventCode;
  driverId?: string;
  targetId?: string;
  value?: number;
  compound?: Compound;
}

export type RaceFlag = 'green' | 'yellow' | 'sc' | 'vsc' | 'red' | 'chequered';

export interface CarState {
  driverId: string;
  teamId: string;
  slot: 0 | 1;
  isPlayer: boolean;
  compound: Compound;
  tyreLife: number;
  fuelLaps: number;
  fuelMode: -1 | 0 | 1;
  push: -1 | 0 | 1;
  totalTime: number;
  lapsDone: number;
  lastLap: number;
  bestLap: number;
  position: number;
  grid: number;
  pitStops: number;
  plannedStops: { lap: number; compound: Compound }[];
  status: 'running' | 'retired' | 'finished';
  dnfCode?: string;
  penalty: number;
  damage: number;
  startedFromPit: boolean;
}

export interface RaceState {
  category: Category;
  roundIndex: number;
  circuitId: string;
  season: number;
  pct: number;
  lapsTotal: number;
  lap: number;
  flag: RaceFlag;
  flagUntil: number;
  cars: CarState[];
  events: RaceEvent[];
  rngState: number;
  wetness: number;
  rainNext: number;
  temperature: number;
  fastestLap: { driverId: string; time: number } | null;
  safetyCars: number;
  finished: boolean;
  playerTeamId: string | null;
  playerDriverIds: string[];
  startWeather: string;
}

export interface WeekendState {
  roundIndex: number;
  pct: 25 | 50;
  qualifying: QualifyingResult | null;
  race: RaceState | null;
  setup: RaceSetup;
  /** Classification of the finished race, available before the weekend is confirmed. */
  result?: RaceResult | null;
}

export interface RaceSetup {
  compound: Compound;
  stops: number;
  aggression: 'conservative' | 'balanced' | 'aggressive';
  fuelMode: -1 | 0 | 1;
  fuelMargin: number;
  secondCompound: Compound;
}

export interface SaveGame {
  version: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  mode: 'driver' | 'team';
  world: World;
  player: PlayerCareer;
  news: NewsItem[];
  phase: 'season' | 'weekend' | 'offseason' | 'ended';
  weekend: WeekendState | null;
  offers: Offer[];
  seed: number;
}

export interface GlobalSettings {
  raceDistance: 25 | 50;
  autosave: boolean;
  simSpeed: number;
  showHints: boolean;
}
