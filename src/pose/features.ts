// TODO(prototipe): ganti dengan features.ts asli. Antarmuka: SEGMENTS, frameFeatures, mirrorFrame, angleDiff.
import type { Landmark, PoseFrame } from './types';

/** 10 segmen tubuh yang sudutnya dibandingkan. [nama, titik-awal, titik-akhir] */
export const SEGMENTS: ReadonlyArray<readonly [string, number, number]> = [
  ['lengan_atas_kiri', 11, 13],
  ['lengan_atas_kanan', 12, 14],
  ['lengan_bawah_kiri', 13, 15],
  ['lengan_bawah_kanan', 14, 16],
  ['paha_kiri', 23, 25],
  ['paha_kanan', 24, 26],
  ['betis_kiri', 25, 27],
  ['betis_kanan', 26, 28],
  ['badan', -1, -2], // titik tengah pinggul -> titik tengah bahu
  ['bahu', 11, 12],
  // Tekukan lutut DIPERKIRAKAN dari jarak pinggul–pergelangan kaki (tidak memakai titik lutut),
  // agar tetap bisa dinilai saat lutut tertutup kain. Nilai: 0 = lurus, makin besar makin ditekuk.
  ['tekuk_lutut_kiri', 23, 27],
  ['tekuk_lutut_kanan', 24, 28],
];

/**
 * Panjang kaki lurus (pinggul–pergelangan kaki) dibanding panjang badan (bahu–pinggul) pada pose 2D MediaPipe.
 * Dikalibrasi dari rekaman acuan Pendet (persentil atas rasio pinggul–kaki/badan ≈ 1,35–1,4).
 */
export const KAKI_LURUS_PER_BADAN = 1.45;

/** Segmen yang titik lututnya sering tertutup kain: dinilai hanya bila terlihat, bobot dikurangi. */
export const SEGMEN_KAKI = new Set(['paha_kiri', 'paha_kanan', 'betis_kiri', 'betis_kanan']);
export const SEGMEN_TEKUK = new Set(['tekuk_lutut_kiri', 'tekuk_lutut_kanan']);

/** Bobot penilaian per segmen (urutan sama dengan SEGMENTS). */
export const BOBOT_SEGMEN: number[] = SEGMENTS.map(([name]) => (SEGMEN_KAKI.has(name) ? 0.35 : SEGMEN_TEKUK.has(name) ? 1.5 : 1));

const SWAP: Record<number, number> = {
  11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15, 17: 18, 18: 17, 19: 20, 20: 19, 21: 22, 22: 21,
  23: 24, 24: 23, 25: 26, 26: 25, 27: 28, 28: 27, 29: 30, 30: 29, 31: 32, 32: 31,
};

function mid(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1) };
}
function point(lm: Landmark[], i: number): Landmark {
  if (i === -1) return mid(lm[23], lm[24]);
  if (i === -2) return mid(lm[11], lm[12]);
  return lm[i];
}

/** Sudut tiap segmen (radian, -pi..pi) + visibilitas. Panjang = SEGMENTS.length. */
export function frameFeatures(lm: Landmark[], aspect = 1): { angles: number[]; vis: number[] } {
  const angles: number[] = [];
  const vis: number[] = [];
  for (const [name, a, b] of SEGMENTS) {
    const p = point(lm, a);
    const q = point(lm, b);
    if (SEGMEN_TEKUK.has(name)) {
      const t = tekukLutut(lm, a, b, aspect);
      angles.push(t.angle);
      vis.push(t.vis);
      continue;
    }
    angles.push(Math.atan2(q.y - p.y, (q.x - p.x) * aspect));
    vis.push(Math.min(p.visibility ?? 1, q.visibility ?? 1));
  }
  return { angles, vis };
}

/**
 * Perkiraan tekukan lutut (radian, 0 = lurus) dari pinggul & pergelangan kaki saja.
 * Paha dan betis dianggap sama panjang: jarak pinggul–kaki = panjang kaki lurus × cos(tekuk/2).
 * Jarak dinormalkan dengan panjang badan supaya tidak bergantung jarak ke kamera.
 */
export function tekukLutut(lm: Landmark[], hip: number, ankle: number, aspect = 1): { angle: number; vis: number } {
  const sh = mid(lm[11], lm[12]);
  const hp = mid(lm[23], lm[24]);
  const badan = Math.hypot((sh.x - hp.x) * aspect, sh.y - hp.y);
  const h = lm[hip];
  const a = lm[ankle];
  const vis = Math.min(h.visibility ?? 1, a.visibility ?? 1, sh.visibility ?? 1);
  if (badan < 1e-4) return { angle: 0, vis: 0 };
  const d = Math.hypot((h.x - a.x) * aspect, h.y - a.y);
  const e = Math.min(1, Math.max(0, d / (badan * KAKI_LURUS_PER_BADAN)));
  return { angle: 2 * Math.acos(e), vis };
}

/** Cerminkan pose (pelajar menari seperti bercermin terhadap contoh maestro). */
export function mirrorFrame(f: PoseFrame): PoseFrame {
  const lm = f.lm.map((_, i) => {
    const src = f.lm[SWAP[i] ?? i];
    return { ...src, x: 1 - src.x };
  });
  return { t: f.t, lm };
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
