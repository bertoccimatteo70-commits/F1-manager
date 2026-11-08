import { describe, expect, it, afterEach } from 'vitest';
import { baseName, isOverridden, nameEntries, resetAllNames, resetName, setName, t } from '../src/game/names/registry';

afterEach(() => {
  resetAllNames();
});

describe('editor nomi', () => {
  it('espone tutte le categorie richieste', () => {
    const kinds = new Set(nameEntries().map((entry) => entry.kind));
    expect(kinds.has('driver')).toBe(true);
    expect(kinds.has('team')).toBe(true);
    expect(kinds.has('sponsor')).toBe(true);
    expect(kinds.has('engine')).toBe(true);
    expect(kinds.has('circuit')).toBe(true);
    expect(kinds.has('competition')).toBe(true);
    expect(nameEntries().length).toBeGreaterThan(250);
  });

  it('sovrascrive il nome senza toccare il valore predefinito', () => {
    const base = t('team.ferari.name');
    setName('team.ferari.name', 'Scuderia Test');
    expect(t('team.ferari.name')).toBe('Scuderia Test');
    expect(baseName('team.ferari.name')).toBe(base);
    expect(isOverridden('team.ferari.name')).toBe(true);
    expect(t('team.mclare.name')).not.toBe('Scuderia Test');
  });

  it('ripristina il nome predefinito con il reset', () => {
    const base = t('drv.ver.first');
    setName('drv.ver.first', 'Massimo');
    expect(t('drv.ver.first')).toBe('Massimo');
    resetName('drv.ver.first');
    expect(t('drv.ver.first')).toBe(base);
    expect(isOverridden('drv.ver.first')).toBe(false);
  });

  it('ignora valori vuoti e ripristina tutto per categoria', () => {
    setName('circuit.monza', 'Monza Reale');
    setName('circuit.monza', '   ');
    expect(t('circuit.monza')).toBe(baseName('circuit.monza'));
    setName('sponsor.shel', 'Sponsor X');
    setName('comp.f1', 'Campionato X');
    resetAllNames('sponsor');
    expect(t('sponsor.shel')).toBe('Shel Motorsport');
    expect(t('comp.f1')).toBe('Campionato X');
  });
});
