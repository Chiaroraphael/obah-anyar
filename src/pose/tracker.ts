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

  private jangkar: ({ x: number; y: number } | undefined)[] = [];
  private lutut: ({ a: number; b: number } | undefined)[] = [];

  reset() { this.f = []; this.vis = []; this.lastT = null; this.jangkar = []; this.lutut = []; }

  /** tMs: waktu cuplikan (ms). Mengembalikan salinan titik yang sudah dihaluskan. */
  push(lm: Landmark[] | undefined, tMs: number): Landmark[] | undefined {
    if (!lm) { this.reset(); return lm; }
    const dt = this.lastT === null ? 0 : (tMs - this.lastT) / 1000;
    if (dt > 0.3 || dt < 0) this.reset();
    this.lastT = tMs;
    const step = this.f.length ? dt : 0;
    const out = lm.map((p, i) => {
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
    this.kunciKaki(out, step);
    return out;
  }

  /**
   * Telapak yang diam dikunci di tempat: titik baru ikut bergeser hanya bila menjauh lebih dari
   * RADIUS_KUNCI dari posisi kunci. Lutut lalu dibangun ulang dari pinggul & pergelangan kaki,
   * sehingga tidak "berjalan sendiri" saat kaki diam (lutut tertutup kain sering ditebak berubah-ubah).
   */
  private kunciKaki(lm: Landmark[], dt: number) {
    if (lm.length < 33) return;
    for (let i = 27; i <= 32; i++) {
      const p = lm[i];
      const a = this.jangkar[i];
      if (!a || !dt) { this.jangkar[i] = { x: p.x, y: p.y }; continue; }
      const dx = p.x - a.x, dy = p.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > RADIUS_KUNCI) { a.x += dx * (1 - RADIUS_KUNCI / d); a.y += dy * (1 - RADIUS_KUNCI / d); }
      p.x = a.x; p.y = a.y;
    }
    for (const [h, k, a] of [[23, 25, 27], [24, 26, 28]] as const) {
      const H = lm[h], K = lm[k], A = lm[a];
      const vx = A.x - H.x, vy = A.y - H.y;
      const L = Math.hypot(vx, vy);
      if (L < 1e-4) continue;
      const ux = vx / L, uy = vy / L, nx = -uy, ny = ux;
      const ra = ((K.x - H.x) * ux + (K.y - H.y) * uy) / L;
      const rb = ((K.x - H.x) * nx + (K.y - H.y) * ny) / L;
      const prev = this.lutut[k];
      const w = !prev || !dt ? 1 : 1 - Math.exp(-dt / 0.45); // ±0,45 detik
      const cur = prev ? { a: prev.a + w * (ra - prev.a), b: prev.b + w * (rb - prev.b) } : { a: ra, b: rb };
      this.lutut[k] = cur;
      K.x = H.x + ux * cur.a * L + nx * cur.b * L;
      K.y = H.y + uy * cur.a * L + ny * cur.b * L;
    }
  }
}

/** Jarak (koordinat ternormalisasi) sebelum telapak yang dikunci ikut bergeser. */
const RADIUS_KUNCI = 0.012;
