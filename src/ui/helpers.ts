import { useSyncExternalStore } from 'react';
import { nameVersion, subscribeNames, t } from '../game/names/registry';
import type { Driver, NewsItem, SaveGame, Team, World } from '../game/types';

export function useNames(): number {
  return useSyncExternalStore(subscribeNames, nameVersion, nameVersion);
}

export function driverName(world: World, driverId: string | null | undefined): string {
  if (!driverId) return '—';
  const driver = world.drivers[driverId];
  if (!driver) return driverId;
  return `${t(driver.firstId)} ${t(driver.lastId)}`;
}

export function driverShortName(world: World, driverId: string): string {
  const driver = world.drivers[driverId];
  if (!driver) return driverId;
  return `${t(driver.firstId).charAt(0)}. ${t(driver.lastId)}`;
}

export function driverInitials(world: World, driverId: string): string {
  const driver = world.drivers[driverId];
  if (!driver) return '??';
  return `${t(driver.firstId).charAt(0)}${t(driver.lastId).charAt(0)}`.toUpperCase();
}

export function teamName(world: World, teamId: string | null | undefined): string {
  if (!teamId) return '—';
  const team = world.teams[teamId];
  return team ? t(team.nameId) : teamId;
}

export function teamShort(world: World, teamId: string): string {
  const team = world.teams[teamId];
  return team ? t(team.shortId) : teamId;
}

export function teamOf(world: World, teamId: string): Team | undefined {
  return world.teams[teamId];
}

export function driverOf(world: World, driverId: string): Driver | undefined {
  return world.drivers[driverId];
}

export function newsText(item: NewsItem, save: SaveGame): string {
  return item.text.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = item.args?.[key];
    if (value === undefined) return `{${key}}`;
    const raw = String(value);
    if (key === 'driver') return driverName(save.world, raw);
    if (key === 'team') return teamName(save.world, raw);
    return t(raw);
  });
}

export function isPlayerTeam(save: SaveGame, teamId: string): boolean {
  if (save.player.kind === 'team') return save.player.teamId === teamId;
  const driver = save.world.drivers[save.player.driverId];
  return driver?.teamId === teamId;
}

export function isPlayerDriver(save: SaveGame, driverId: string): boolean {
  if (save.player.kind === 'driver') return save.player.driverId === driverId;
  const team = save.world.teams[save.player.teamId];
  return Boolean(team && team.driverIds.includes(driverId));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
