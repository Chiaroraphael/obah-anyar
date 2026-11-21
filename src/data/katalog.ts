/**
 * Katalog tarian per daerah + kerangka bagian (kurikulum) per tarian.
 * Sumber tunggal untuk mode lokal (src/lib/localData.ts) dan seed Supabase
 * (scripts/gen-katalog-sql.ts). File ini sengaja tanpa import agar bisa
 * dijalankan langsung oleh Node (`node scripts/gen-katalog-sql.ts`).
 *
 * PENTING: deskripsi tarian dan nama/fokus bagian adalah DRAF untuk uji coba.
 * Wajib ditinjau dan disempurnakan maestro sanggar sebelum diterbitkan.
 * Jumlah bagian mengikuti tingkat kesulitan: makin sulit, makin banyak bagian.
 */

export type Tingkat = 1 | 2 | 3 | 4;
export type Postur = 'berdiri' | 'duduk';
export type Properti = 'piring' | 'topeng_reog' | 'kipas' | 'selendang' | 'payung' | 'topeng' | 'bokor' | 'kuda_kepang';

export interface DaerahData { id: string; name: string; province: string; kain: string; sort: number }
export interface BagianData { name: string; focus: string; counts: number }
export interface TarianData {
  id: string;
  name: string;
  region: string; // id daerah
  suku: string;
  summary: string;
  posture: Postur;
  accompaniment: string;
  tingkat: Tingkat;
  props?: { kind: Properti; label: string; note: string }[];
  note?: string;
  /** Nama bagian khusus (opsional). Bila kosong, memakai kerangka bawaan sesuai tingkat. */
  bagian?: BagianData[];
  /**
   * true bila bagian mengikuti rekaman acuan yang sudah ada (src/data/rekaman.ts).
   * Jumlah bagiannya mengikuti rekaman, bukan aturan jumlah bagian per tingkat.
   */
  rekaman?: boolean;
}

export const TINGKAT: Record<Tingkat, { label: string; bagian: number; keterangan: string }> = {
  1: { label: 'Pemula', bagian: 3, keterangan: '3 bagian. Gerak sederhana dan berulang, cocok untuk mulai.' },
  2: { label: 'Menengah', bagian: 5, keterangan: '5 bagian. Ragam gerak lebih banyak dan perpindahan lebih cepat.' },
  3: { label: 'Mahir', bagian: 7, keterangan: '7 bagian. Koordinasi tangan, kaki, dan kepala lebih rumit.' },
  4: { label: 'Ahli', bagian: 9, keterangan: '9 bagian atau lebih. Gerak halus, panjang, dan butuh penjiwaan.' },
};

export const DAERAH: DaerahData[] = [
  { id: 'bali', name: 'Bali', province: 'Bali', kain: 'Kain Poleng', sort: 1 },
  { id: 'jawa-barat', name: 'Jawa Barat', province: 'Jawa Barat', kain: 'Batik Priangan', sort: 2 },
  { id: 'dki-jakarta', name: 'DKI Jakarta', province: 'DKI Jakarta', kain: 'Batik Betawi', sort: 3 },
  { id: 'jawa-timur', name: 'Jawa Timur', province: 'Jawa Timur', kain: 'Merak Ponorogo', sort: 4 },
  { id: 'sumatera-utara', name: 'Sumatera Utara', province: 'Sumatera Utara', kain: 'Ulos Batak', sort: 5 },
  { id: 'sumatera-barat', name: 'Sumatera Barat', province: 'Sumatera Barat', kain: 'Songket Minangkabau', sort: 6 },
  { id: 'aceh', name: 'Aceh', province: 'Aceh', kain: 'Kerawang Aceh', sort: 7 },
];

const b = (name: string, focus: string, counts = 8): BagianData => ({ name, focus, counts });

/** Kerangka bawaan per tingkat (dipakai bila tarian tidak punya nama bagian khusus). */
export function kerangkaBawaan(t: Tingkat, posture: Postur): BagianData[] {
  const sikap = posture === 'duduk'
    ? b('Sikap duduk dasar', 'Posisi duduk, punggung tegak, dan letak tangan sebelum mulai menari.')
    : b('Sikap dasar', 'Posisi kaki, lutut, badan, dan tangan yang benar sebelum menari.');
  const pembuka = b('Gerak pembuka', 'Salam atau gerak awal yang membuka tarian.');
  const inti = (n: number) => b(`Ragam inti ${['I', 'II', 'III', 'IV', 'V'][n - 1]}`, `Rangkaian gerak utama bagian ${n}: hafalkan urutan per hitungan.`);
  const peralihan = b('Peralihan & pola lantai', 'Menyambung ragam gerak dan berpindah tempat dengan halus.');
  const ekspresi = b('Ekspresi & penjiwaan', 'Pandangan mata, raut wajah, dan rasa gerak sesuai karakter tarian.');
  const penutup = b('Gerak penutup', 'Gerak akhir dan sikap penutup tarian.');
  if (t === 1) return [sikap, b('Ragam gerak inti', 'Rangkaian gerak utama yang diulang-ulang.'), penutup];
  if (t === 2) return [sikap, pembuka, inti(1), inti(2), penutup];
  if (t === 3) return [sikap, pembuka, inti(1), inti(2), inti(3), peralihan, penutup];
  return [sikap, pembuka, inti(1), inti(2), inti(3), inti(4), peralihan, ekspresi, penutup];
}

export const TARIAN: TarianData[] = [
  /* ---------------------------------------------------------------- Bali */
  {
    id: 'pendet', name: 'Pendet', region: 'bali', suku: 'Bali', tingkat: 1, posture: 'berdiri', accompaniment: 'Gamelan Bali',
    summary: 'Tari penyambutan Bali yang dibawakan penari putri sambil membawa bokor berisi bunga.',
    props: [{ kind: 'bokor', label: 'Bokor bunga', note: 'Boleh memakai mangkuk plastik saat belajar' }],
    // 5 bab mengikuti video referensi (src/data/rekaman.ts). Nama bab deskriptif, istilah gerak perlu ditinjau maestro.
    rekaman: true,
    bagian: [
      b('Pembuka: sikap awal membawa bokor', 'Menghadap depan dengan bokor di depan dada; gerak kepala, mata, dan tangan yang halus di tempat.', 33),
      b('Berbalik dan bokor ke samping', 'Berbalik lalu kembali menghadap depan; bokor dibawa ke samping, tangan lain di pinggang, badan condong.', 36),
      b('Bokor di sisi, tangan direntang', 'Bokor dipegang di satu sisi, tangan lain direntang ke samping atas sambil berat badan berpindah.', 35),
      b('Rentang lengan lebar', 'Bokor dijulurkan jauh ke samping, tangan lain direntangkan; badan condong mengikuti arah bokor.', 29),
      b('Menabur bunga dan penutup', 'Bokor di depan dada, menaburkan bunga ke atas, berputar, lalu berjalan keluar.', 31),
    ],
  },
  {
    id: 'kecak', name: 'Kecak', region: 'bali', suku: 'Bali', tingkat: 2, posture: 'duduk', accompaniment: 'Suara "cak" para penari',
    summary: 'Tari Bali yang dibawakan kelompok penari duduk melingkar dengan seruan "cak" berirama, mengangkat kisah Ramayana.',
    bagian: [
      b('Sikap duduk melingkar', 'Duduk bersila tegak, siap mengikuti aba-aba pemimpin kelompok.'),
      b('Seruan cak & irama', 'Menjaga ketukan seruan "cak" agar serempak dengan kelompok.'),
      b('Gerak tangan serempak', 'Mengangkat dan menggetarkan jari tangan ke atas dan ke depan.'),
      b('Gerak badan bergelombang', 'Condong ke kiri, kanan, dan belakang mengikuti alur cerita.'),
      b('Penutup', 'Gerak akhir dan diam bersama sesuai aba-aba.'),
    ],
  },
  {
    id: 'janger', name: 'Janger', region: 'bali', suku: 'Bali', tingkat: 2, posture: 'duduk', accompaniment: 'Gamelan & nyanyian bersahutan',
    summary: 'Tari pergaulan Bali yang dibawakan berkelompok oleh muda-mudi sambil bernyanyi bersahutan.',
  },
  {
    id: 'condong', name: 'Condong', region: 'bali', suku: 'Bali', tingkat: 3, posture: 'berdiri', accompaniment: 'Gamelan Semar Pagulingan',
    summary: 'Peran dayang yang membuka pertunjukan Legong, dengan gerak lincah dan ekspresif.',
    props: [{ kind: 'kipas', label: 'Kipas', note: 'Kipas latihan apa saja' }],
    bagian: [
      b('Agem kanan & kiri', 'Sikap dasar putri Bali dengan berat badan di kaki kanan lalu kiri.'),
      b('Gerak pembuka', 'Masuk ke panggung dengan langkah kecil dan lirikan mata.'),
      b('Tandang', 'Rangkaian gerak berpindah tempat.'),
      b('Tangkis', 'Gerak peralihan antar-ragam dengan putaran pergelangan tangan.'),
      b('Gerak kipas', 'Membuka, menggetarkan, dan menutup kipas sesuai hitungan.'),
      b('Tangkep (ekspresi)', 'Seledet (lirikan mata) dan ekspresi wajah.'),
      b('Penutup', 'Gerak akhir menyerahkan panggung kepada penari Legong.'),
    ],
  },
  {
    id: 'barong', name: 'Barong', region: 'bali', suku: 'Bali', tingkat: 3, posture: 'berdiri', accompaniment: 'Gamelan Bali',
    summary: 'Dramatari Bali yang menampilkan Barong, makhluk mitologis pelindung, dibawakan dua penari dalam satu kostum.',
    props: [{ kind: 'topeng', label: 'Topeng Barong', note: 'Tidak wajib untuk latihan gerak dasar' }],
  },
  {
    id: 'legong', name: 'Legong', region: 'bali', suku: 'Bali', tingkat: 4, posture: 'berdiri', accompaniment: 'Gamelan Semar Pagulingan',
    summary: 'Tari klasik Bali dengan gerak halus, cepat, dan rumit, biasanya dibawakan dua atau tiga penari putri.',
    props: [{ kind: 'kipas', label: 'Kipas', note: 'Kipas latihan apa saja' }],
  },

  /* ---------------------------------------------------------- Jawa Barat */
  {
    id: 'ketuk-tilu', name: 'Ketuk Tilu', region: 'jawa-barat', suku: 'Sunda', tingkat: 1, posture: 'berdiri', accompaniment: 'Rebab, kendang, dan ketuk',
    summary: 'Tari pergaulan Sunda yang menjadi salah satu akar Jaipongan, diiringi tiga buah ketuk.',
  },
  {
    id: 'jaipong', name: 'Jaipongan', region: 'jawa-barat', suku: 'Sunda', tingkat: 2, posture: 'berdiri', accompaniment: 'Kendang, rebab, dan gamelan Sunda',
    summary: 'Tari pergaulan Sunda yang lincah, berakar dari ketuk tilu, pencak silat, dan topeng banjet.',
    bagian: [
      b('Sikap dasar', 'Kuda-kuda rendah, badan tegak, dan posisi tangan khas Jaipongan.'),
      b('Bukaan', 'Gerak pembuka setelah penari masuk panggung.'),
      b('Pencugan', 'Kumpulan ragam gerak inti dengan hentakan kendang.'),
      b('Nibakeun', 'Gerak penegas yang jatuh tepat pada pukulan kendang.'),
      b('Mincid', 'Gerak berpindah tempat dengan langkah lincah.'),
    ],
  },
  {
    id: 'merak', name: 'Merak', region: 'jawa-barat', suku: 'Sunda', tingkat: 2, posture: 'berdiri', accompaniment: 'Gamelan Sunda',
    summary: 'Tari kreasi Sunda yang menggambarkan keindahan burung merak, dengan selendang seperti sayap.',
    props: [{ kind: 'selendang', label: 'Selendang', note: 'Selendang atau kain panjang' }],
  },
  {
    id: 'topeng-cirebon', name: 'Topeng Cirebon', region: 'jawa-barat', suku: 'Cirebon', tingkat: 4, posture: 'berdiri', accompaniment: 'Gamelan Cirebon',
    summary: 'Tari bertopeng dari Cirebon dengan beberapa karakter, dari yang paling halus hingga paling gagah.',
    props: [{ kind: 'topeng', label: 'Topeng', note: 'Latihan awal tanpa topeng' }],
    bagian: [
      b('Sikap dasar', 'Sikap kaki, badan, dan tangan untuk semua karakter.'),
      b('Karakter Panji', 'Gerak paling halus dan tenang.'),
      b('Karakter Samba', 'Gerak lincah dan jenaka.'),
      b('Karakter Rumyang', 'Gerak luwes di antara halus dan gagah.'),
      b('Karakter Tumenggung', 'Gerak tegas dan berwibawa.'),
      b('Karakter Klana', 'Gerak paling gagah dan kasar.'),
      b('Peralihan antar-karakter', 'Berganti karakter tanpa kehilangan irama.'),
      b('Ekspresi & penjiwaan', 'Menghidupkan karakter melalui gerak kepala dan badan.'),
      b('Gerak penutup', 'Gerak akhir pertunjukan.'),
    ],
  },

  /* --------------------------------------------------------- DKI Jakarta */
  {
    id: 'sirih-kuning', name: 'Sirih Kuning', region: 'dki-jakarta', suku: 'Betawi', tingkat: 1, posture: 'berdiri', accompaniment: 'Gambang kromong',
    summary: 'Tari pergaulan Betawi yang ceria, biasanya ditarikan berpasangan.',
  },
  {
    id: 'lenggang-nyai', name: 'Lenggang Nyai', region: 'dki-jakarta', suku: 'Betawi', tingkat: 1, posture: 'berdiri', accompaniment: 'Gambang kromong',
    summary: 'Tari kreasi Betawi dengan gerak lenggang yang luwes dan ceria.',
    props: [{ kind: 'selendang', label: 'Selendang', note: 'Selendang atau kain panjang' }],
  },
  {
    id: 'yapong', name: 'Yapong', region: 'dki-jakarta', suku: 'Betawi', tingkat: 2, posture: 'berdiri', accompaniment: 'Musik Betawi',
    summary: 'Tari kreasi Betawi yang dinamis dan penuh semangat.',
  },
  {
    id: 'ronggeng-blantek', name: 'Ronggeng Blantek', region: 'dki-jakarta', suku: 'Betawi', tingkat: 2, posture: 'berdiri', accompaniment: 'Musik topeng blantek',
    summary: 'Tari Betawi yang biasa tampil sebagai pembuka pertunjukan topeng blantek.',
  },
  {
    id: 'topeng-betawi', name: 'Topeng Betawi', region: 'dki-jakarta', suku: 'Betawi', tingkat: 3, posture: 'berdiri', accompaniment: 'Gamelan topeng Betawi',
    summary: 'Tari bertopeng khas Betawi dengan gerak gagah sekaligus jenaka.',
    props: [{ kind: 'topeng', label: 'Topeng', note: 'Latihan awal tanpa topeng' }],
  },

  /* ---------------------------------------------------------- Jawa Timur */
  {
    id: 'jaranan', name: 'Jaranan', region: 'jawa-timur', suku: 'Jawa', tingkat: 1, posture: 'berdiri', accompaniment: 'Gamelan jaranan',
    summary: 'Tari rakyat Jawa Timur yang ditarikan dengan kuda kepang dari anyaman bambu.',
    props: [{ kind: 'kuda_kepang', label: 'Kuda kepang', note: 'Tidak wajib untuk latihan gerak dasar' }],
  },
  {
    id: 'gandrung', name: 'Gandrung Banyuwangi', region: 'jawa-timur', suku: 'Osing', tingkat: 2, posture: 'berdiri', accompaniment: 'Gamelan Osing',
    summary: 'Tari pergaulan khas Banyuwangi yang dibawakan penari putri dengan kipas.',
    props: [{ kind: 'kipas', label: 'Kipas', note: 'Kipas latihan apa saja' }],
  },
  {
    id: 'remo', name: 'Remo', region: 'jawa-timur', suku: 'Jawa', tingkat: 3, posture: 'berdiri', accompaniment: 'Gamelan Jawa Timuran',
    summary: 'Tari penyambutan Jawa Timur yang gagah, dengan gongseng (lonceng kecil) di pergelangan kaki.',
    props: [{ kind: 'selendang', label: 'Sampur', note: 'Selendang di pinggang' }],
  },
  {
    id: 'reog', name: 'Reog Ponorogo', region: 'jawa-timur', suku: 'Jawa', tingkat: 4, posture: 'berdiri', accompaniment: 'Gamelan reog (kendang, kenong, slompret)',
    summary: 'Seni pertunjukan Ponorogo dengan topeng dadak merak yang besar dan gagah, terdiri atas beberapa tokoh.',
    props: [{ kind: 'topeng_reog', label: 'Topeng dadak merak', note: 'Tidak wajib untuk latihan gerak dasar' }],
  },

  /* ------------------------------------------------------ Sumatera Utara */
  {
    id: 'piso-surit', name: 'Piso Surit', region: 'sumatera-utara', suku: 'Karo', tingkat: 1, posture: 'berdiri', accompaniment: 'Lagu Piso Surit',
    summary: 'Tari Karo yang diiringi lagu Piso Surit, dengan gerak tangan yang lembut.',
  },
  {
    id: 'tortor', name: 'Tor-Tor', region: 'sumatera-utara', suku: 'Batak', tingkat: 2, posture: 'berdiri', accompaniment: 'Gondang',
    summary: 'Tari Batak yang ditarikan bersama dengan gerak tangan dan hentakan kaki yang khidmat.',
    note: 'Sebagian ragam Tor-Tor terkait upacara; gerak upacara hanya diterbitkan dengan izin pemangku adat.',
    bagian: [
      b('Pangurdot', 'Gerak kaki dan tumit yang menghentak pelan mengikuti gondang.'),
      b('Pangeal', 'Gerak pinggang dan badan yang mengayun.'),
      b('Pandenggal', 'Gerak tangan dan lengan, telapak terbuka ke depan.'),
      b('Siangkupna', 'Gerak leher yang menyertai gerak tangan.'),
      b('Hapunanna', 'Ekspresi wajah dan penjiwaan sebagai penutup.'),
    ],
  },
  {
    id: 'serampang-12', name: 'Serampang Dua Belas', region: 'sumatera-utara', suku: 'Melayu', tingkat: 4, posture: 'berdiri', accompaniment: 'Musik Melayu (biola, akordeon, gendang)',
    summary: 'Tari Melayu yang ditarikan berpasangan dengan dua belas ragam gerak berurutan.',
    props: [{ kind: 'selendang', label: 'Sapu tangan/selendang', note: 'Dipakai pada ragam tertentu' }],
    bagian: Array.from({ length: 12 }, (_, i) => b(`Ragam ${i + 1}`, i === 0 ? 'Langkah dan sikap dasar berpasangan.' : i === 11 ? 'Ragam terakhir dan penutup tarian.' : `Ragam gerak ke-${i + 1}; nama ragam diisi maestro.`)),
  },

  /* ------------------------------------------------------ Sumatera Barat */
  {
    id: 'payung', name: 'Tari Payung', region: 'sumatera-barat', suku: 'Minangkabau', tingkat: 1, posture: 'berdiri', accompaniment: 'Talempong dan saluang',
    summary: 'Tari Minangkabau berpasangan yang memakai payung sebagai properti.',
    props: [{ kind: 'payung', label: 'Payung', note: 'Payung lipat kecil' }],
  },
  {
    id: 'pasambahan', name: 'Pasambahan', region: 'sumatera-barat', suku: 'Minangkabau', tingkat: 2, posture: 'berdiri', accompaniment: 'Talempong dan gandang',
    summary: 'Tari penyambutan tamu kehormatan dalam adat Minangkabau.',
  },
  {
    id: 'indang', name: 'Indang', region: 'sumatera-barat', suku: 'Minangkabau', tingkat: 2, posture: 'duduk', accompaniment: 'Rebana kecil (indang) dan syair',
    summary: 'Tari duduk Minangkabau bernuansa Islami dengan rebana kecil dan syair.',
  },
  {
    id: 'piring', name: 'Tari Piring', region: 'sumatera-barat', suku: 'Minangkabau', tingkat: 3, posture: 'berdiri', accompaniment: 'Talempong dan saluang',
    summary: 'Tari Minangkabau dengan piring di kedua telapak tangan yang diayunkan cepat dan lincah.',
    props: [{ kind: 'piring', label: 'Piring', note: 'Pakai piring plastik saat belajar' }],
  },

  /* ---------------------------------------------------------------- Aceh */
  {
    id: 'ranup-lampuan', name: 'Ranup Lampuan', region: 'aceh', suku: 'Aceh', tingkat: 1, posture: 'berdiri', accompaniment: 'Serune kalee dan rapa\'i',
    summary: 'Tari penyambutan Aceh dengan puan berisi sirih (ranup) untuk tamu.',
    props: [{ kind: 'bokor', label: 'Puan sirih', note: 'Boleh memakai wadah kecil' }],
  },
  {
    id: 'ratoh-jaroe', name: 'Ratoh Jaroe', region: 'aceh', suku: 'Aceh', tingkat: 3, posture: 'duduk', accompaniment: "Rapa'i dan syair",
    summary: 'Tari duduk berbaris dari Aceh dengan gerak tangan dan badan yang cepat dan serempak.',
  },
  {
    id: 'seudati', name: 'Seudati', region: 'aceh', suku: 'Aceh', tingkat: 3, posture: 'berdiri', accompaniment: 'Syair, petikan jari, dan tepukan dada',
    summary: 'Tari Aceh yang dinamis tanpa alat musik; iringannya dari syair, petikan jari, dan tepukan dada.',
  },
  {
    id: 'saman', name: 'Saman', region: 'aceh', suku: 'Gayo', tingkat: 4, posture: 'duduk', accompaniment: 'Nyanyian dan tepukan para penari',
    summary: 'Tari Gayo yang ditarikan duduk berbaris rapat dengan tepukan dan gerak kepala yang sangat cepat dan serempak.',
  },
];

/** Tarian khusus pemanasan (gerak sintetis untuk uji alur aplikasi). */
export const PEMANASAN: TarianData = {
  id: 'pemanasan', name: 'Pemanasan Dasar', region: '', suku: 'Semua daerah', tingkat: 1, posture: 'berdiri', accompaniment: 'Hitungan 1–8',
  summary: 'Tiga gerak pemanasan untuk mengenal cara kerja kamera, skor, dan tes akhir sebelum belajar tarian daerah.',
  bagian: [
    b('Angkat lengan', 'Angkat kedua lengan dari samping badan hingga ke atas kepala, lalu turunkan perlahan.'),
    b('Mendhak', 'Rentangkan lengan setinggi bahu, tekuk kedua lutut, lalu kembali tegak.'),
    b('Ayun samping', 'Ayunkan kedua lengan bergantian ke kiri dan kanan sambil menggeser berat badan.'),
  ],
};

export function bagianOf(t: TarianData): BagianData[] {
  return t.bagian ?? kerangkaBawaan(t.tingkat, t.posture);
}
