// TODO(prototipe): ganti dengan tracker.ts asli. Antarmuka: readiness, READINESS_TEXT, CrowdTracker.
import type { Landmark } from './types';

export type Readiness = 'tidak-ada' | 'bahu-pinggul' | 'kaki' | 'siap';

const seen = (lm: Landmark[], ids: number[], min = 0.5) =>
  ids.every((i) => (lm[i]?.visibility ?? 0) >= min && lm[i].x > 0.01 && lm[i].x < 0.99 && lm[i].y > 0.01 && lm[i].y < 0.99);

/** Cek apakah badan siap dinilai. Tari duduk tidak butuh kaki terlihat. */
export function readiness(lm: Landmark[] | undefined, posture: 'berdiri' | 'duduk' = 'berdiri'): Readiness {
  if (!lm || lm.length < 29) return 'tidak-ada';
  if (!seen(lm, [11, 12, 23, 24])) return 'bahu-pinggul';
  if (posture === 'berdiri' && !seen(lm, [27, 28], 0.4)) return 'kaki';
  return 'siap';
}

export const READINESS_TEXT: Record<Readiness, string> = {
  'tidak-ada': 'Badan belum terdeteksi. Berdirilah di depan kamera',
  'bahu-pinggul': 'Mundur sedikit: bahu dan pinggul belum terlihat',
  kaki: 'Kaki belum terlihat. Mundur atau turunkan kamera',
  siap: 'Siap: seluruh badan terlihat jelas',
};

/** Menghitung rasio cuplikan dengan lebih dari satu orang (crowd_ratio). */
export class CrowdTracker {
  private total = 0;
  private crowded = 0;
  push(personCount: number) { this.total++; if (personCount > 1) this.crowded++; }
  get ratio() { return this.total ? this.crowded / this.total : 0; }
  reset() { this.total = 0; this.crowded = 0; }
}

/** Filter One Euro (Casiez dkk., 2012): halus saat diam, tetap responsif saat bergerak cepat. */
class OneEuro {
  private x: number | null = null;
  private dx = 0;
  constructor(private minCutoff: number, private beta: number, private dCutoff = 1) {}
  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(v: number, dt: number, cutoffScale = 1): number {
    if (this.x === null || dt <= 0) { this.x = v; this.dx = 0; return v; }
    const ad = OneEuro.alpha(this.dCutoff, dt);
    this.dx = ad * ((v - this.x) / dt) + (1 - ad) * this.dx;
    const cutoff = (this.minCutoff + this.beta * Math.abs(this.dx)) * cutoffScale;
    this.x = this.x + OneEuro.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
}

const KAKI = new Set([23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
const LUTUT_BAWAH = new Set([25, 26, 27, 28, 29, 30, 31, 32]);

/**
 * Penghalus titik pose langsung dari kamera. Titik kaki dihaluskan lebih kuat (sering bergetar,
 * apalagi tertutup kain), dan titik yang samar (visibilitas rendah) dihaluskan paling kuat.
 */
export class PoseSmoother {
  private f: OneEuro[][] = [];
  private vis: number[] = [];
  private lastT: number | null = null;

  reset() { this.f = []; this.vis = []; this.lastT = null; }

  /** tMs: waktu cuplikan (ms). Mengembalikan salinan titik yang sudah dihaluskan. */
  push(lm: Landmark[] | undefined, tMs: number): Landmark[] | undefined {
    if (!lm) { this.reset(); return lm; }
    const dt = this.lastT === null ? 0 : (tMs - this.lastT) / 1000;
    if (dt > 0.3 || dt < 0) this.reset();
    this.lastT = tMs;
    const step = this.f.length ? dt : 0;
    return lm.map((p, i) => {
      if (!this.f[i]) {
        const [minCutoff, beta] = LUTUT_BAWAH.has(i) ? [0.35, 0.8] : KAKI.has(i) ? [0.6, 1.2] : [1.2, 2.5];
        this.f[i] = [new OneEuro(minCutoff, beta), new OneEuro(minCutoff, beta), new OneEuro(minCutoff, beta)];
        this.vis[i] = p.visibility ?? 1;
      }
      const v = p.visibility ?? 1;
      this.vis[i] = step ? this.vis[i] + 0.3 * (v - this.vis[i]) : v;
      const samar = this.vis[i] < 0.5 ? 0.4 : 1;
      const [fx, fy, fz] = this.f[i];
      return { x: fx.filter(p.x, step, samar), y: fy.filter(p.y, step, samar), z: fz.filter(p.z, step, samar), visibility: this.vis[i] };
    });
  }
}
