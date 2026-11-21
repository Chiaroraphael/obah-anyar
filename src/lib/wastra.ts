/**
 * Palet kain per DAERAH — semua dari keluarga pewarna alam supaya padu satu sama lain.
 * Setiap tarian memakai kain daerahnya (lihat DESIGN.md).
 * base   : warna kain utama (latar blok)
 * accent : warna benang/motif
 * light  : warna dasar kain yang terang (latar lembut)
 * ink    : warna teks DI ATAS base (kontras >= 4.5:1)
 * pola   : kelas motif CSS di src/index.css
 */
import { DAERAH, PEMANASAN, TARIAN } from '../data/katalog';

export interface Wastra {
  base: string;
  accent: string;
  light: string;
  ink: string;
  pola: 'lereng' | 'ulos' | 'tumpal' | 'songket' | 'zigzag' | 'poleng' | 'merak';
  kain: string;
}

export const WASTRA: Record<string, Wastra> = {
  bali: { base: '#33323F', accent: '#C9452F', light: '#E9E5DE', ink: '#FFF8EE', pola: 'poleng', kain: 'Kain Poleng' },
  'jawa-barat': { base: '#B5432F', accent: '#E9B949', light: '#F7E1D3', ink: '#FFF8EE', pola: 'lereng', kain: 'Batik Priangan' },
  'dki-jakarta': { base: '#4F7A4A', accent: '#EFC24B', light: '#E5EEDB', ink: '#FFF8EE', pola: 'tumpal', kain: 'Batik Betawi' },
  'jawa-timur': { base: '#1F5E63', accent: '#E0B13E', light: '#DCEBE8', ink: '#FFF8EE', pola: 'merak', kain: 'Merak Ponorogo' },
  'sumatera-utara': { base: '#8E2B26', accent: '#F1E6D2', light: '#F4DCD6', ink: '#FFF8EE', pola: 'ulos', kain: 'Ulos Batak' },
  'sumatera-barat': { base: '#7A2E3B', accent: '#D9A93A', light: '#F2DCD8', ink: '#FFF8EE', pola: 'songket', kain: 'Songket Minangkabau' },
  aceh: { base: '#D08A24', accent: '#2F5D3A', light: '#F8E7C7', ink: '#1C1F4A', pola: 'zigzag', kain: 'Kerawang Aceh' },
};

/** Pemanasan & tarian tanpa daerah: lurik nila-prada. */
export const WASTRA_DEFAULT: Wastra = { base: '#1C1F4A', accent: '#D4A23A', light: '#EFE7F5', ink: '#FFF8EE', pola: 'ulos', kain: 'Lurik' };

const DANCE_REGION: Record<string, string> = Object.fromEntries([...TARIAN, PEMANASAN].map((t) => [t.id, t.region]));
const PROVINCE_REGION: Record<string, string> = Object.fromEntries(DAERAH.map((d) => [d.province, d.id]));

/** Palet untuk id daerah ATAU id tarian (tarian baru dari maestro: pakai provinsi bila diberikan). */
export function wastraOf(id: string | undefined | null, province?: string | null): Wastra {
  if (!id) return WASTRA_DEFAULT;
  if (WASTRA[id]) return WASTRA[id];
  const region = DANCE_REGION[id] || (province ? PROVINCE_REGION[province] : undefined);
  return (region && WASTRA[region]) || WASTRA_DEFAULT;
}

export function wastraVars(w: Wastra): React.CSSProperties {
  return { ['--w-base' as string]: w.base, ['--w-accent' as string]: w.accent, ['--w-light' as string]: w.light, ['--w-ink' as string]: w.ink };
}

/** Warna aurora hero mengikuti kain daerah. */
export function auroraDaerah(w: Wastra): React.CSSProperties {
  return { ['--au1' as string]: w.base, ['--au2' as string]: w.accent, ['--au3' as string]: w.base, ['--au4' as string]: 'oklch(48% 0.16 250)' };
}

/** Angka Jawa untuk hiasan (aria-hidden), mis. 1 -> ꧑ */
export function angkaJawa(n: number): string {
  return String(n).replace(/\d/g, (d) => String.fromCodePoint(0xa9d0 + Number(d)));
}
