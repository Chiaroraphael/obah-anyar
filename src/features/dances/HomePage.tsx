import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Kain } from '../../components/Ornamen';
import { HeroDemo } from '../../components/HeroDemo';
import { Langit } from '../../components/Langit';
import { HitungNaik } from '../../components/HitungNaik';
import { EmptyState, Skeleton } from '../../components/ui';
import { useDances, useRegions } from '../../lib/queries';
import { wastraOf, wastraVars } from '../../lib/wastra';
import { DAERAH, TINGKAT } from '../../data/katalog';
import type { Dance } from '../../types/database.types';

const LEVELS = [1, 2, 3, 4] as const;
const FLAG = 'oa-masuk-hero';

export function HomePage() {
  const loc = useLocation();
  useEffect(() => {
    if (!loc.hash) return;
    const el = document.getElementById(loc.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [loc.hash]);

  return (
    <main>
      <Hero />
      <Angka />
      <Daerah />
      <CaraKerja />
      <Prinsip />
      <Sanggar />
      <Penutup />
    </main>
  );
}

/* Hero · split di langit malam: teks 5 kolom, contoh gerak sungguhan 7 kolom. Masuk sekali per kunjungan. */
function Hero() {
  const [masuk] = useState(() => { try { return !sessionStorage.getItem(FLAG); } catch { return false; } });
  useEffect(() => { try { sessionStorage.setItem(FLAG, '1'); } catch { /* abaikan */ } }, []);
  const dances = useDances();
  const total = (dances.data ?? []).filter((d) => d.region_id).length;
  const facts: [string, string][] = [['device', 'Langsung di browser'], ['shield', 'Video tetap di perangkatmu'], ['users', 'Gerak dari maestro sanggar']];
  return (
    <Langit className={`${masuk ? 'masuk' : ''}`}>
      <div className="wadah grid items-center gap-12 pb-16 pt-12 lg:min-h-[calc(100svh-var(--nav))] lg:grid-cols-12 lg:gap-10 lg:py-16">
        <div className="lg:col-span-5">
          <h1 className="judul-display" style={{ fontSize: 'clamp(44px, 3.4vw + 26px, 80px)' }}>
            <span className="baris"><span style={{ ['--i' as string]: 0 }}>Gerak <span className="text-prada">warisan,</span></span></span>
            <span className="baris"><span style={{ ['--i' as string]: 1 }}>cara belajar</span></span>
            <span className="baris"><span style={{ ['--i' as string]: 2 }}>yang baru.</span></span>
          </h1>
          <p className="lead naik-halus muted-langit mt-7 max-w-[38ch]" style={{ ['--i' as string]: 0 }}>
            Pilih tarian dari tujuh daerah, ikuti contoh maestro, dan lihat skormu di setiap hitungan.
          </p>
          <div className="naik-halus mt-9 flex flex-wrap gap-3" style={{ ['--i' as string]: 1 }}>
            <Link to="/tarian/pemanasan" className="tombol-utama min-h-[52px] px-7">Mulai dari pemanasan</Link>
            <Link to="/#daerah" className="tombol-garis-gelap min-h-[52px] px-7">Jelajahi {total || 30} tarian</Link>
          </div>
          <ul className="naik-halus mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-mori/80" style={{ ['--i' as string]: 2 }}>
            {facts.map(([i, t]) => <li key={t} className="flex items-center gap-2"><Icon name={i} size={16} className="text-prada" />{t}</li>)}
          </ul>
        </div>
        <div className="bingkai-masuk lg:col-span-7">
          <div className="rounded-[24px] border border-white/[0.12] bg-white/[0.04] p-2">
            <HeroDemo />
          </div>
        </div>
      </div>
    </Langit>
  );
}

/* Angka asli dari katalog · momen counter-rolls (satu-satunya momen di halaman) */
function Angka() {
  const dances = useDances();
  const list = (dances.data ?? []).filter((d) => d.region_id);
  const bagian = list.reduce((s, d) => s + d.part_count, 0);
  const items: [number, string, string][] = [
    [DAERAH.length, 'daerah', 'Dari Aceh sampai Bali, masing-masing dengan kainnya.'],
    [list.length, 'tarian', 'Tingkat Pemula sampai Ahli.'],
    [bagian, 'bagian latihan', 'Diluluskan satu per satu sebelum tes akhir.'],
  ];
  return (
    <section className="border-b border-garis" aria-label="Isi katalog">
      <div className="wadah grid gap-10 py-14 sm:grid-cols-3">
        {items.map(([n, label, d]) => (
          <div key={label} className="border-l-2 border-prada pl-5">
            <p className="flex items-baseline gap-3">
              <HitungNaik value={n} className="angka text-[44px] leading-none text-nila lg:text-[56px]" />
              <span className="font-display text-[22px] tracking-[-0.02em]">{label}</span>
            </p>
            <p className="mt-2 max-w-[30ch] text-[15px] text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Daerah · kartu dengan kain besar berwarna (kain = gambar), Bali lebar dua kolom */
function Daerah() {
  const regions = useRegions();
  const dances = useDances();
  const byRegion = (id: string) => (dances.data ?? []).filter((d) => d.region_id === id);
  return (
    <section id="daerah" className="seksi scroll-mt-20" aria-labelledby="judul-daerah">
      <div className="wadah">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <h2 id="judul-daerah" className="max-w-[16ch] lg:col-span-6">Pilih daerah, lalu tarian</h2>
          <p className="measure text-[17px] text-muted lg:col-span-5 lg:col-start-8">Makin sulit tariannya, makin banyak bagian yang harus lulus sebelum tes akhir.</p>
        </div>
        <div className="mt-12">
          {regions.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[340px]" />)}</div>
          ) : regions.isError ? (
            <EmptyState icon="alert" title="Daftar daerah gagal dimuat" action={<button type="button" className="tombol-garis" onClick={() => regions.refetch()}><Icon name="refresh" size={18} />Muat ulang</button>}>Periksa koneksi internetmu, lalu muat ulang.</EmptyState>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {regions.data?.map((r, i) => {
                const big = i === 0 && (regions.data?.length ?? 0) % 2 === 1;
                return (
                  <li key={r.id} className={big ? 'sm:col-span-2' : ''}>
                    <RegionTile id={r.id} name={r.name} kain={r.kain} list={byRegion(r.id)} big={big} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function RegionTile({ id, name, kain, list, big }: { id: string; name: string; kain: string; list: Dance[]; big: boolean }) {
  const w = wastraOf(id);
  const shown = list.slice(0, big ? 6 : 3).map((d) => d.name);
  const spread = LEVELS.map((l) => [l, list.filter((d) => d.difficulty === l).length] as const).filter(([, n]) => n);
  return (
    <Link to={`/daerah/${id}`} className="kartu angkat group flex h-full flex-col overflow-hidden bg-kertas">
      <div className="overflow-hidden">
        <Kain id={id} className={`zoom-kain ${big ? 'h-52' : 'h-36'}`} />
      </div>
      <div className="flex flex-1 flex-col p-6" style={wastraVars(w)}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={big ? 'text-[36px]' : 'text-[24px]'}>{name}</h3>
          <span className="angka shrink-0 text-[14px] text-muted">{list.length} tarian</span>
        </div>
        <p className="mt-1 text-[14px] text-muted">{kain}</p>
        <p className="mt-4 text-[16px] leading-relaxed">{shown.join(', ')}{list.length > shown.length ? ', dan lainnya' : ''}</p>
        {spread.length > 0 && (
          <div className="mt-auto pt-6">
            <div className="flex h-1.5 gap-[3px] overflow-hidden rounded-full" aria-hidden>
              {spread.map(([l, n]) => <span key={l} style={{ flex: n, background: w.base, opacity: 0.3 + l * 0.175 }} />)}
            </div>
            <p className="mt-2 text-[13px] text-muted">{spread.map(([l, n]) => `${n} ${TINGKAT[l].label}`).join(', ')}</p>
          </div>
        )}
      </div>
    </Link>
  );
}

/* Cara kerja · baris bergaris rambut di g-alt */
function CaraKerja() {
  const steps: [string, string][] = [
    ['Pilih tarian', 'Tujuh daerah, masing-masing dengan gerak acuan dari maestro sanggar.'],
    ['Pelajari per bagian', 'Tonton contoh pelan-pelan, lalu coba. Lulus dengan skor 70.'],
    ['Tes akhir dari ingatan', 'Semua bagian berurutan, contoh disembunyikan.'],
    ['Masuk peringkat', 'Hanya nama tampilan dan skor yang disimpan.'],
  ];
  return (
    <section id="cara-kerja" className="seksi-pita bg-sumur" aria-labelledby="judul-cara">
      <div className="wadah grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="judul-cara" className="max-w-[14ch]">Dari bagian pertama ke tes akhir</h2>
          <p className="mt-6 flex max-w-[40ch] gap-3 text-[16px] text-muted">
            <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-pendar-teks" />
            Video kamera diproses di perangkatmu dan tidak pernah diunggah.
          </p>
        </div>
        <ol className="divide-y divide-garis border-y border-garis lg:col-span-7">
          {steps.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[64px_1fr] items-baseline gap-4 py-7">
              <span className="angka text-[32px] text-prada-teks">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-[22px]">{t}</h3>
                <p className="mt-1.5 text-[16px] text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* Prinsip · tabel, tiap prinsip punya warna penanda (selalu dengan teks) */
function Prinsip() {
  const rows: [string, string, string, string][] = [
    ['Wiraga', 'Ketepatan bentuk gerak: sudut lengan, tungkai, dan badan dibanding contoh.', 'AI di perangkatmu', 'bg-pendar'],
    ['Wirama', 'Ketepatan irama: gerak jatuh pada hitungan yang sama dengan contoh.', 'AI di perangkatmu', 'bg-prada'],
    ['Wirasa', 'Penjiwaan dan rasa gerak. Bagian ini tetap butuh mata pelatih.', 'Pelatih sanggar', 'bg-perbaiki'],
  ];
  return (
    <section className="seksi" aria-labelledby="judul-prinsip">
      <div className="wadah">
        <h2 id="judul-prinsip" className="max-w-[18ch]">Dinilai seperti pelatih menilai</h2>
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-nila/25 text-[13px] text-muted">
                <th scope="col" className="w-[22%] whitespace-nowrap py-3 pr-6 font-medium">Prinsip</th>
                <th scope="col" className="py-3 pr-6 font-medium">Yang dinilai</th>
                <th scope="col" className="w-[22%] whitespace-nowrap py-3 font-medium">Penilai</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([p, d, by, c]) => (
                <tr key={p} className="border-b border-garis align-baseline">
                  <th scope="row" className="py-7 pr-6 font-display text-[28px] font-medium tracking-[-0.02em]">
                    <span className="flex items-center gap-3"><span className={`h-3 w-3 shrink-0 rounded-full ${c}`} aria-hidden />{p}</span>
                  </th>
                  <td className="max-w-[60ch] py-7 pr-6 text-[16px]">{d}</td>
                  <td className="py-7 text-[16px] font-medium">{by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* Untuk sanggar · pita malam dengan buku kain tujuh daerah */
function Sanggar() {
  const items: [string, string][] = [
    ['Studio rekam di browser', 'Rekam dengan kamera atau unggah video sampai 60 detik per bagian.'],
    ['Persetujuan penari', 'Formulir persetujuan wajib diisi sebelum gerak diterbitkan.'],
    ['Kode undangan', 'Murid sanggar bergabung dan punya peringkat sendiri.'],
  ];
  return (
    <section id="sanggar" className="seksi-pita scroll-mt-20 bg-nila-malam text-mori" aria-labelledby="judul-sanggar">
      <div className="wadah">
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Kain tujuh daerah">
          {DAERAH.map((d) => (
            <li key={d.id}>
              <Link to={`/daerah/${d.id}`} className="group block">
                <span className="block overflow-hidden rounded-[12px]"><Kain id={d.id} className="zoom-kain h-20 sm:h-28" /></span>
                <span className="mt-2 block truncate text-[13px] text-muted-gelap group-hover:text-mori">{d.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 id="judul-sanggar" className="max-w-[15ch]">Rekam sekali, murid berlatih tiap hari</h2>
            <p className="mt-6 max-w-[44ch] text-[17px] text-muted-gelap">Nama maestro dan sanggar tercantum di setiap bagian yang direkam.</p>
            <div className="mt-9">
              <Link to="/daftar?peran=maestro" className="tombol-garis-gelap min-h-[52px] px-7">Daftarkan sanggar</Link>
            </div>
          </div>
          <dl className="divide-y divide-white/10 border-y border-white/10 lg:col-span-5 lg:col-start-8">
            {items.map(([t, d]) => (
              <div key={t} className="py-6">
                <dt className="font-display text-[22px] tracking-[-0.015em]">{t}</dt>
                <dd className="mt-1 text-[16px] text-muted-gelap">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* Penutup · satu pita merek (prada) */
function Penutup() {
  return (
    <section className="bg-prada text-nila" aria-labelledby="judul-penutup">
      <div className="wadah grid gap-6 py-20 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <h2 id="judul-penutup" className="max-w-[18ch]">Belum tahu mulai dari mana?</h2>
          <p className="mt-4 max-w-[48ch] text-[17px] text-nila/80">Pemanasan Dasar punya tiga bagian pendek untuk mengenal kamera, skor, dan tes akhir.</p>
        </div>
        <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
          <Link to="/tarian/pemanasan" className="tombol min-h-[52px] bg-nila px-7 text-mori hover:bg-nila-2">Buka Pemanasan Dasar<Icon name="arrow" size={18} /></Link>
        </div>
      </div>
    </section>
  );
}
