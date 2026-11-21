# DESIGN.md: Obah Anyar

Mengikuti aturan **taste-skill** (`design-taste-frontend`, github.com/leonxlnx/taste-skill), diterapkan manual; skrip `gate.mjs`, `consistency.mjs`, dan pembagi palet/huruf belum dijalankan.

**Jenis situs:** software (AI di browser). Karena itu efek taste untuk software dipakai: hero gelap (evening grade), aurora, pola bercahaya, satu momen hitung naik.
**Rasa:** berwarna, berbudaya, modern-futuristik, tetap enak dipakai tiap hari.

## Ground dan warna (src/index.css, OKLCH)
| Peran | Token | Nilai |
|---|---|---|
| g-main (langit lembut, bukan putih) | `--paper` | 96.6% 0.014 240 |
| g-alt | `--paper-2` | 92.8% 0.022 240 |
| g-dark (malam nila) | `--night` | 17% 0.045 258 |
| Tinta | `--ink` | 20% 0.035 256 |
| Aksen prada (satu-satunya isi tombol) | `--accent` | 79% 0.14 80 |
| Aurora hero | `--au1..4` | teal 190, emas 78, mengkudu 28, tarum 250; di halaman daerah/tarian diganti warna kain daerahnya |

Hue nila dijaga di 255–258 (taste melarang ungu 270–330). Warna besar datang dari **kain daerah** (konten), bukan dari chrome antarmuka.

## Huruf
- Judul: **Bricolage Grotesque** 500 (sumbu opsz), jarak huruf −2.8% sampai −4%.
- Teks: **Geist** 400/500. Angka: **Geist Mono** 500, tabular.
- Tanpa 700/800; hierarki dibawa ukuran dan tracking. h1 72/38, h2 48/30, h3 28/24, lead 20/18, isi 16, label 13.
- Noto Sans Javanese hanya hiasan aksara di bawah logo dan kartu tes akhir.

## Navigasi
- Header gelap opak (`nav--tone`), tinggi 72px (56px HP), garis rambut, tanpa blur atau pil mengambang.
- Kata benda tunggal: Tarian, Peringkat, Panduan, Sanggar. Halaman aktif: garis emas 2px.
- "Tarian" membuka panel datar (setelah 150ms) berisi 7 daerah dengan potongan kainnya + Pemanasan Dasar.
- HP: lembar layar penuh dengan baris 56px.

## Komposisi Beranda
Hero split di langit malam (teks 5 kolom, contoh gerak sungguhan 7 kolom dalam bingkai bercahaya) · angka katalog (momen hitung naik) · kartu daerah bersampul kain besar · langkah bergaris di g-alt · tabel prinsip dengan penanda warna · pita malam dengan buku kain 7 daerah · satu pita merek prada · footer gelap.

## Gerak
- Masuk hero sekali per kunjungan: judul naik per baris dari masker (700ms, jeda 80ms), lalu lead/tombol/fakta naik 12px (520ms, jeda 60ms), bingkai dari 0.98.
- Satu momen: angka naik 1000ms saat terlihat.
- Aurora bergerak lambat (28–34 dtk) dengan tombol jeda 32px di kanan bawah; contoh gerak di hero punya tombol jeda sendiri.
- Hover: tombol naik 1px, kartu naik 2px + garis menggelap, kain di kartu zoom 1.03 (600ms masuk, 400ms keluar), tautan bergaris tumbuh kiri ke kanan. Tekan: turun 1px, skala 0.985.
- Tidak ada reveal saat gulir. Semua efek diam dengan reduced-motion.

## Permukaan
Kartu 20px, bagian dalam 12px, tombol pil. Kartu bertaut: garis 1px, bayangan lembut hanya saat hover. Satu tombol terisi per tampilan.

## Kain per daerah (`src/lib/wastra.ts`)
Bali: Kain Poleng · Jawa Barat: Batik Priangan · DKI Jakarta: Batik Betawi · Jawa Timur: Merak Ponorogo · Sumatera Utara: Ulos Batak · Sumatera Barat: Songket Minangkabau · Aceh: Kerawang Aceh · Pemanasan: Lurik.

## Aksesibilitas
Target sentuh ≥ 44px · teks isi 16px · warna selalu disertai teks · breadcrumb Daerah › Tarian › Bagian · fokus 2px emas (di gelap) / amber gelap (di terang).
