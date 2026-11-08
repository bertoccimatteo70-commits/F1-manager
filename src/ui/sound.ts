/**
 * Minimal, asset-free UI audio. Everything is synthesised with the Web Audio
 * API so the game keeps working offline and ships no binary sounds.
 */

type Tone = 'click' | 'tab' | 'success' | 'alert' | 'race';

let enabled = false;
let context: AudioContext | null = null;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

const RECIPES: Record<Tone, { frequency: number; end: number; duration: number; gain: number; type: OscillatorType }> = {
  click: { frequency: 520, end: 380, duration: 0.05, gain: 0.035, type: 'triangle' },
  tab: { frequency: 380, end: 520, duration: 0.07, gain: 0.04, type: 'sine' },
  success: { frequency: 520, end: 880, duration: 0.18, gain: 0.06, type: 'sine' },
  alert: { frequency: 320, end: 180, duration: 0.16, gain: 0.06, type: 'sawtooth' },
  race: { frequency: 180, end: 640, duration: 0.3, gain: 0.05, type: 'triangle' },
};

export function playTone(tone: Tone): void {
  if (!enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const recipe = RECIPES[tone];
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  oscillator.type = recipe.type;
  oscillator.frequency.setValueAtTime(recipe.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, recipe.end), now + recipe.duration);
  gain.gain.setValueAtTime(recipe.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + recipe.duration + 0.02);
}

/** Global feedback: a short tick for buttons and tabs, unless sound is off. */
export function installUiSounds(): () => void {
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button, [role="tab"], .seg, .chip, .nav-item, .menu-card');
    if (!button || (button as HTMLButtonElement).disabled) return;
    playTone(button.getAttribute('role') === 'tab' ? 'tab' : 'click');
  };
  document.addEventListener('pointerdown', onPointerDown);
  return () => document.removeEventListener('pointerdown', onPointerDown);
}
