# Obah Anyar

**Aplikasi Penyelaras Koreografi Tari melalui Estimasi Pose serta Klasifikasi Machine Learning dan Jaringan Saraf Tiruan.**
*Gerak warisan, cara belajar yang baru.*

Pelajar berlatih tari tradisional Nusantara bab per gerak di depan kamera. AI di browser membaca 33 titik tubuh (MediaPipe), menyelaraskannya dengan contoh maestro (DTW), lalu memberi skor wiraga/wirama dan koreksi per hitungan. Video pelajar **tidak pernah** keluar dari perangkat.

- Frontend: React 18 + TypeScript + Vite (PWA), React Router, TanStack Query, Zustand, Tailwind (token "Wastra Modern"), react-hook-form + zod.
- AI di browser: `@mediapipe/tasks-vision`, `@tensorflow/tfjs` (dimuat belakangan).
- Backend: Supabase (Auth, PostgreSQL + RLS, Storage, Edge Functions) region Singapura.
- Hosting: Vercel. CI: GitHub Actions.

---

## 1. Menjalankan lokal

Butuh Node 20+ (diuji di Node 24).

```bash
npm install          # juga menyalin WASM MediaPipe ke public/mediapipe/wasm
cp .env.example .env # boleh dibiarkan kosong untuk mode lokal
npm run dev          # http://localhost:5173
```

**Mode lokal (tanpa Supabase):** bila `VITE_SUPABASE_URL` kosong, aplikasi memakai data contoh (`src/lib/localData.ts`): 7 tarian, 3 gerak pemanasan sintetis untuk Jaipongan, dan papan skor berlabel "Data contoh". Di halaman **Masuk** tersedia tombol *Demo Pelajar / Maestro / Admin* untuk melihat semua halaman. Kamera butuh `localhost` atau HTTPS.

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run build` | typecheck + build produksi ke `dist/` |
| `npm test` | tes unit Vitest (modul pose + validasi form) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run gen:types` | buat ulang `src/types/database.types.ts` dari Supabase lokal |

## 2. Membuat proyek Supabase

1. Buat proyek di [supabase.com](https://supabase.com) → region **Southeast Asia (Singapore)**. Buat dua proyek terpisah: `staging` dan `prod`.
2. **Auth → Providers:** aktifkan Email (wajib konfirmasi email) dan Google (isi Client ID/Secret dari Google Cloud Console; redirect `https://<ref>.supabase.co/auth/v1/callback`).
3. **Auth → URL Configuration:** Site URL = domain Vercel; Redirect URLs tambahkan `https://<domain>/auth/callback` dan `https://<domain>/setel-ulang-sandi`.
4. **Auth → Attack Protection:** aktifkan CAPTCHA → Turnstile, isi *secret key*; aktifkan *leaked password protection* (bila paket mendukung). Password minimum 8, wajib huruf + angka.
5. **Auth → Email Templates:** salin isi `supabase/templates/*.html` (Bahasa Indonesia).
6. Ambil **Project URL** dan **anon key** (Settings → API) → isi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 3. Migrasi database

```bash
npm i -g supabase            # atau: npx supabase
supabase start               # Supabase lokal (Docker) + migrasi + seed.sql
supabase test db             # tes RLS pgTAP (supabase/tests)
supabase link --project-ref <ref>
supabase db push             # migrasi ke proyek yang di-link (seed TIDAK ikut)
```

Migrasi (urut): `0001_skema` (enum, tabel, indeks, trigger, view, RPC) → `0002_rls` (semua policy) → `0003_storage` (bucket + policy). Skema produksi **hanya** diubah lewat file di `supabase/migrations`.

**Admin pertama** (sekali, lewat SQL editor):
```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<email-admin>');
```

## 4. Edge Functions

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... TURNSTILE_SECRET_KEY=... ALLOWED_ORIGINS=https://<domain>
supabase secrets set RESEND_API_KEY=... EMAIL_FROM="Obah Anyar <noreply@domain>"   # opsional
supabase functions deploy
```

| Fungsi | Siapa | Ringkas |
|---|---|---|
| `submit-test` | pengguna masuk | validasi rentang & kecocokan gerak, 10/jam, tentukan `eligible`, simpan, kembalikan peringkat |
| `publish-step` | pemilik sanggar / admin | cek persetujuan, video, kerangka, durasi → `terbit` + audit |
| `create-sanggar` | maestro | sanggar baru (belum terverifikasi) + kode undangan |
| `join-sanggar` | pengguna masuk | gabung dengan kode, 10/jam |
| `verify-sanggar` | admin | verifikasi/tolak + email |
| `delete-account` | pengguna masuk | konfirmasi "HAPUS", hapus data & akun, audit tanpa data pribadi |
| `export-my-data` | pengguna masuk | JSON semua data milik pengguna |
| `report-content` | pengguna masuk | laporan konten, 20/hari |
| `moderate-name` | saat ubah nama | tolak kata terlarang (juga dijaga trigger DB) |

Semua galat: `{ "error": { "code": "...", "message": "pesan Bahasa Indonesia" } }`.

## 5. Deploy ke Vercel

1. Push repo ke GitHub → **Import** di Vercel (framework Vite terdeteksi; `vercel.json` sudah berisi header keamanan & rewrite SPA).
2. Isi Environment Variables (Production & Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SENTRY_DSN`, `VITE_POSE_MODEL`. Preview memakai proyek Supabase **staging**.
3. GitHub → Settings → Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` (prod) untuk job `deploy-db` di `.github/workflows/ci.yml`.
4. Bila domain Sentry/Supabase berbeda, sesuaikan `Content-Security-Policy` di `vercel.json`.

## 6. Yang perlu kamu isi

- `.env` / env Vercel: URL & anon key Supabase, site key Turnstile, DSN Sentry.
- Secrets Supabase: service role key, secret Turnstile, (opsional) Resend.
- Google OAuth Client ID/Secret.
- Placeholder di antarmuka: **[Nama maestro]**, **[Nama sanggar]**, **[HARGA]**, dan bagian berkurung siku di Kebijakan Privasi / Syarat (perlu ditinjau penasihat hukum).
- Deskripsi 7 tarian bertanda *draf* — perlu ditinjau sanggar.
- **Modul AI prototipe:** folder `src/pose/` belum dilampirkan, jadi berisi implementasi sementara dengan antarmuka yang sama (ditandai `TODO(prototipe)`). Timpa dengan `features.ts, compare.ts, feedback.ts, tracker.ts, landmarker.ts, draw.ts, session.ts` asli beserta 14 tesnya.
- Rekaman maestro asli untuk menggantikan 3 gerak pemanasan sintetis.

## 6b. Katalog per daerah & bagian

- Sumber tunggal: [src/data/katalog.ts](src/data/katalog.ts) berisi 7 daerah, 30 tarian, tingkat kesulitan, dan kerangka bagian.
- Aturan bagian: Pemula 3, Menengah 5, Mahir 7, Ahli 9 atau lebih. Semua bagian harus lulus (skor 70) berurutan sebelum tes akhir.
- Setelah mengubah katalog: `npm run gen:katalog` → `supabase/seed_katalog.sql`, lalu jalankan file itu di SQL Editor (atau `supabase db reset` di lokal).
- Gerak acuan maestro mengisi satu bagian (`steps.part_id`). Tes akhir hanya dinilai server bila semua bagian sudah terekam.
- Nama & fokus bagian masih **draf**; perlu ditinjau maestro.
- Pengecualian aturan jumlah bagian: tarian bertanda `rekaman: true` (saat ini **Pendet**, 5 bagian) memakai jumlah bagian dari rekaman acuannya, tingkat tetap.

## 6c. Rekaman acuan bawaan (Pendet) + musik iringan

- Aset di `public/tarian/pendet/`: per bab `bab-XX.mp4` (video 540p + suara), `bab-XX.m4a` (lagu iringan), `bab-XX.json` (kerangka 33 titik, 15 fps). Data bab di [src/data/rekaman.ts](src/data/rekaman.ts); nama & fokus bab di `katalog.ts`.
- Path berawalan `static:` dibaca langsung dari `public/` (lihat `src/lib/media.ts`), di mode lokal maupun Supabase.
- Lagu diputar selama "Tonton contoh", "Mulai coba", dan tes akhir, ikut kecepatan 0,5×/0,75×/1×. Tombol **Musik** (latihan) dan kotak centang (tes) menyimpan pilihan di perangkat.
- 1 hitungan ≈ 1,16 detik (2 ketukan lagu ±103 ketukan/menit, deteksi otomatis). Gerak lebih dari 16 hitungan ditampilkan per "delapan hitungan".
- Mode Supabase: jalankan migrasi `20261120000007_rekaman_audio.sql` (kolom `steps.audio_path`, batas hitungan 64), lalu `npm run gen:katalog` dan jalankan `supabase/seed_katalog.sql` (sudah berisi 5 gerak Pendet).
- **Wajib sebelum publik:** video Pendet dari YouTube (penari Adira Visca Nurjanah); minta izin pemiliknya, lalu perbarui `sumber` di `rekaman.ts`. Nama bab deskriptif; istilah gerak perlu ditinjau maestro tari Bali.

## 7. Status fitur

**Sudah berfungsi**
- Antarmuka Wastra Modern: Beranda, Detail tarian, Latihan per bab (kamera + kerangka berwarna, contoh maestro, 0,5×/0,75×/1×, skor & koreksi langsung, hasil percobaan), Tes akhir (aturan, hitung mundur, banner antar-gerak), Hasil tes + papan skor (Minggu ini / Sepanjang masa / Sanggarku), Mode Maestro (rekam kamera / unggah video, REC, deteksi badan %, persetujuan penari, Draf → Menunggu tinjauan → Terbit, urutkan, ekspor/impor paket), Profil, Pengaturan (nama, foto, kata sandi, keluar semua perangkat, unduh data, hapus akun), Dasbor sanggar (tampilan), Admin sederhana, Cara kerja, Syarat, Privasi, 403/404/galat.
- Kondisi: memuat model AI, izin kamera ditolak, kamera tidak ada, kesiapan badan, lebih dari satu orang, lulus/belum lulus, bab & tes terkunci, tarian tanpa rekaman, papan skor kosong, modal "Masuk dulu", email belum terverifikasi, sesi kedaluwarsa, sanggar menunggu verifikasi, offline (antrean kiriman skor), skeleton loader.
- Auth: email + kata sandi (verifikasi email), Google, Turnstile, lupa/setel ulang sandi, onboarding per peran, data anak (<17 butuh wali), mode tamu + pindahkan kemajuan lokal ke akun, guard rute.
- Database: skema lengkap, RLS semua tabel, view `step_progress`, RPC `get_leaderboard`/`get_my_rank`, trigger `handle_new_user`, pelindung kolom, moderasi nama, Storage + policy, seed, tes RLS pgTAP.
- Edge Functions P0 & P1 di atas. PWA, header keamanan, Sentry dengan penyaringan data pribadi, CI.

**Tahap berikut**
- Hitung ulang skor tes di server dari data kerangka (P2, kerangka TODO ada di `submit-test`).
- Deteksi properti (Object Detector) dan pelatihan model klasifikasi di Colab → `ai_models` (pemuat model klasifikasi sudah ada: `useMoveClassifier`).
- Dasbor sanggar lengkap (kemajuan murid lewat view khusus), kelas daring berbayar (Midtrans/Xendit), penilaian wirasa oleh pelatih, tantangan mingguan, sertifikat.
- Tes end-to-end Playwright dengan kamera palsu & axe (belum ditulis).
- Template email undangan sanggar via Resend (fungsi kirim email sudah ada).

## Struktur

```
src/pose/        modul AI (sementara, lihat TODO)      src/features/  auth, dances, practice, test,
src/components/  Navbar, CameraStage, ReferencePlayer…                leaderboard, maestro, sanggar,
src/lib/         supabase, queries, offlineQueue, sentry               profile, admin, info
supabase/        migrations, functions, seed.sql, tests, templates
```
