import React, { useState } from 'react';
import type { Category } from '../game/types';
import type { NewDriverInput, NewTeamInput } from '../game/engine/career';
import { CATEGORY_LABEL, TEAM_LOGOS } from '../game/data/catalog';
import { NATIONALITIES, countryFlag, countryName } from '../game/engine/format';
import { Badge, Field, TeamLogo } from './components';
import type { Team } from '../game/types';

const HELMET_COLORS = ['#e10600', '#00d2be', '#ffd200', '#1e41ff', '#ff8000', '#22c55e', '#f5f5f5', '#8b5cf6', '#111111'];

const LOGO_TEAM: Team = {
  id: 'preview',
  nameId: '',
  shortId: '',
  color: '#e10600',
  accent: '#ffffff',
  category: 'F1',
  engineId: 'ferrar',
  car: { aero: 0, engine: 0, chassis: 0, suspension: 0, brakes: 0, reliability: 0 },
  sponsorIds: [],
  sponsorDeals: [],
  budget: 0,
  driverIds: [null, null],
  staff: [],
  logo: 'wing',
  isPlayer: false,
  projects: [],
  history: [],
  loans: [],
  reputation: 0,
};

export function NewCareer({
  onBack,
  onCreateDriver,
  onCreateTeam,
}: {
  onBack: () => void;
  onCreateDriver: (input: NewDriverInput) => void;
  onCreateTeam: (input: NewTeamInput) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'driver' | 'team'>('choose');

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">Nuova carriera</p>
          <h2>Scegli il tuo percorso</h2>
          <p className="muted">Le due modalità sono indipendenti e hanno salvataggi separati.</p>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>
          ← Menu
        </button>
      </header>

      {mode === 'choose' && (
        <div className="mode-grid">
          <button className="mode-card" onClick={() => setMode('driver')}>
            <div className="mode-art driver-art">
              <span className="mode-helmet" />
            </div>
            <div className="mode-copy">
              <Badge tone="info">Carriera pilota</Badge>
              <h3>Dal casco alla leggenda</h3>
              <p>
                Crea il tuo pilota, parti dalla Formula 3 e scala le categorie. Abilità, contratti, offerte, licenziamenti
                e ritiro: ogni stagione dipende dai tuoi risultati.
              </p>
              <ul className="mode-list">
                <li>Progressione abilità con punti esperienza</li>
                <li>Contratti, clausole e bonus</li>
                <li>Mercato piloti e promozioni reali</li>
              </ul>
              <span className="mode-cta">Inizia come pilota →</span>
            </div>
          </button>

          <button className="mode-card" onClick={() => setMode('team')}>
            <div className="mode-art team-art">
              <span className="mode-garage" />
            </div>
            <div className="mode-copy">
              <Badge tone="good">Carriera scuderia</Badge>
              <h3>Fonda la tua squadra</h3>
              <p>
                Nome, colori, logo e categoria. Assumi piloti e ingegneri, sviluppa la monoposto e gestisci un budget che
                può portare al titolo o alla bancarotta.
              </p>
              <ul className="mode-list">
                <li>Ricerca e sviluppo in 6 aree</li>
                <li>Sponsor, premi e prestiti</li>
                <li>Strategia gara per due vetture</li>
              </ul>
              <span className="mode-cta">Fonda la scuderia →</span>
            </div>
          </button>
        </div>
      )}

      {mode === 'driver' && <DriverForm onBack={() => setMode('choose')} onCreate={onCreateDriver} />}
      {mode === 'team' && <TeamForm onBack={() => setMode('choose')} onCreate={onCreateTeam} />}
    </div>
  );
}

function DriverForm({ onBack, onCreate }: { onBack: () => void; onCreate: (input: NewDriverInput) => void }) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [nat, setNat] = useState('IT');
  const [age, setAge] = useState(19);
  const [number, setNumber] = useState(27);
  const [helmet, setHelmet] = useState(HELMET_COLORS[0]);
  const [category, setCategory] = useState<Category>('F3');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [error, setError] = useState('');

  const submit = () => {
    if (first.trim().length < 2 || last.trim().length < 2) {
      setError('Inserisci un nome e un cognome di almeno 2 caratteri.');
      return;
    }
    if (age < 17 || age > 35) {
      setError('L\'età deve essere compresa tra 17 e 35 anni.');
      return;
    }
    setError('');
    onCreate({
      id: 'player',
      first: first.trim(),
      last: last.trim(),
      nat,
      age,
      number,
      helmet,
      category,
      difficulty,
      seed: Math.floor(Math.random() * 1e9),
    });
  };

  return (
    <div className="form-layout">
      <section className="panel form-panel">
        <div className="panel-head">
          <div>
            <h3 className="panel-title">Il tuo pilota</h3>
            <p className="panel-subtitle">I dati sono modificabili solo alla creazione: scegli con cura.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Indietro
          </button>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <Field label="Nome">
              <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Es. Marco" maxLength={18} />
            </Field>
            <Field label="Cognome">
              <input className="input" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Es. Ferretti" maxLength={20} />
            </Field>
            <Field label="Nazionalità">
              <select className="input" value={nat} onChange={(e) => setNat(e.target.value)}>
                {NATIONALITIES.map((code) => (
                  <option key={code} value={code}>
                    {countryFlag(code)} {countryName(code)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Età" hint="Tra 17 e 35 anni">
              <input
                className="input"
                type="number"
                min={17}
                max={35}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </Field>
            <Field label="Numero di gara" hint="1-99">
              <input
                className="input"
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
              />
            </Field>
            <Field label="Categoria di partenza" hint="Puoi partire dalla F2 per una sfida più dura">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="F3">{CATEGORY_LABEL.F3}</option>
                <option value="F2">{CATEGORY_LABEL.F2}</option>
              </select>
            </Field>
          </div>

          <Field label="Colore del casco">
            <div className="swatches">
              {HELMET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`swatch ${helmet === color ? 'is-active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setHelmet(color)}
                  aria-label={`Colore ${color}`}
                />
              ))}
              <input className="input input-color" type="color" value={helmet} onChange={(e) => setHelmet(e.target.value)} />
            </div>
          </Field>

          <Field label="Difficoltà" hint="Determina abilità iniziali e potenziale">
            <div className="segmented">
              {(['easy', 'normal', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  className={`seg ${difficulty === level ? 'is-active' : ''}`}
                  onClick={() => setDifficulty(level)}
                >
                  {level === 'easy' ? 'Esordiente' : level === 'normal' ? 'Professionista' : 'Veterano'}
                </button>
              ))}
            </div>
          </Field>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="btn btn-primary btn-lg" onClick={submit}>
              Inizia la carriera
            </button>
            <span className="muted small">Inizierai nel team più piccolo della categoria scelta.</span>
          </div>
        </div>
      </section>

      <aside className="panel preview-panel">
        <div className="panel-body">
          <p className="eyebrow">Anteprima</p>
          <div className="driver-preview">
            <div className="helmet" style={{ background: `linear-gradient(135deg, ${helmet}, #111)` }}>
              <span className="helmet-visor" />
            </div>
            <div>
              <strong className="preview-name">
                {first || 'Nome'} {last || 'Cognome'}
              </strong>
              <span className="preview-meta">
                {countryFlag(nat)} {countryName(nat)} · {age} anni · #{number}
              </span>
              <div className="preview-tags">
                <Badge tone="info">{CATEGORY_LABEL[category]}</Badge>
                <Badge tone="muted">{difficulty === 'easy' ? 'Esordiente' : difficulty === 'normal' ? 'Professionista' : 'Veterano'}</Badge>
              </div>
            </div>
          </div>
          <p className="muted small">
            Abilità di partenza: {difficulty === 'easy' ? '66' : difficulty === 'normal' ? '61' : '56'} circa. Potenziale:{' '}
            {difficulty === 'easy' ? '96' : difficulty === 'normal' ? '93' : '90'}. Ogni gara assegna esperienza per migliorare.
          </p>
        </div>
      </aside>
    </div>
  );
}

function TeamForm({ onBack, onCreate }: { onBack: () => void; onCreate: (input: NewTeamInput) => void }) {
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [color, setColor] = useState('#e10600');
  const [accent, setAccent] = useState('#ffd200');
  const [logo, setLogo] = useState('wing');
  const [category, setCategory] = useState<Category>('F2');
  const [budgetLevel, setBudgetLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [error, setError] = useState('');

  const submit = () => {
    if (name.trim().length < 3) {
      setError('Il nome della scuderia deve avere almeno 3 caratteri.');
      return;
    }
    if (short.trim().length < 2) {
      setError('La sigla deve avere almeno 2 caratteri.');
      return;
    }
    setError('');
    onCreate({
      id: 'player-team',
      name: name.trim(),
      short: short.trim().slice(0, 3),
      color,
      accent,
      logo,
      category,
      budgetLevel,
      seed: Math.floor(Math.random() * 1e9),
    });
  };

  const previewTeam: Team = { ...LOGO_TEAM, color, accent, logo, category };

  return (
    <div className="form-layout">
      <section className="panel form-panel">
        <div className="panel-head">
          <div>
            <h3 className="panel-title">La tua scuderia</h3>
            <p className="panel-subtitle">Prenderai il posto della squadra più debole della categoria scelta.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Indietro
          </button>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <Field label="Nome della scuderia">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Scuderia Aurora" maxLength={30} />
            </Field>
            <Field label="Sigla" hint="2-3 caratteri">
              <input
                className="input"
                value={short}
                onChange={(e) => setShort(e.target.value.toUpperCase())}
                placeholder="AUR"
                maxLength={3}
              />
            </Field>
            <Field label="Categoria di partenza">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="F3">{CATEGORY_LABEL.F3} · budget ridotto</option>
                <option value="F2">{CATEGORY_LABEL.F2} · sfida intermedia</option>
                <option value="F1">{CATEGORY_LABEL.F1} · massima pressione</option>
              </select>
            </Field>
            <Field label="Solidità economica iniziale">
              <select className="input" value={budgetLevel} onChange={(e) => setBudgetLevel(e.target.value as 'low' | 'medium' | 'high')}>
                <option value="low">Risicata · budget × 0,65</option>
                <option value="medium">Equilibrata · budget × 1</option>
                <option value="high">Solida · budget × 1,45</option>
              </select>
            </Field>
          </div>

          <Field label="Colore principale">
            <div className="swatches">
              <input className="input input-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <span className="muted small">Usato per livrea, tabelle e identificazione in pista.</span>
            </div>
          </Field>
          <Field label="Colore secondario">
            <div className="swatches">
              <input className="input input-color" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </div>
          </Field>

          <Field label="Emblema">
            <div className="logo-picker">
              {TEAM_LOGOS.map((id) => (
                <button
                  key={id}
                  className={`logo-choice ${logo === id ? 'is-active' : ''}`}
                  onClick={() => setLogo(id)}
                  aria-label={`Emblema ${id}`}
                >
                  <TeamLogo team={{ ...previewTeam, logo: id }} size={38} />
                </button>
              ))}
            </div>
          </Field>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="btn btn-primary btn-lg" onClick={submit}>
              Fonda la scuderia
            </button>
            <span className="muted small">Due piloti e due ingegneri saranno ingaggiati automaticamente.</span>
          </div>
        </div>
      </section>

      <aside className="panel preview-panel">
        <div className="panel-body">
          <p className="eyebrow">Anteprima livrea</p>
          <div className="livery-preview" style={{ background: `linear-gradient(140deg, ${color}, ${shadeHex(color, -40)})` }}>
            <div className="livery-stripe" style={{ background: accent }} />
            <div className="livery-logo">
              <TeamLogo team={previewTeam} size={52} />
            </div>
            <div className="livery-text">
              <strong>{name || 'Scuderia'}</strong>
              <span>{short || 'SIG'}</span>
            </div>
          </div>
          <div className="preview-tags">
            <Badge tone="info">{CATEGORY_LABEL[category]}</Badge>
            <Badge tone={budgetLevel === 'high' ? 'good' : budgetLevel === 'low' ? 'warn' : 'muted'}>
              {budgetLevel === 'high' ? 'Budget solido' : budgetLevel === 'low' ? 'Budget risicato' : 'Budget equilibrato'}
            </Badge>
          </div>
          <p className="muted small">
            In carriera gestirai contratti, stipendi, sponsor, sviluppo della monoposto e due piloti in pista. Se il
            bilancio scende troppo in basso, la scuderia fallisce.
          </p>
        </div>
      </aside>
    </div>
  );
}

function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}
