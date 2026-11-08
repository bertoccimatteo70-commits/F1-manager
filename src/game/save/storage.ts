import type { Category, GlobalSettings, SaveGame } from '../types';

const INDEX_KEY = 'f1cs.saves.v1';
const SAVE_PREFIX = 'f1cs.save.';
const SETTINGS_KEY = 'f1cs.settings.v1';

export interface SaveMeta {
  id: string;
  name: string;
  mode: 'driver' | 'team';
  season: number;
  category: Category | null;
  driverId: string | null;
  teamId: string | null;
  updatedAt: number;
  phase: SaveGame['phase'];
  teamLabel: string;
}

const memory = new Map<string, string>();
let memoryIndex: string | null = null;

function readRaw(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* fall through to memory */
  }
  return memory.get(key) ?? null;
}

function writeRaw(key: string, value: string): boolean {
  // The in-memory copy is the source of truth for this session; localStorage is
  // the durable copy. Saving succeeds even when the browser blocks storage.
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: data stays available for the current session */
  }
  return true;
}

function removeRaw(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function listSaveMeta(): SaveMeta[] {
  const raw = readRaw(INDEX_KEY) ?? memoryIndex;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SaveMeta[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeIndex(meta: SaveMeta[]): void {
  const raw = JSON.stringify(meta);
  memoryIndex = raw;
  writeRaw(INDEX_KEY, raw);
}

export function saveGame(save: SaveGame): boolean {
  const stamped: SaveGame = { ...save, updatedAt: Date.now() };
  const ok = writeRaw(SAVE_PREFIX + save.id, JSON.stringify(stamped));
  const meta = listSaveMeta().filter((m) => m.id !== save.id);
  meta.push(toMeta(stamped));
  writeIndex(meta);
  return ok;
}

export function toMeta(save: SaveGame): SaveMeta {
  if (save.player.kind === 'driver') {
    const driver = save.world.drivers[save.player.driverId];
    return {
      id: save.id,
      name: save.name,
      mode: save.mode,
      season: save.world.season,
      category: save.player.category,
      driverId: save.player.driverId,
      teamId: save.player.teamId,
      updatedAt: save.updatedAt,
      phase: save.phase,
      teamLabel: driver ? `${driver.firstId} ${driver.lastId}` : '',
    };
  }
  const team = save.world.teams[save.player.teamId];
  return {
    id: save.id,
    name: save.name,
    mode: save.mode,
    season: save.world.season,
    category: save.player.category,
    driverId: null,
    teamId: save.player.teamId,
    updatedAt: save.updatedAt,
    phase: save.phase,
    teamLabel: team?.nameId ?? '',
  };
}

export function loadGame(id: string): SaveGame | null {
  const raw = readRaw(SAVE_PREFIX + id);
  if (!raw) return null;
  try {
    const save = JSON.parse(raw) as SaveGame;
    if (!save || !save.world || !save.player) return null;
    return save;
  } catch {
    return null;
  }
}

export function deleteSave(id: string): void {
  removeRaw(SAVE_PREFIX + id);
  writeIndex(listSaveMeta().filter((m) => m.id !== id));
}

export function renameSave(id: string, name: string): void {
  const save = loadGame(id);
  if (!save) return;
  save.name = name.trim() || save.name;
  saveGame(save);
}

export function storageAvailable(): boolean {
  try {
    const probe = '__f1cs_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  raceDistance: 25,
  autosave: true,
  simSpeed: 400,
  showHints: true,
  theme: 'dark',
  density: 'comfortable',
  animations: true,
  sound: true,
  difficulty: 'normal',
};

export function loadSettings(): GlobalSettings {
  const raw = readRaw(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GlobalSettings): void {
  writeRaw(SETTINGS_KEY, JSON.stringify(settings));
}
