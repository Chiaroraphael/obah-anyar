/**
 * Rekaman acuan bawaan aplikasi (video + lagu + data kerangka di public/).
 * Dipakai mode lokal (src/lib/localData.ts) dan seed Supabase (scripts/gen-katalog-sql.ts),
 * jadi file ini sengaja tanpa import agar bisa dijalankan langsung oleh Node.
 *
 * Nama dan fokus tiap bab ada di src/data/katalog.ts (bagian tarian), urutannya sama.
 * Path berawalan "static:" dibaca dari folder public/ (lihat src/lib/media.ts).
 */

export interface RekamanBab {
  /** id gerak (uuid tetap, sama dengan seed Supabase) */
  id: string;
  durationMs: number;
  counts: number;
  /** rentang di video sumber (detik), untuk keperluan dokumentasi/peninjauan */
  mulai: number;
  selesai: number;
}

export interface Rekaman {
  danceId: string;
  /** folder di public/, mis. /tarian/pendet */
  folder: string;
  /** rasio lebar/tinggi video sumber */
  aspect: number;
  /** ditampilkan sebagai "Oleh …" */
  label: string;
  /** properti yang dibawa sepanjang tarian */
  prop: 'bokor' | null;
  /** catatan sumber & izin (wajib diisi sebelum aplikasi dipublikasikan) */
  sumber: string;
  bab: RekamanBab[];
}

const babPendet: [number, number, number, number][] = [
  // [durationMs, hitungan, mulai, selesai] — 1 hitungan ≈ 1.161 detik (2 ketukan lagu, ±103 ketukan/menit)
  [37872, 33, 0.882, 38.754],
  [42260, 36, 38.754, 81.014],
  [40147, 35, 81.014, 121.162],
  [33599, 29, 121.162, 154.761],
  [36455, 31, 154.761, 191.216],
];

export const REKAMAN: Rekaman[] = [
  {
    danceId: 'pendet',
    folder: '/tarian/pendet',
    aspect: 1.7778,
    label: 'Adira Visca Nurjanah (video referensi)',
    prop: 'bokor',
    sumber: 'Video "TARI PENDET - ADIRA VISCA NURJANAH" (YouTube). Minta izin pemilik video sebelum aplikasi dipublikasikan.',
    bab: babPendet.map(([durationMs, counts, mulai, selesai], i) => ({
      id: `a0e7d3e0-5e4d-4e70-8000-${String(i + 1).padStart(12, '0')}`,
      durationMs, counts, mulai, selesai,
    })),
  },
];

export function rekamanOf(danceId: string): Rekaman | undefined {
  return REKAMAN.find((r) => r.danceId === danceId);
}

/** Path aset satu bab, mis. static:/tarian/pendet/bab-01.json */
export function asetBab(r: Rekaman, nomor: number, ext: 'json' | 'mp4' | 'm4a'): string {
  return `static:${r.folder}/bab-${String(nomor).padStart(2, '0')}.${ext}`;
}
