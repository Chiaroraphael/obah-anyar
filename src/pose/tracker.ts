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
