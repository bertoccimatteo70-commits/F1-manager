import { NAME_ENTRIES, type NameEntry, type NameKind } from '../data/catalog';

const STORAGE_KEY = 'f1cs.names.v1';

const BASE: Record<string, string> = Object.fromEntries(NAME_ENTRIES.map((e) => [e.id, e.value]));

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

let overrides: Record<string, string> = loadOverrides();
let version = 0;
const listeners = new Set<() => void>();

function persist() {
  try {
    if (Object.keys(overrides).length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* storage unavailable: overrides stay for this session */
  }
}

function emit() {
  version += 1;
  for (const fn of listeners) fn();
}

export function subscribeNames(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function nameVersion(): number {
  return version;
}

export function t(id: string): string {
  const override = overrides[id];
  if (override && override.trim()) return override.trim();
  return BASE[id] ?? id;
}

export function baseName(id: string): string {
  return BASE[id] ?? id;
}

export function isOverridden(id: string): boolean {
  return Boolean(overrides[id]);
}

export function setName(id: string, value: string): void {
  const trimmed = value.trim();
  if (!trimmed || trimmed === BASE[id]) {
    if (overrides[id] !== undefined) {
      delete overrides[id];
      persist();
      emit();
    }
    return;
  }
  if (overrides[id] === trimmed) return;
  overrides[id] = trimmed;
  persist();
  emit();
}

export function resetName(id: string): void {
  if (overrides[id] === undefined) return;
  delete overrides[id];
  persist();
  emit();
}

export function resetAllNames(kind?: NameKind): void {
  if (!kind) {
    overrides = {};
  } else {
    const ids = new Set(NAME_ENTRIES.filter((e) => e.kind === kind).map((e) => e.id));
    overrides = Object.fromEntries(Object.entries(overrides).filter(([k]) => !ids.has(k)));
  }
  persist();
  emit();
}

export function getOverrides(): Record<string, string> {
  return { ...overrides };
}

export function overrideCount(): number {
  return Object.keys(overrides).length;
}

export function nameEntries(): NameEntry[] {
  return NAME_ENTRIES;
}

export function driverNameById(firstId: string, lastId: string): string {
  return `${t(firstId)} ${t(lastId)}`;
}

export function driverInitials(firstId: string, lastId: string): string {
  return `${t(firstId).charAt(0)}${t(lastId).charAt(0)}`.toUpperCase();
}

export const NAME_KIND_LABEL: Record<NameKind, string> = {
  driver: 'Piloti',
  team: 'Scuderie',
  sponsor: 'Sponsor',
  engine: 'Motori e fornitori',
  circuit: 'Circuiti',
  competition: 'Competizioni',
  tyre: 'Pneumatici',
  staff: 'Personale',
};
