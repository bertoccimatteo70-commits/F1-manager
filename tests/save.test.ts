import { describe, expect, it } from 'vitest';
import { deleteSave, listSaveMeta, loadGame, saveGame } from '../src/game/save/storage';
import { createDriverCareer } from '../src/game/engine/career';

describe('salvataggi', () => {
  it('salva, elenca, ricarica e cancella una carriera', () => {
    const save = createDriverCareer({
      id: 'player',
      first: 'Luca',
      last: 'Bianchi',
      nat: 'IT',
      age: 20,
      number: 12,
      helmet: '#00ff00',
      category: 'F2',
      difficulty: 'normal',
      seed: 999,
    });
    expect(saveGame(save)).toBe(true);
    const metas = listSaveMeta();
    expect(metas.some((meta) => meta.id === save.id)).toBe(true);
    const loaded = loadGame(save.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.world.drivers.player.firstId).toBe('Luca');
    expect(loaded?.mode).toBe('driver');
    deleteSave(save.id);
    expect(loadGame(save.id)).toBeNull();
    expect(listSaveMeta().some((meta) => meta.id === save.id)).toBe(false);
  });

  it('conserva relazioni tra contratti, squadre e piloti dopo il round-trip', () => {
    const save = createDriverCareer({
      id: 'player',
      first: 'Sara',
      last: 'Conti',
      nat: 'IT',
      age: 21,
      number: 7,
      helmet: '#ffcc00',
      category: 'F3',
      difficulty: 'hard',
      seed: 111,
    });
    saveGame(save);
    const loaded = loadGame(save.id)!;
    const driver = loaded.world.drivers.player;
    const team = loaded.world.teams[driver.teamId as string];
    expect(team.driverIds).toContain('player');
    const contract = Object.values(loaded.world.contracts).find((entry) => entry.driverId === 'player');
    expect(contract?.teamId).toBe(team.id);
    deleteSave(save.id);
  });
});
