import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';

function Doc({ label, title, updated, children }: { label: string; title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="wadah py-12">
      <article className="mx-auto max-w-3xl">
        <span className="label-kecil text-soga">{label}</span>
        <h1 className="mt-2 text-[36px] sm:text-[44px]">{title}</h1>
        {updated && <p className="mt-2 text-[14px] text-muted">Terakhir diperbarui: {updated}</p>}
        <div className="prosa mt-8 space-y-5 text-[16px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-[22px] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">{children}</div>
      </article>
    </main>
  );
}

const DraftNote = () => (
  <p className="flex gap-3 rounded-[10px] border border-hampir/50 bg-hampir/10 p-4 text-[14px] font-semibold text-hampir-teks">
    <Icon name="info" size={18} className="mt-0.5 shrink-0" />Draf. Perlu ditinjau penasihat hukum sebelum aplikasi dibuka untuk umum. Bagian dalam kurung siku wajib diisi.
  </p>
);

export function HowItWorksPage() {
  return (
    <Doc label="Cara kerja & privasi" title="Apa yang terjadi saat kamu menari di depan kamera">
      <h2>1. Kamera dan estimasi pose, di perangkatmu</h2>
      <p>Saat kamu menekan "Nyalakan kamera", peramban memuat model MediaPipe Pose Landmarker (sekali saja, lalu tersimpan). Model membaca 33 titik tubuh dari setiap cuplikan video. Seluruh proses ini terjadi di perangkatmu. Video tidak pernah diunggah ke server Obah Anyar.</p>
      <h2>2. Penyelarasan dengan contoh maestro</h2>
      <p>Dari titik tubuh dihitung sudut 10 segmen (lengan atas, siku, paha, betis, badan, bahu). Urutan sudutmu diselaraskan dengan urutan sudut contoh maestro memakai Dynamic Time Warping, supaya gerak yang sedikit lebih cepat atau lambat tetap bisa dibandingkan.</p>
      <h2>3. Skor dan koreksi</h2>
      <ul>
        <li><b>Wiraga</b>: seberapa mirip bentuk gerakmu dengan contoh.</li>
        <li><b>Wirama</b>: seberapa tepat waktunya terhadap hitungan.</li>
        <li><b>Koreksi per hitungan</b>: bagian tubuh dengan selisih terbesar pada hitungan terlemah, maksimal 3 koreksi.</li>
        <li><b>Wirasa</b> (penjiwaan) tidak dinilai AI dan tetap butuh pelatih.</li>
      </ul>
      <h2>4. Klasifikasi gerak (bila tersedia)</h2>
      <p>Untuk tarian yang sudah punya model, jaringan saraf tiruan kecil (TensorFlow.js) menebak ragam gerak yang sedang kamu lakukan, juga di perangkat.</p>
      <h2>5. Apa yang dikirim ke server</h2>
      <ul>
        <li>Bila masuk akun: skor percobaan per bab (angka) agar kemajuanmu tersimpan.</li>
        <li>Bila kamu menekan "Kirim ke papan skor": skor tes akhir dan nama tampilan.</li>
        <li>Tidak pernah: video atau foto kamera pelajar.</li>
      </ul>
      <p><Link to="/privasi" className="font-bold underline underline-offset-4">Baca Kebijakan Privasi lengkap</Link></p>
    </Doc>
  );
}

export function PrivacyPage() {
  return (
    <Doc label="Kebijakan Privasi" title="Kebijakan Privasi Obah Anyar" updated="19 November 2026">
      <DraftNote />
      <p>Kebijakan ini disusun mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Pengendali data: [Nama badan/tim pengelola], [alamat], kontak: [email kontak privasi].</p>
      <h2>Data yang kami kumpulkan</h2>
      <ul>
        <li>Akun: alamat email, nama tampilan, peran (pelajar/maestro/guru), foto profil bila diunggah, nama sekolah bila diisi.</li>
        <li>Kemajuan: skor percobaan per bab dan skor tes akhir (angka). Tanpa video.</li>
        <li>Maestro: rekaman gerak acuan dan data kerangka, serta catatan persetujuan penari.</li>
        <li>Teknis: log galat tanpa email, kata sandi, atau token.</li>
      </ul>
      <h2>Yang tidak kami kumpulkan</h2>
      <p>Video kamera pelajar diproses di perangkat dan tidak pernah dikirim ke server.</p>
      <h2>Dasar dan tujuan pemrosesan</h2>
      <p>Persetujuan saat mendaftar, untuk: menyediakan latihan, menyimpan kemajuan, menampilkan papan skor (nama tampilan dan skor), serta keamanan layanan.</p>
      <h2>Anak di bawah 17 tahun</h2>
      <p>Pengguna di bawah 17 tahun wajib mendapat persetujuan orang tua/wali, atau akunnya dibuat oleh guru.</p>
      <h2>Hakmu</h2>
      <ul>
        <li>Mengunduh semua datamu (Pengaturan → Unduh data saya).</li>
        <li>Menghapus akun beserta datanya (Pengaturan → Hapus akun).</li>
        <li>Mengubah nama tampilan dan foto kapan saja.</li>
      </ul>
      <h2>Penyimpanan dan keamanan</h2>
      <p>Data disimpan di Supabase region Asia Tenggara (Singapura), dengan pembatasan akses per baris (Row Level Security) dan koneksi terenkripsi (HTTPS). Cadangan harian disimpan [periode retensi].</p>
      <h2>Pihak ketiga</h2>
      <p>Supabase (basis data & autentikasi), Vercel (hosting), Google (login Google & berkas model pose), Cloudflare Turnstile (pencegahan bot), Sentry (pemantauan galat dengan penyaringan data pribadi).</p>
    </Doc>
  );
}

export function TermsPage() {
  return (
    <Doc label="Syarat & Ketentuan" title="Syarat & Ketentuan Penggunaan" updated="19 November 2026">
      <DraftNote />
      <h2>1. Layanan</h2>
      <p>Obah Anyar adalah alat bantu belajar tari. Skor AI bersifat pendukung dan tidak menggantikan penilaian pelatih.</p>
      <h2>2. Akun</h2>
      <p>Kamu bertanggung jawab menjaga kerahasiaan kata sandi. Nama tampilan tidak boleh mengandung kata kasar, SARA, atau menyamar sebagai orang lain.</p>
      <h2>3. Keselamatan</h2>
      <p>Pastikan ruang latihan aman dan lapang. Hentikan latihan bila merasa sakit.</p>
      <h2>4. Konten maestro</h2>
      <p>Sanggar menjamin rekaman dibuat dengan persetujuan penari dan, untuk gerak upacara adat, dengan izin pemangku adat. Hak cipta rekaman tetap milik [pemegang hak]; sanggar memberi lisensi kepada Obah Anyar untuk menampilkannya di aplikasi.</p>
      <h2>5. Papan skor</h2>
      <p>Skor yang terindikasi curang dapat dihapus. Kami dapat mengubah nama tampilan yang melanggar ketentuan.</p>
      <h2>6. Hukum yang berlaku</h2>
      <p>Hukum Republik Indonesia. Kontak: [email kontak].</p>
    </Doc>
  );
}
