/** Deterministic xorshift32 PRNG stored inside serializable state. */
export function nextRandom(holder: { rngState: number }): number {
  let x = holder.rngState || 0x9e3779b9;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  holder.rngState = x || 0x9e3779b9;
  return holder.rngState / 0x100000000;
}

export function randRange(holder: { rngState: number }, min: number, max: number): number {
  return min + nextRandom(holder) * (max - min);
}

export function randInt(holder: { rngState: number }, min: number, max: number): number {
  return Math.floor(randRange(holder, min, max + 1));
}

export function chance(holder: { rngState: number }, probability: number): boolean {
  return nextRandom(holder) < probability;
}

export function pick<T>(holder: { rngState: number }, list: T[]): T {
  return list[Math.floor(nextRandom(holder) * list.length) % list.length];
}

export function uid(prefix: string, holder: { rngState: number }): string {
  return `${prefix}-${Math.floor(nextRandom(holder) * 1e9).toString(36)}${Math.floor(nextRandom(holder) * 1e9).toString(36)}`;
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}
