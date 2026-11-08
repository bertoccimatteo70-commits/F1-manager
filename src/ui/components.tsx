import React, { useEffect, useId, useState } from 'react';
import type { Compound, Team } from '../game/types';
import { COMPOUND_COLOR, countryFlag, formatMoney } from '../game/engine/format';

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
  accent,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section className={`panel ${className}`} style={accent ? { borderTopColor: accent } : undefined}>
      {(title || actions) && (
        <header className="panel-head">
          <div>
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
  small,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: string;
  small?: boolean;
}) {
  return (
    <div className="stat" style={accent ? { borderLeftColor: accent } : undefined}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${small ? 'stat-value-sm' : ''}`}>{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  color = 'var(--accent-2)',
  height = 6,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar" style={{ height }}>
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
  title,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'info' | 'muted';
  title?: string;
}) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`money ${value < 0 ? 'negative' : ''} ${className}`}>{formatMoney(value)}</span>;
}

export function TeamDot({ team, size = 10 }: { team?: Team; size?: number }) {
  return (
    <span
      className="team-dot"
      style={{ background: team?.color ?? '#777', width: size, height: size, boxShadow: `0 0 0 1px ${team?.accent ?? '#333'}` }}
    />
  );
}

export function TeamLogo({ team, size = 34 }: { team?: Team; size?: number }) {
  const glyph: Record<string, string> = {
    wing: '⌁',
    ring: '◎',
    bolt: '⚡',
    shield: '⬟',
    star: '✦',
    arrow: '➤',
  };
  if (!team) return null;
  return (
    <span
      className="team-logo"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${team.color}, ${shade(team.color, -35)})`,
        borderColor: team.accent,
        fontSize: size * 0.5,
      }}
      aria-hidden
    >
      <span style={{ color: readable(team.color) }}>{glyph[team.logo] ?? '✦'}</span>
    </span>
  );
}

function shade(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round(2.55 * percent)));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function readable(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return '#fff';
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 160 ? '#101010' : '#ffffff';
}

export function TyrePill({ compound, life }: { compound: Compound; life?: number }) {
  const color = COMPOUND_COLOR[compound] ?? '#888';
  const label = compound === 'soft' ? 'S' : compound === 'medium' ? 'M' : compound === 'hard' ? 'H' : compound === 'inter' ? 'I' : 'W';
  return (
    <span className="tyre-pill" title={`Gomme ${compound}`}>
      <span className="tyre-circle" style={{ background: color, color: readable(color) }}>
        {label}
      </span>
      {life !== undefined && <span className={`tyre-life ${life < 25 ? 'low' : ''}`}>{Math.max(0, Math.round(life))}%</span>}
    </span>
  );
}

export function FlagTag({ flag }: { flag: string }) {
  const map: Record<string, { text: string; tone: 'good' | 'warn' | 'bad' | 'info' }> = {
    green: { text: 'Verde', tone: 'good' },
    yellow: { text: 'Gialla', tone: 'warn' },
    sc: { text: 'Safety Car', tone: 'warn' },
    vsc: { text: 'VSC', tone: 'warn' },
    red: { text: 'Rossa', tone: 'bad' },
    chequered: { text: 'Scacchi', tone: 'info' },
  };
  const info = map[flag] ?? map.green;
  return <Badge tone={info.tone}>{info.text}</Badge>;
}

export function PositionBadge({ position }: { position: number }) {
  const tone = position === 1 ? 'gold' : position <= 3 ? 'podium' : position <= 10 ? 'points' : 'plain';
  return <span className={`pos-badge pos-${tone}`}>{position}</span>;
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  compact,
}: {
  tabs: { id: T; label: string; icon?: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  compact?: boolean;
}) {
  return (
    <div className={`tabs ${compact ? 'tabs-compact' : ''}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`tab ${active === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className="tab-icon">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3 id={id}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">◎</span>
      <h4>{title}</h4>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  error,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function SkillRow({ label, value, max = 99 }: { label: string; value: number; max?: number }) {
  return (
    <div className="skill-row">
      <span className="skill-name">{label}</span>
      <div className="skill-bar">
        <Bar value={value} max={max} color={value >= 85 ? 'var(--accent-2)' : value >= 70 ? 'var(--gold)' : 'var(--accent)'} />
      </div>
      <span className="skill-value">{Math.round(value)}</span>
    </div>
  );
}

export function NationFlag({ nat }: { nat: string }) {
  return (
    <span className="nation" title={nat}>
      {countryFlag(nat)} <span className="nation-code">{nat}</span>
    </span>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  label?: string;
}) {
  const id = useId();
  return (
    <div className="select-wrap">
      {label && <label htmlFor={id} className="field-label">{label}</label>}
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function InfoHint({ text, label = 'Maggiori informazioni' }: { text: string; label?: string }) {
  return (
    <span className="info-hint" tabIndex={0} role="note" aria-label={label} data-tip={text}>
      i
    </span>
  );
}

export function Sparkline({
  values,
  color = 'var(--accent-2)',
  height = 42,
  label,
}: {
  values: number[];
  color?: string;
  height?: number;
  label?: string;
}) {
  if (values.length === 0) return <span className="muted small">Nessun dato</span>;
  const width = 220;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `0,${height} ${points.join(' ')} ${width},${height}`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? 'Andamento'} preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity="0.14" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function MiniBars({
  values,
  color = 'var(--accent)',
  labels,
  height = 54,
}: {
  values: number[];
  color?: string;
  labels?: string[];
  height?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="mini-bars" style={{ height }}>
      {values.map((value, index) => (
        <span
          key={index}
          className="mini-bar"
          style={{ height: `${Math.max(4, (value / max) * 100)}%`, background: color }}
          title={`${labels?.[index] ?? ''} ${Math.round(value)}`}
        />
      ))}
    </div>
  );
}

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = 'btn btn-ghost',
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      className={armed ? 'btn btn-danger' : className}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
