/** @type {import('tailwindcss').Config} */
// Semua warna lewat token OKLCH di src/index.css (:root). Nama lama dipertahankan agar komponen tetap terbaca:
// nila = tinta, mori/kertas = kertas, mori-tua = garis, prada = aksen, soga/muted = teks sekunder.
const t = (v) => `oklch(var(${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', lap: '760px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        nila: { DEFAULT: t('--ink'), malam: t('--night'), 2: t('--ink-2') },
        mori: { DEFAULT: t('--paper'), tua: t('--rule') },
        kertas: t('--paper'),
        sumur: t('--paper-2'),
        garis: t('--rule'),
        prada: { DEFAULT: t('--accent'), tua: t('--accent-strong'), teks: t('--accent-ink') },
        soga: t('--muted'),
        muted: { DEFAULT: t('--muted'), gelap: t('--muted-dark') },
        pendar: { DEFAULT: t('--pendar'), teks: t('--pendar-ink') },
        tepat: t('--tepat'),
        hampir: { DEFAULT: t('--hampir'), teks: t('--hampir-ink') },
        perbaiki: { DEFAULT: t('--perbaiki'), teks: t('--perbaiki-ink'), terang: t('--perbaiki-light') },
        perak: t('--perak'),
        perunggu: t('--perunggu'),
        kunyit: t('--accent'),
        mengkudu: t('--perbaiki-ink'),
        daun: t('--pendar-ink'),
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        jawa: ['"Noto Sans Javanese"', 'serif'],
      },
      // taste: teks 400 dan 500 saja; judul 500. Kelas bold/extrabold dipetakan ke 500.
      fontWeight: { medium: '500', semibold: '500', bold: '500', extrabold: '500', black: '500' },
      borderRadius: { kartu: '20px', tombol: '999px' },
      maxWidth: { situs: '1280px' },
    },
  },
  plugins: [],
};
