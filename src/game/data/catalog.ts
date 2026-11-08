import type { CarSpec, Category, Circuit, Team } from '../types';

export type NameKind = 'driver' | 'team' | 'sponsor' | 'engine' | 'circuit' | 'competition' | 'tyre' | 'staff';

export interface NameEntry {
  id: string;
  value: string;
  kind: NameKind;
  ownerId: string;
}

export interface TeamDef {
  id: string;
  name: string;
  short: string;
  color: string;
  accent: string;
  category: Category;
  engineId: string;
  car: CarSpec;
  sponsorIds: string[];
  logo: string;
  reputation: number;
  budget: number;
}

export interface DriverDef {
  id: string;
  first: string;
  last: string;
  nat: string;
  age: number;
  number: number;
  teamId: string | null;
  skills: [number, number, number, number, number, number, number, number];
  potential: number;
  reputation: number;
}

export const CATEGORIES: Category[] = ['F3', 'F2', 'F1'];

export const CATEGORY_LABEL: Record<Category, string> = {
  F3: 'Formula 3',
  F2: 'Formula 2',
  F1: 'Formula 1',
};

export const CATEGORY_NAME_ID: Record<Category, string> = {
  F3: 'comp.f3',
  F2: 'comp.f2',
  F1: 'comp.f1',
};

export const SERIES_NAME_ID: Record<Category, string> = CATEGORY_NAME_ID;

export const CUP_NAME_ID: Record<Category, string> = {
  F3: 'comp.cup.f3',
  F2: 'comp.cup.f2',
  F1: 'comp.cup.f1',
};

/** Base lap times, tyre abrasion, overtaking ease, rain chance, pit lane loss. */
export const CIRCUITS: Circuit[] = [
  { id: 'sakhir', country: 'BH', baseLap: 91.5, fullLaps: 57, abrasion: 0.85, overtaking: 0.62, rainChance: 0.05, pitLoss: 21 },
  { id: 'jeddah', country: 'SA', baseLap: 89, fullLaps: 50, abrasion: 0.6, overtaking: 0.7, rainChance: 0.08, pitLoss: 20 },
  { id: 'melbourne', country: 'AU', baseLap: 80, fullLaps: 58, abrasion: 0.55, overtaking: 0.45, rainChance: 0.28, pitLoss: 19 },
  { id: 'suzuka', country: 'JP', baseLap: 90.5, fullLaps: 53, abrasion: 0.8, overtaking: 0.42, rainChance: 0.3, pitLoss: 21 },
  { id: 'shanghai', country: 'CN', baseLap: 93, fullLaps: 56, abrasion: 0.7, overtaking: 0.6, rainChance: 0.25, pitLoss: 22 },
  { id: 'imola', country: 'IT', baseLap: 76.5, fullLaps: 63, abrasion: 0.6, overtaking: 0.22, rainChance: 0.22, pitLoss: 20 },
  { id: 'monaco', country: 'MC', baseLap: 73, fullLaps: 78, abrasion: 0.3, overtaking: 0.05, rainChance: 0.18, pitLoss: 18 },
  { id: 'catalunya', country: 'ES', baseLap: 75, fullLaps: 66, abrasion: 0.85, overtaking: 0.35, rainChance: 0.12, pitLoss: 20 },
  { id: 'montreal', country: 'CA', baseLap: 73.5, fullLaps: 70, abrasion: 0.5, overtaking: 0.65, rainChance: 0.25, pitLoss: 18 },
  { id: 'spielberg', country: 'AT', baseLap: 66, fullLaps: 71, abrasion: 0.65, overtaking: 0.55, rainChance: 0.3, pitLoss: 19 },
  { id: 'silverstone', country: 'GB', baseLap: 87.5, fullLaps: 52, abrasion: 0.9, overtaking: 0.5, rainChance: 0.42, pitLoss: 20 },
  { id: 'spa', country: 'BE', baseLap: 104, fullLaps: 44, abrasion: 0.7, overtaking: 0.72, rainChance: 0.45, pitLoss: 20 },
  { id: 'hungaroring', country: 'HU', baseLap: 77, fullLaps: 70, abrasion: 0.75, overtaking: 0.28, rainChance: 0.2, pitLoss: 19 },
  { id: 'zandvoort', country: 'NL', baseLap: 71, fullLaps: 72, abrasion: 0.65, overtaking: 0.3, rainChance: 0.32, pitLoss: 19 },
  { id: 'monza', country: 'IT', baseLap: 81, fullLaps: 53, abrasion: 0.5, overtaking: 0.75, rainChance: 0.15, pitLoss: 21 },
  { id: 'baku', country: 'AZ', baseLap: 104, fullLaps: 51, abrasion: 0.45, overtaking: 0.9, rainChance: 0.1, pitLoss: 19 },
  { id: 'marinabay', country: 'SG', baseLap: 95, fullLaps: 62, abrasion: 0.8, overtaking: 0.25, rainChance: 0.35, pitLoss: 22 },
  { id: 'austin', country: 'US', baseLap: 96, fullLaps: 56, abrasion: 0.75, overtaking: 0.7, rainChance: 0.18, pitLoss: 20 },
  { id: 'mexico', country: 'MX', baseLap: 78, fullLaps: 71, abrasion: 0.55, overtaking: 0.65, rainChance: 0.15, pitLoss: 20 },
  { id: 'interlagos', country: 'BR', baseLap: 71, fullLaps: 71, abrasion: 0.7, overtaking: 0.7, rainChance: 0.5, pitLoss: 19 },
  { id: 'vegas', country: 'US', baseLap: 94, fullLaps: 50, abrasion: 0.4, overtaking: 0.85, rainChance: 0.04, pitLoss: 20 },
  { id: 'lusail', country: 'QA', baseLap: 83, fullLaps: 57, abrasion: 0.85, overtaking: 0.55, rainChance: 0.02, pitLoss: 21 },
  { id: 'yasmarina', country: 'AE', baseLap: 86, fullLaps: 58, abrasion: 0.5, overtaking: 0.6, rainChance: 0.02, pitLoss: 20 },
];

export const CIRCUIT_NAME_ID = (id: string) => `circuit.${id}`;
export const EVENT_NAME_ID = (id: string) => `comp.gp.${id}`;

/** Formula 1 calendar, in championship order. */
export const F1_CALENDAR = [
  'melbourne',
  'sakhir',
  'jeddah',
  'imola',
  'monaco',
  'catalunya',
  'montreal',
  'silverstone',
  'spa',
  'hungaroring',
  'zandvoort',
  'monza',
  'baku',
  'marinabay',
  'austin',
  'mexico',
  'interlagos',
  'vegas',
  'lusail',
  'yasmarina',
];

/** Formula 2 calendar. */
export const F2_CALENDAR = [
  'melbourne',
  'sakhir',
  'jeddah',
  'imola',
  'monaco',
  'catalunya',
  'spielberg',
  'silverstone',
  'spa',
  'hungaroring',
  'monza',
  'baku',
  'lusail',
  'yasmarina',
];

/** Formula 3 calendar. */
export const F3_CALENDAR = [
  'melbourne',
  'sakhir',
  'imola',
  'monaco',
  'catalunya',
  'spielberg',
  'silverstone',
  'spa',
  'hungaroring',
  'monza',
];

export const CATEGORY_CALENDARS: Record<Category, string[]> = {
  F1: F1_CALENDAR,
  F2: F2_CALENDAR,
  F3: F3_CALENDAR,
};

export const ENGINES: { id: string; name: string }[] = [
  { id: 'ferrar', name: 'Ferrar Power Unit' },
  { id: 'mercedez', name: 'Mercedez-AMG High Performance' },
  { id: 'hondaa', name: 'Hondaa RBPT' },
  { id: 'renult', name: 'Renult E-Tech' },
  { id: 'audii', name: 'Audii Motorsport' },
  { id: 'toyotaa', name: 'Toyotaa Racing Engines' },
  { id: 'mecacrome', name: 'Mecacrome V6 Turbo' },
  { id: 'autotecnica', name: 'Autotecnicaa' },
  { id: 'cosworthh', name: 'Cosworthh' },
];

export const SPONSORS: { id: string; name: string }[] = [
  { id: 'santandor', name: 'Santandor' },
  { id: 'petronaz', name: 'Petronaz' },
  { id: 'orakle', name: 'Orakle' },
  { id: 'bybiit', name: 'Bybiit' },
  { id: 'masterkard', name: 'Masterkard' },
  { id: 'lenovoo', name: 'Lenovoo' },
  { id: 'emiratess', name: 'Emiratess' },
  { id: 'qatarairwayz', name: 'Qatar Airwayz' },
  { id: 'aramko', name: 'Aramko' },
  { id: 'shel', name: 'Shel Motorsport' },
  { id: 'heinekenn', name: 'Heinekenn 0.0' },
  { id: 'rolexx', name: 'Rolexx' },
  { id: 'dhlexpres', name: 'DHL Expres' },
  { id: 'pirely', name: 'Pirely Motorsport' },
  { id: 'mobilon', name: 'Mobil On' },
  { id: 'vodafon', name: 'Vodafon' },
  { id: 'salesforc', name: 'Salesforc' },
  { id: 'kriptocom', name: 'Kripto.com' },
];

export const COMPETITIONS: { id: string; name: string }[] = [
  { id: 'comp.f1', name: 'Campionato Mondiale di Formula 1' },
  { id: 'comp.f2', name: 'Campionato Internazionale di Formula 2' },
  { id: 'comp.f3', name: 'Campionato Europeo di Formula 3' },
  { id: 'comp.cup.f1', name: 'Coppa Costruttori Formula 1' },
  { id: 'comp.cup.f2', name: 'Coppa Squadre Formula 2' },
  { id: 'comp.cup.f3', name: 'Coppa Squadre Formula 3' },
  { id: 'comp.rookie', name: 'Trofeo Rookie dell\'Anno' },
  { id: 'comp.free', name: 'Mercato dei Piloti' },
];

const car = (
  aero: number,
  engine: number,
  chassis: number,
  suspension: number,
  brakes: number,
  reliability: number
): CarSpec => ({ aero, engine, chassis, suspension, brakes, reliability });

export const TEAMS: TeamDef[] = [
  // ---------------- Formula 1 ----------------
  { id: 'mclare', name: 'McLare Racing', short: 'MCL', color: '#ff8000', accent: '#00d7b6', category: 'F1', engineId: 'mercedez', car: car(91, 88, 89, 88, 86, 91), sponsorIds: ['shel', 'mobilon', 'kriptocom'], logo: 'wing', reputation: 92, budget: 135_000_000 },
  { id: 'ferari', name: 'Scuderia Ferari', short: 'FER', color: '#dc0000', accent: '#fff200', category: 'F1', engineId: 'ferrar', car: car(88, 91, 87, 86, 85, 82), sponsorIds: ['santandor', 'shel', 'aramko'], logo: 'shield', reputation: 96, budget: 150_000_000 },
  { id: 'mercedez', name: 'Mercedez-AMG Petronaz', short: 'MER', color: '#00d2be', accent: '#c8cdd1', category: 'F1', engineId: 'mercedez', car: car(87, 89, 88, 87, 85, 89), sponsorIds: ['petronaz', 'emiratess', 'masterkard'], logo: 'star', reputation: 95, budget: 148_000_000 },
  { id: 'redbul', name: 'Red Bul Racing', short: 'RBR', color: '#1e41ff', accent: '#ffcf00', category: 'F1', engineId: 'hondaa', car: car(87, 86, 87, 84, 84, 80), sponsorIds: ['orakle', 'bybiit', 'heinekenn'], logo: 'bolt', reputation: 93, budget: 142_000_000 },
  { id: 'williames', name: 'Williames Racing', short: 'WIL', color: '#005aff', accent: '#00e0ff', category: 'F1', engineId: 'mercedez', car: car(78, 81, 79, 78, 77, 83), sponsorIds: ['santandor', 'dhlexpres', 'lenovoo'], logo: 'arrow', reputation: 72, budget: 95_000_000 },
  { id: 'astomartin', name: 'Asto Martin Aramco', short: 'AST', color: '#00665e', accent: '#b8e600', category: 'F1', engineId: 'hondaa', car: car(76, 77, 77, 75, 76, 80), sponsorIds: ['aramko', 'qatarairwayz', 'salesforc'], logo: 'wing', reputation: 74, budget: 110_000_000 },
  { id: 'haass', name: 'Haass F1 Team', short: 'HAS', color: '#e8e8e8', accent: '#cf0000', category: 'F1', engineId: 'ferrar', car: car(73, 72, 72, 71, 71, 85), sponsorIds: ['dhlexpres', 'pirely', 'mobilon'], logo: 'shield', reputation: 63, budget: 78_000_000 },
  { id: 'racingbullz', name: 'Racing Bullz', short: 'RCB', color: '#6692ff', accent: '#dc0000', category: 'F1', engineId: 'hondaa', car: car(72, 74, 73, 71, 71, 79), sponsorIds: ['orakle', 'bybiit', 'rolexx'], logo: 'bolt', reputation: 62, budget: 72_000_000 },
  { id: 'alpin', name: 'Alpin F1 Team', short: 'ALP', color: '#0090ff', accent: '#ff5ac8', category: 'F1', engineId: 'renult', car: car(70, 69, 70, 69, 68, 77), sponsorIds: ['vodafon', 'qatarairwayz', 'masterkard'], logo: 'ring', reputation: 66, budget: 85_000_000 },
  { id: 'saube', name: 'Kick Saube Motorsport', short: 'SAU', color: '#52e252', accent: '#0b0b0b', category: 'F1', engineId: 'ferrar', car: car(66, 66, 67, 65, 66, 74), sponsorIds: ['kriptocom', 'heinekenn', 'rolexx'], logo: 'ring', reputation: 55, budget: 65_000_000 },

  // ---------------- Formula 2 ----------------
  { id: 'prema2', name: 'Premma Racing', short: 'PRE', color: '#e10600', accent: '#1b1b1b', category: 'F2', engineId: 'mecacrome', car: car(63, 62, 63, 62, 62, 86), sponsorIds: ['pirely', 'shel'], logo: 'shield', reputation: 80, budget: 12_000_000 },
  { id: 'carlin2', name: 'Carlinn Motorsport', short: 'CAR', color: '#2f6bff', accent: '#ffffff', category: 'F2', engineId: 'mecacrome', car: car(61, 61, 61, 61, 61, 84), sponsorIds: ['pirely', 'dhlexpres'], logo: 'ring', reputation: 68, budget: 10_000_000 },
  { id: 'art2', name: 'ARTT Grand Prix', short: 'ART', color: '#ff2d55', accent: '#111111', category: 'F2', engineId: 'mecacrome', car: car(63, 62, 63, 63, 62, 85), sponsorIds: ['santandor', 'pirely'], logo: 'star', reputation: 81, budget: 12_500_000 },
  { id: 'campos2', name: 'Campoz Racing', short: 'CAM', color: '#f5c400', accent: '#1a1a1a', category: 'F2', engineId: 'mecacrome', car: car(60, 60, 60, 60, 60, 82), sponsorIds: ['pirely', 'orakle'], logo: 'wing', reputation: 62, budget: 9_000_000 },
  { id: 'damss2', name: 'DAMSS Lucas Oil', short: 'DAM', color: '#003a8c', accent: '#ffd200', category: 'F2', engineId: 'mecacrome', car: car(61, 61, 62, 61, 61, 85), sponsorIds: ['mobilon', 'pirely'], logo: 'shield', reputation: 70, budget: 10_500_000 },
  { id: 'hitech2', name: 'Hitechh Pulse', short: 'HIT', color: '#00b0f0', accent: '#ffffff', category: 'F2', engineId: 'mecacrome', car: car(62, 62, 61, 61, 61, 84), sponsorIds: ['pirely', 'lenovoo'], logo: 'arrow', reputation: 67, budget: 10_000_000 },
  { id: 'invicta2', name: 'Invikta Racing', short: 'INV', color: '#7a1fff', accent: '#00ffb2', category: 'F2', engineId: 'mecacrome', car: car(60, 60, 61, 60, 60, 81), sponsorIds: ['pirely', 'bybiit'], logo: 'bolt', reputation: 58, budget: 8_500_000 },
  { id: 'mpm2', name: 'MP Motorsportt', short: 'MPM', color: '#ff6a00', accent: '#1b1b1b', category: 'F2', engineId: 'mecacrome', car: car(62, 61, 62, 62, 61, 86), sponsorIds: ['pirely', 'kriptocom'], logo: 'ring', reputation: 72, budget: 10_500_000 },
  { id: 'rodin2', name: 'Rodinn Motorsport', short: 'ROD', color: '#c40022', accent: '#ffffff', category: 'F2', engineId: 'mecacrome', car: car(59, 60, 60, 60, 60, 83), sponsorIds: ['pirely', 'salesforc'], logo: 'star', reputation: 58, budget: 8_500_000 },
  { id: 'trident2', name: 'Tridentt Motorsport', short: 'TRI', color: '#0072ce', accent: '#ff2d55', category: 'F2', engineId: 'mecacrome', car: car(61, 61, 61, 61, 61, 84), sponsorIds: ['pirely', 'vodafon'], logo: 'wing', reputation: 66, budget: 9_500_000 },
  { id: 'var2', name: 'Van Amersfort Racing', short: 'VAR', color: '#ff7a00', accent: '#003a8c', category: 'F2', engineId: 'mecacrome', car: car(59, 59, 60, 59, 59, 82), sponsorIds: ['pirely', 'heinekenn'], logo: 'arrow', reputation: 55, budget: 8_000_000 },

  // ---------------- Formula 3 ----------------
  { id: 'prema3', name: 'Premma Racing', short: 'PRE', color: '#e10600', accent: '#1b1b1b', category: 'F3', engineId: 'autotecnica', car: car(53, 52, 53, 52, 52, 86), sponsorIds: ['pirely'], logo: 'shield', reputation: 78, budget: 3_800_000 },
  { id: 'trident3', name: 'Tridentt Motorsport', short: 'TRI', color: '#0072ce', accent: '#ff2d55', category: 'F3', engineId: 'autotecnica', car: car(53, 52, 52, 53, 52, 85), sponsorIds: ['pirely'], logo: 'wing', reputation: 72, budget: 3_500_000 },
  { id: 'art3', name: 'ARTT Grand Prix', short: 'ART', color: '#ff2d55', accent: '#111111', category: 'F3', engineId: 'autotecnica', car: car(54, 53, 53, 53, 53, 85), sponsorIds: ['pirely'], logo: 'star', reputation: 79, budget: 4_000_000 },
  { id: 'campos3', name: 'Campoz Racing', short: 'CAM', color: '#f5c400', accent: '#1a1a1a', category: 'F3', engineId: 'autotecnica', car: car(51, 51, 51, 51, 51, 83), sponsorIds: ['pirely'], logo: 'wing', reputation: 60, budget: 3_000_000 },
  { id: 'hitech3', name: 'Hitechh Pulse', short: 'HIT', color: '#00b0f0', accent: '#ffffff', category: 'F3', engineId: 'autotecnica', car: car(52, 52, 52, 52, 52, 84), sponsorIds: ['pirely'], logo: 'arrow', reputation: 65, budget: 3_200_000 },
  { id: 'mpm3', name: 'MP Motorsportt', short: 'MPM', color: '#ff6a00', accent: '#1b1b1b', category: 'F3', engineId: 'autotecnica', car: car(52, 51, 52, 52, 51, 85), sponsorIds: ['pirely'], logo: 'ring', reputation: 68, budget: 3_300_000 },
  { id: 'var3', name: 'Van Amersfort Racing', short: 'VAR', color: '#ff7a00', accent: '#003a8c', category: 'F3', engineId: 'autotecnica', car: car(50, 50, 50, 50, 50, 82), sponsorIds: ['pirely'], logo: 'arrow', reputation: 54, budget: 2_700_000 },
  { id: 'carlin3', name: 'Carlinn Motorsport', short: 'CAR', color: '#2f6bff', accent: '#ffffff', category: 'F3', engineId: 'autotecnica', car: car(51, 51, 51, 51, 51, 84), sponsorIds: ['pirely'], logo: 'ring', reputation: 61, budget: 3_000_000 },
  { id: 'jenzar', name: 'Jenzar Motorsport', short: 'JEN', color: '#22c55e', accent: '#111111', category: 'F3', engineId: 'autotecnica', car: car(49, 49, 49, 49, 49, 80), sponsorIds: ['pirely'], logo: 'star', reputation: 46, budget: 2_400_000 },
  { id: 'rodin3', name: 'Rodinn Motorsport', short: 'ROD', color: '#c40022', accent: '#ffffff', category: 'F3', engineId: 'autotecnica', car: car(50, 50, 50, 50, 50, 83), sponsorIds: ['pirely'], logo: 'star', reputation: 55, budget: 2_800_000 },
  { id: 'aix', name: 'AIXX Racing', short: 'AIX', color: '#8b5cf6', accent: '#facc15', category: 'F3', engineId: 'autotecnica', car: car(48, 48, 48, 48, 48, 79), sponsorIds: ['pirely'], logo: 'bolt', reputation: 42, budget: 2_200_000 },
];

const d = (
  id: string,
  first: string,
  last: string,
  nat: string,
  age: number,
  number: number,
  teamId: string | null,
  skills: [number, number, number, number, number, number, number, number],
  potential: number,
  reputation: number
): DriverDef => ({ id, first, last, nat, age, number, teamId, skills, potential, reputation });

export const DRIVERS: DriverDef[] = [
  // ---------------- Formula 1 ----------------
  d('ver', 'Max', 'Verstapen', 'NL', 28, 1, 'redbul', [97, 88, 86, 96, 91, 88, 95, 96], 97, 98),
  d('tsu', 'Yuki', 'Tsunod', 'JP', 25, 22, 'redbul', [79, 78, 78, 80, 78, 78, 80, 81], 85, 63),
  d('nor', 'Lando', 'Noris', 'GB', 26, 4, 'mclare', [92, 86, 84, 90, 84, 85, 88, 92], 94, 90),
  d('pia', 'Oscar', 'Piastry', 'AU', 25, 81, 'mclare', [91, 88, 85, 88, 85, 89, 86, 91], 95, 88),
  d('lec', 'Charles', 'Leclerq', 'MC', 28, 16, 'ferari', [93, 88, 86, 89, 85, 87, 87, 94], 94, 92),
  d('ham', 'Lewis', 'Hamilto', 'GB', 41, 44, 'ferari', [88, 92, 90, 88, 88, 90, 93, 88], 90, 97),
  d('rus', 'George', 'Russel', 'GB', 28, 63, 'mercedez', [90, 87, 86, 87, 86, 88, 86, 90], 93, 87),
  d('ant', 'Andrea Kimi', 'Antoneli', 'IT', 19, 12, 'mercedez', [82, 78, 78, 82, 78, 80, 80, 83], 94, 64),
  d('alo', 'Fernando', 'Alonsso', 'ES', 44, 14, 'astomartin', [86, 90, 91, 82, 90, 90, 92, 84], 87, 96),
  d('str', 'Lance', 'Strol', 'CA', 27, 18, 'astomartin', [74, 76, 78, 72, 74, 76, 76, 75], 80, 55),
  d('gas', 'Pierre', 'Gasli', 'FR', 30, 10, 'alpin', [81, 80, 80, 82, 80, 80, 82, 82], 86, 68),
  d('doo', 'Jack', 'Dohan', 'AU', 23, 7, 'alpin', [70, 70, 72, 72, 70, 72, 72, 71], 84, 50),
  d('alb', 'Alex', 'Albom', 'TH', 29, 23, 'williames', [82, 82, 82, 82, 82, 84, 80, 83], 87, 70),
  d('sai', 'Carlos', 'Sainzz', 'ES', 31, 55, 'williames', [86, 86, 86, 84, 86, 87, 85, 86], 89, 84),
  d('oco', 'Esteban', 'Oconn', 'FR', 29, 31, 'haass', [78, 80, 80, 80, 82, 82, 78, 79], 83, 62),
  d('bea', 'Oliver', 'Bearmann', 'GB', 20, 87, 'haass', [80, 78, 78, 80, 78, 78, 78, 82], 90, 60),
  d('law', 'Liam', 'Lawso', 'NZ', 24, 30, 'racingbullz', [76, 74, 76, 78, 74, 76, 76, 78], 85, 55),
  d('had', 'Isack', 'Hadjar', 'FR', 21, 6, 'racingbullz', [77, 76, 76, 78, 75, 75, 77, 78], 88, 54),
  d('hul', 'Nico', 'Hulkenber', 'DE', 38, 27, 'saube', [80, 82, 84, 78, 80, 84, 78, 80], 82, 66),
  d('bor', 'Gabriel', 'Bortolett', 'BR', 21, 5, 'saube', [76, 74, 74, 78, 74, 74, 76, 78], 89, 53),

  // ---------------- Formula 2 ----------------
  d('cra', 'Jak', 'Crawfor', 'GB', 20, 2, 'prema2', [72, 70, 70, 72, 70, 70, 69, 73], 88, 40),
  d('beg', 'Dino', 'Beganovich', 'IT', 20, 3, 'prema2', [71, 70, 70, 71, 69, 71, 70, 72], 87, 38),
  d('bro', 'Luke', 'Brownin', 'GB', 21, 4, 'carlin2', [67, 66, 66, 68, 66, 66, 66, 68], 82, 30),
  d('dun', 'Alex', 'Dunnee', 'IE', 22, 5, 'carlin2', [66, 66, 66, 66, 66, 67, 66, 66], 80, 28),
  d('mar', 'Victor', 'Martinss', 'FR', 24, 6, 'art2', [71, 70, 70, 72, 70, 71, 70, 72], 84, 41),
  d('min', 'Gabriele', 'Mini', 'IT', 20, 7, 'art2', [70, 69, 69, 71, 69, 69, 69, 71], 86, 37),
  d('goe', 'Oliver', 'Goeth', 'DE', 21, 8, 'campos2', [68, 68, 68, 69, 68, 68, 68, 69], 82, 33),
  d('meg', 'Sami', 'Meguetounif', 'FR', 21, 9, 'campos2', [66, 66, 66, 67, 66, 66, 66, 67], 81, 29),
  d('verr', 'Richard', 'Verschoor', 'NL', 25, 10, 'damss2', [70, 70, 70, 70, 70, 71, 70, 70], 76, 36),
  d('cor', 'Amaury', 'Cordel', 'FR', 21, 11, 'damss2', [67, 66, 66, 67, 66, 66, 66, 67], 80, 28),
  d('lin', 'Arvid', 'Lindblat', 'GB', 18, 12, 'hitech2', [70, 68, 68, 70, 68, 68, 69, 71], 90, 35),
  d('dur', 'Josh', 'Durksen', 'DE', 21, 13, 'hitech2', [66, 66, 66, 67, 66, 67, 66, 66], 79, 27),
  d('mart', 'Pepe', 'Marti', 'ES', 20, 14, 'invicta2', [67, 67, 67, 67, 67, 68, 67, 68], 81, 30),
  d('vill', 'Rafael', 'Villagommez', 'MX', 20, 15, 'invicta2', [65, 65, 65, 65, 65, 65, 65, 65], 79, 25),
  d('miy', 'Ritomo', 'Miyatta', 'JP', 26, 16, 'mpm2', [68, 68, 68, 68, 68, 69, 68, 69], 74, 32),
  d('mai', 'Kush', 'Mainii', 'IN', 22, 17, 'mpm2', [68, 67, 67, 68, 67, 68, 67, 68], 80, 31),
  d('mal', 'Zane', 'Malony', 'NZ', 21, 18, 'rodin2', [68, 67, 67, 68, 67, 67, 67, 68], 81, 30),
  d('shi', 'Cian', 'Shield', 'IE', 21, 19, 'rodin2', [65, 65, 65, 65, 65, 66, 65, 65], 78, 24),
  d('est', 'Max', 'Esterson', 'US', 22, 20, 'trident2', [66, 65, 65, 66, 65, 66, 65, 66], 78, 26),
  d('ben', 'John', 'Bennett', 'GB', 22, 21, 'trident2', [65, 65, 65, 65, 65, 65, 65, 65], 77, 23),
  d('hau', 'Dennis', 'Haugerr', 'NO', 26, 22, 'var2', [70, 70, 70, 70, 70, 71, 70, 70], 75, 38),
  d('nov', 'Clement', 'Novalak', 'FR', 26, 23, 'var2', [66, 66, 66, 66, 66, 67, 66, 66], 72, 27),

  // ---------------- Formula 3 ----------------
  d('cam', 'Rafael', 'Camaraa', 'BR', 20, 1, 'prema3', [68, 66, 66, 68, 66, 66, 66, 69], 88, 32),
  d('leo', 'Noel', 'Leone', 'MX', 21, 2, 'prema3', [64, 64, 64, 65, 64, 64, 64, 65], 82, 26),
  d('wu', 'Charlie', 'Wurtz', 'DE', 19, 3, 'trident3', [66, 64, 64, 66, 64, 64, 64, 67], 87, 28),
  d('boy', 'Mari', 'Boyaa', 'ES', 21, 4, 'trident3', [63, 63, 63, 64, 63, 63, 63, 64], 80, 24),
  d('int', 'Tasanapol', 'Inthraphuvasak', 'TH', 21, 5, 'art3', [63, 62, 62, 63, 62, 63, 62, 63], 79, 22),
  d('tap', 'Tuukka', 'Taponenn', 'FI', 20, 6, 'art3', [66, 65, 65, 66, 65, 65, 65, 66], 84, 27),
  d('voi', 'Callum', 'Voisinn', 'GB', 21, 7, 'campos3', [63, 63, 63, 63, 63, 64, 63, 63], 80, 23),
  d('hoe', 'Laurens', 'van Hoepenn', 'NL', 21, 8, 'campos3', [64, 63, 63, 64, 63, 63, 63, 65], 82, 25),
  d('zag', 'Matias', 'Zagazeta', 'PE', 22, 9, 'hitech3', [62, 62, 62, 62, 62, 63, 62, 62], 77, 21),
  d('ram', 'Santiago', 'Ramos', 'BR', 21, 10, 'hitech3', [64, 63, 63, 64, 63, 63, 63, 64], 81, 24),
  d('tra', 'Tim', 'Tramnitz', 'DE', 22, 11, 'mpm3', [64, 63, 63, 64, 63, 64, 63, 64], 80, 24),
  d('giu', 'Alessandro', 'Giustii', 'IT', 21, 12, 'mpm3', [62, 62, 62, 62, 62, 62, 62, 63], 78, 21),
  d('bed', 'Nikita', 'Bedrin', 'IL', 21, 13, 'var3', [63, 62, 62, 63, 62, 63, 62, 63], 79, 22),
  d('ugo', 'Ugo', 'Ugochukwu', 'US', 18, 14, 'var3', [64, 63, 63, 64, 63, 63, 63, 64], 86, 25),
  d('nae', 'Theo', 'Nael', 'FR', 20, 15, 'carlin3', [64, 63, 63, 64, 63, 63, 63, 65], 84, 26),
  d('sag', 'Javier', 'Sagrera', 'ES', 22, 16, 'carlin3', [61, 61, 61, 61, 61, 62, 61, 61], 76, 20),
  d('man', 'Christian', 'Mansello', 'AU', 22, 17, 'jenzar', [62, 62, 62, 62, 62, 63, 62, 62], 77, 21),
  d('flo', 'Sophia', 'Florsch', 'DE', 25, 18, 'jenzar', [60, 60, 60, 60, 60, 61, 60, 60], 72, 22),
  d('guv', 'Maxi', 'Guven', 'TR', 21, 19, 'rodin3', [62, 61, 61, 62, 61, 62, 61, 62], 78, 21),
  d('sha', 'Louis', 'Sharp', 'GB', 19, 20, 'rodin3', [61, 61, 61, 61, 61, 61, 61, 62], 80, 20),
  d('sto', 'Roman', 'Stolcerman', 'CZ', 20, 21, 'aix', [59, 59, 59, 59, 59, 60, 59, 59], 75, 18),
  d('bra', 'Emerson', 'Bradyy', 'US', 19, 22, 'aix', [58, 58, 58, 59, 58, 58, 58, 59], 74, 17),
];

export const TYRES: { id: string; name: string; color: string }[] = [
  { id: 'soft', name: 'Morbida', color: '#ff2d55' },
  { id: 'medium', name: 'Media', color: '#ffd200' },
  { id: 'hard', name: 'Dura', color: '#f5f5f5' },
  { id: 'inter', name: 'Intermedia', color: '#22c55e' },
  { id: 'wet', name: 'Bagnata', color: '#2f6bff' },
];

export const STAFF_ROLE_LABEL: Record<string, string> = {
  technical: 'Direttore Tecnico',
  aero: 'Capo Aerodinamico',
  engine: 'Capo Motorista',
  race: 'Ingegnere di Pista',
};

export const TEAM_LOGOS = ['wing', 'ring', 'bolt', 'shield', 'star', 'arrow'];

/** All editable names of the game, in the order shown by the name editor. */
export function buildNameEntries(): NameEntry[] {
  const entries: NameEntry[] = [];
  for (const driver of DRIVERS) {
    entries.push({ id: `drv.${driver.id}.first`, value: driver.first, kind: 'driver', ownerId: driver.id });
    entries.push({ id: `drv.${driver.id}.last`, value: driver.last, kind: 'driver', ownerId: driver.id });
  }
  for (const team of TEAMS) {
    entries.push({ id: `team.${team.id}.name`, value: team.name, kind: 'team', ownerId: team.id });
    entries.push({ id: `team.${team.id}.short`, value: team.short, kind: 'team', ownerId: team.id });
  }
  for (const sponsor of SPONSORS) entries.push({ id: `sponsor.${sponsor.id}`, value: sponsor.name, kind: 'sponsor', ownerId: sponsor.id });
  for (const engine of ENGINES) entries.push({ id: `engine.${engine.id}`, value: engine.name, kind: 'engine', ownerId: engine.id });
  for (const circuit of CIRCUITS) {
    entries.push({ id: CIRCUIT_NAME_ID(circuit.id), value: circuitName(circuit.id), kind: 'circuit', ownerId: circuit.id });
    entries.push({ id: EVENT_NAME_ID(circuit.id), value: eventName(circuit.id), kind: 'competition', ownerId: circuit.id });
  }
  for (const competition of COMPETITIONS) entries.push({ id: competition.id, value: competition.name, kind: 'competition', ownerId: competition.id });
  for (const tyre of TYRES) entries.push({ id: `tyre.${tyre.id}`, value: tyre.name, kind: 'tyre', ownerId: tyre.id });
  return entries;
}

const CIRCUIT_NAMES: Record<string, string> = {
  sakhir: 'Circuito di Sakhiir',
  jeddah: 'Circuito di Jedda',
  melbourne: 'Albert Park',
  suzuka: 'Suzukka',
  shanghai: 'Shangai International',
  imola: 'Autodromo di Imolla',
  monaco: 'Monako',
  catalunya: 'Barcelonna-Catalunya',
  montreal: 'Circuit Montreall',
  spielberg: 'Anello di Spielburg',
  silverstone: 'Silverstoun',
  spa: 'Spa-Francorchams',
  hungaroring: 'Hungaroringg',
  zandvoort: 'Zandvoord',
  monza: 'Autodromo di Monzo',
  baku: 'Bakuu City',
  marinabay: 'Marina Bay',
  austin: 'Circuito delle Americhe',
  mexico: 'Hermanos Rodrighez',
  interlagos: 'Interlagoss',
  vegas: 'Las Vegaz Strip',
  lusail: 'Lusail',
  yasmarina: 'Yas Marina',
};

const CIRCUIT_COUNTRY_NAME: Record<string, string> = {
  sakhir: 'Bahrein',
  jeddah: 'Arabia Saudita',
  melbourne: 'Australia',
  suzuka: 'Giappone',
  shanghai: 'Cina',
  imola: 'Emilia-Romagna',
  monaco: 'Monaco',
  catalunya: 'Spagna',
  montreal: 'Canada',
  spielberg: 'Austria',
  silverstone: 'Gran Bretagna',
  spa: 'Belgio',
  hungaroring: 'Ungheria',
  zandvoort: 'Paesi Bassi',
  monza: 'Italia',
  baku: 'Azerbaigian',
  marinabay: 'Singapore',
  austin: 'Stati Uniti',
  mexico: 'Messico',
  interlagos: 'Brasile',
  vegas: 'Stati Uniti',
  lusail: 'Qatar',
  yasmarina: 'Emirati Arabi Uniti',
};

export function circuitName(id: string): string {
  return CIRCUIT_NAMES[id] ?? id;
}

export function circuitCountry(id: string): string {
  return CIRCUIT_COUNTRY_NAME[id] ?? '';
}

export function eventName(id: string): string {
  return `Gran Premio di ${circuitCountry(id)}`;
}

export const NAME_ENTRIES: NameEntry[] = buildNameEntries();

export const DRIVER_TEAM_MAP: Record<string, string> = Object.fromEntries(
  DRIVERS.filter((x) => x.teamId).map((x) => [x.id, x.teamId as string])
);

export function teamDefById(id: string): TeamDef {
  const t = TEAMS.find((x) => x.id === id);
  if (!t) throw new Error(`Team ${id} not found`);
  return t;
}

export function driversOfTeam(teamId: string): DriverDef[] {
  return DRIVERS.filter((x) => x.teamId === teamId);
}

export function categoryTeams(category: Category): TeamDef[] {
  return TEAMS.filter((t: TeamDef) => t.category === category);
}
