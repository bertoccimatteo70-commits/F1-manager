import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobalSettings, SaveGame } from './game/types';
import { deleteSave, listSaveMeta, loadGame, renameSave, saveGame, saveSettings, loadSettings, type SaveMeta } from './game/save/storage';
import { overrideCount } from './game/names/registry';
import { createDriverCareer, createTeamCareer, type NewDriverInput, type NewTeamInput } from './game/engine/career';
import { useNames } from './ui/helpers';
import { MainMenu } from './ui/MainMenu';
import { NewCareer } from './ui/NewCareer';
import { SavesScreen } from './ui/SavesScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { NameEditor } from './ui/NameEditor';
import { AboutScreen } from './ui/AboutScreen';
import { CareerScreen } from './ui/CareerScreen';

type View = 'menu' | 'new' | 'saves' | 'settings' | 'names' | 'about' | 'career';

export function App() {
  useNames();
  const [view, setView] = useState<View>('menu');
  const [save, setSave] = useState<SaveGame | null>(null);
  const [settings, setSettings] = useState<GlobalSettings>(() => loadSettings());
  const [metas, setMetas] = useState<SaveMeta[]>(() => listSaveMeta());
  const saveRef = useRef<SaveGame | null>(null);
  saveRef.current = save;
  const autosaveRef = useRef(settings.autosave);
  autosaveRef.current = settings.autosave;

  const refreshMetas = useCallback(() => setMetas(listSaveMeta()), []);

  const update = useCallback((next: SaveGame, persist?: boolean) => {
    setSave(next);
    const shouldPersist = persist === true || (persist === undefined && autosaveRef.current);
    if (shouldPersist) {
      saveGame(next);
      refreshMetas();
    }
  }, [refreshMetas]);

  const changeSettings = (next: GlobalSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const load = (id: string) => {
    const loaded = loadGame(id);
    if (!loaded) return;
    setSave(loaded);
    setView('career');
    refreshMetas();
  };

  const createDriver = (input: NewDriverInput) => {
    const created = createDriverCareer(input);
    saveGame(created);
    setSave(created);
    setView('career');
    refreshMetas();
  };

  const createTeam = (input: NewTeamInput) => {
    const created = createTeamCareer(input);
    saveGame(created);
    setSave(created);
    setView('career');
    refreshMetas();
  };

  const manualSave = () => {
    if (!save) return;
    saveGame(save);
    refreshMetas();
  };

  const backToMenu = () => {
    if (save && autosaveRef.current) {
      saveGame(save);
    }
    refreshMetas();
    setSave(null);
    setView('menu');
  };

  useEffect(() => {
    const onHide = () => {
      if (autosaveRef.current && saveRef.current && document.visibilityState === 'hidden') {
        saveGame(saveRef.current);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    if (view === 'saves' || view === 'menu') refreshMetas();
  }, [view, refreshMetas]);

  return (
    <div className="app">
      {view === 'menu' && (
        <MainMenu
          latest={metas[0] ?? null}
          onNew={() => setView('new')}
          onContinue={() => metas[0] && load(metas[0].id)}
          onSaves={() => setView('saves')}
          onSettings={() => setView('settings')}
          onNames={() => setView('names')}
          onAbout={() => setView('about')}
          overrideCount={overrideCount()}
        />
      )}
      {view === 'new' && <NewCareer onBack={() => setView('menu')} onCreateDriver={createDriver} onCreateTeam={createTeam} />}
      {view === 'saves' && (
        <SavesScreen
          metas={metas}
          onBack={() => setView('menu')}
          onLoad={load}
          onDelete={(id) => {
            deleteSave(id);
            refreshMetas();
          }}
          onRename={(id, name) => {
            renameSave(id, name);
            refreshMetas();
          }}
          onCreate={() => setView('new')}
        />
      )}
      {view === 'settings' && <SettingsScreen settings={settings} onChange={changeSettings} onBack={() => setView('menu')} />}
      {view === 'names' && <NameEditor onBack={() => setView('menu')} />}
      {view === 'about' && <AboutScreen onBack={() => setView('menu')} />}
      {view === 'career' && save && (
        <CareerScreen save={save} settings={settings} onUpdate={update} onMenu={backToMenu} onSave={manualSave} />
      )}
    </div>
  );
}
