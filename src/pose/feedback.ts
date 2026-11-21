// TODO(prototipe): ganti dengan feedback.ts asli. Antarmuka: buildTips.
import { SEGMENTS } from './features';
import type { CompareResult, Tip } from './types';

const DEG = 180 / Math.PI;

const KALIMAT: Record<string, (e: number) => string> = {
  lengan_atas_kiri: (e) => (e > 0 ? 'Angkat lengan kiri lebih tinggi' : 'Turunkan lengan kiri sedikit'),
  lengan_atas_kanan: (e) => (e < 0 ? 'Angkat lengan kanan lebih tinggi' : 'Turunkan lengan kanan sedikit'),
  lengan_bawah_kiri: () => 'Perhatikan tekukan siku kiri',
  lengan_bawah_kanan: () => 'Perhatikan tekukan siku kanan',
  paha_kiri: () => 'Tekuk kedua lutut lebih dalam (mendhak)',
  paha_kanan: () => 'Tekuk kedua lutut lebih dalam (mendhak)',
  betis_kiri: () => 'Buka langkah kaki kiri selebar contoh',
  betis_kanan: () => 'Buka langkah kaki kanan selebar contoh',
  badan: (e) => (e > 0 ? 'Tegakkan badan, jangan condong ke kanan' : 'Tegakkan badan, jangan condong ke kiri'),
  bahu: () => 'Ratakan kedua bahu',
  // e = tekukan pelajar − tekukan acuan
  tekuk_lutut_kiri: (e) => (e < 0 ? 'Tekuk lutut kiri lebih dalam, rendahkan badan seperti contoh' : 'Lutut kiri terlalu ditekuk, naikkan badan sedikit'),
  tekuk_lutut_kanan: (e) => (e < 0 ? 'Tekuk lutut kanan lebih dalam, rendahkan badan seperti contoh' : 'Lutut kanan terlalu ditekuk, naikkan badan sedikit'),
};

/** Maksimal `max` koreksi, diurutkan dari hitungan terburuk. */
export function buildTips(result: CompareResult, max = 3, threshold = 75): Tip[] {
  const order = result.perCount
    .map((s, c) => [s, c] as const)
    .filter(([s]) => s < threshold)
    .sort((a, b) => a[0] - b[0]);
  const tips: Tip[] = [];
  const used = new Set<string>();
  for (const [s, c] of order) {
    const errs = result.segmentErrors[c] ?? [];
    let worst = -1;
    let mag = 0;
    errs.forEach((e, k) => { if (Math.abs(e) > mag) { mag = Math.abs(e); worst = k; } });
    if (worst < 0 || mag * DEG < 12) continue;
    const name = SEGMENTS[worst][0];
    const text = KALIMAT[name](errs[worst]);
    if (used.has(text)) continue;
    used.add(text);
    tips.push({ count: c + 1, text, key: name, severity: s < 60 ? 'perbaiki' : 'hampir' });
    if (tips.length >= max) break;
  }
  return tips;
}
