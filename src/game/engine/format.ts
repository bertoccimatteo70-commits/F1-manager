import type { Category, RaceEvent } from '../types';
import { t } from '../names/registry';

export const POINTS: Record<Category, number[]> = {
  F1: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  F2: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  F3: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
};

export const POLE_POINTS: Record<Category, number> = { F1: 0, F2: 2, F3: 2 };
export const FASTEST_LAP_POINTS: Record<Category, number> = { F1: 1, F2: 1, F3: 1 };

export function pointsFor(category: Category, position: number): number {
  return POINTS[category][position - 1] ?? 0;
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)} Mln €`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} K €`;
  return `${sign}${Math.round(abs)} €`;
}

export function formatLap(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${minutes}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function formatGap(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds <= 0) return '—';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `+${m}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
  }
  return `+${seconds.toFixed(3)}`;
}

export function formatDelta(seconds: number): string {
  if (seconds === 0) return '—';
  return `${seconds > 0 ? '+' : ''}${seconds.toFixed(3)}`;
}

const COUNTRY_FLAG: Record<string, string> = {
  NL: '🇳🇱', GB: '🇬🇧', IT: '🇮🇹', ES: '🇪🇸', FR: '🇫🇷', DE: '🇩🇪', BR: '🇧🇷', AR: '🇦🇷',
  AU: '🇦🇺', JP: '🇯🇵', CA: '🇨🇦', TH: '🇹🇭', DK: '🇩🇰', US: '🇺🇸', MX: '🇲🇽', FI: '🇫🇮',
  NZ: '🇳🇿', CH: '🇨🇭', BE: '🇧🇪', CO: '🇨🇴', SE: '🇸🇪', NO: '🇳🇴', IL: '🇮🇱', IE: '🇮🇪',
  PT: '🇵🇹', IN: '🇮🇳', PE: '🇵🇪', CZ: '🇨🇿', TR: '🇹🇷', MC: '🇲🇨', BH: '🇧🇭', SA: '🇸🇦',
  CN: '🇨🇳', AZ: '🇦🇿', SG: '🇸🇬', QA: '🇶🇦', AE: '🇦🇪', HU: '🇭🇺', AT: '🇦🇹',
};

export function countryFlag(iso: string): string {
  return COUNTRY_FLAG[iso] ?? '🏁';
}

const NAT_NAMES: Record<string, string> = {
  NL: 'Olanda', GB: 'Gran Bretagna', IT: 'Italia', ES: 'Spagna', FR: 'Francia', DE: 'Germania',
  BR: 'Brasile', AR: 'Argentina', AU: 'Australia', JP: 'Giappone', CA: 'Canada', TH: 'Thailandia',
  DK: 'Danimarca', US: 'Stati Uniti', MX: 'Messico', FI: 'Finlandia', NZ: 'Nuova Zelanda',
  CH: 'Svizzera', BE: 'Belgio', CO: 'Colombia', SE: 'Svezia', NO: 'Norvegia', IL: 'Israele',
  IE: 'Irlanda', PT: 'Portogallo', IN: 'India', PE: 'Perù', CZ: 'Rep. Ceca', TR: 'Turchia', MC: 'Monaco',
};

export function countryName(iso: string): string {
  return NAT_NAMES[iso] ?? iso;
}

export const NATIONALITIES = Object.keys(NAT_NAMES);

export const COMPOUND_COLOR: Record<string, string> = {
  soft: '#ff2d55',
  medium: '#ffd200',
  hard: '#f0f0f0',
  inter: '#22c55e',
  wet: '#2f6bff',
};

/** Renders a simulation event with live names (so the name editor applies to old races too). */
export function describeEvent(event: RaceEvent, nameOf: (driverId: string) => string): string {
  const who = event.driverId ? nameOf(event.driverId) : '';
  const target = event.targetId ? nameOf(event.targetId) : '';
  switch (event.code) {
    case 'start':
      return 'Semáforo verde: la gara è iniziata.';
    case 'pit':
      return `${who} ai box: monta gomme ${t(`tyre.${event.compound ?? 'medium'}`)}.`;
    case 'dnf-mechanical':
      return `Guasto meccanico per ${who}: ritirato.`;
    case 'dnf-crash':
      return `Incidente per ${who}: gara finita.`;
    case 'dnf-fuel':
      return `${who} resta senza carburante e si ritira.`;
    case 'sc':
      return 'Safety Car in pista: il gruppo si compatta.';
    case 'vsc':
      return 'Virtual Safety Car: velocità ridotta in pista.';
    case 'sc-end':
      return 'La Safety Car rientra: si torna a correre.';
    case 'rain-start':
      return 'Inizia a piovere: pista bagnata.';
    case 'rain-stop':
      return 'La pioggia si ferma, la pista si asciuga.';
    case 'penalty':
      return `${who} riceve ${event.value ?? 5} secondi di penalità.`;
    case 'overtake':
      return `${who} supera ${target} per la P${event.value ?? ''}.`;
    case 'fastest-lap':
      return `Giro veloce di ${who}.`;
    case 'finish':
      return 'Bandiera a scacchi.';
    case 'puncture':
      return `Foratura per ${who}: gomma da cambiare.`;
    case 'battle':
      return `${who} attacca ${target}.`;
    case 'off-track':
      return `${who} va lungo e perde tempo.`;
    case 'lapped':
      return `${who} viene doppiato.`;
    default:
      return '';
  }
}

export function ordinal(position: number): string {
  return `P${position}`;
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case 'season': return 'Stagione in corso';
    case 'weekend': return 'Weekend di gara';
    case 'offseason': return 'Mercato e trattative';
    case 'ended': return 'Carriera conclusa';
    default: return phase;
  }
}
