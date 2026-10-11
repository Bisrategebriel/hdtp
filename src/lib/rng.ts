/**
 * mulberry32 PRNG. Each stream is forked by name so adding a new stream never shifts
 * the numbers drawn by existing ones (docs/PLAN.md §7, determinism). Shared by scripts/seed and concept screens.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  fork(name: string): Rng {
    let h = this.state ^ 0x9e3779b9;
    for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x85ebca6b);
    return new Rng(h ^ (h >>> 13));
  }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Approximately normal via the sum of uniforms. */
  normal(mean: number, sd: number): number {
    let s = 0;
    for (let i = 0; i < 6; i++) s += this.next();
    return mean + (s - 3) * sd * Math.SQRT2;
  }
}
