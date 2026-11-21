import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { DanceCard } from '../../components/DanceCard';
import { Kain } from '../../components/Ornamen';
import { EmptyState, Skeleton } from '../../components/ui';
import { NotFoundPage, ServerErrorPage } from '../../components/PageStates';
import { TINGKAT } from '../../data/katalog';
import { useDances, useRegions } from '../../lib/queries';
import { auroraDaerah, wastraOf, wastraVars } from '../../lib/wastra';
import { Langit } from '../../components/Langit';
import type { Difficulty } from '../../types/database.types';

const LEVELS: Difficulty[] = [1, 2, 3, 4];

/** Satu daerah: semua tariannya, dikelompokkan per tingkat kesulitan. */
export function RegionPage() {
  const { regionId } = useParams();
  const regions = useRegions();
  const dances = useDances();
  const [level, setLevel] = useState<Difficulty | 0>(0);
  const [posture, setPosture] = useState<'semua' | 'berdiri' | 'duduk'>('semua');

  if (regions.isLoading) return <main className="wadah py-12"><Skeleton className="h-64" /></main>;
  if (regions.isError) return <ServerErrorPage />;
  const region = regions.data?.find((r) => r.id === regionId);
  if (!region) return <NotFoundPage />;
  const w = wastraOf(region.id);
  const all = (dances.data ?? []).filter((d) => d.region_id === region.id);
  const list = all.filter((d) => (level === 0 || d.difficulty === level) && (posture === 'semua' || d.posture === posture));

  return (
    <main className="pb-24" style={wastraVars(w)}>
      {/* Hero di langit malam, aurora diwarnai kain daerah */}
      <Langit style={auroraDaerah(w)}>
        <div className="wadah grid items-end gap-10 pb-16 pt-10 lg:grid-cols-12 lg:pb-20 lg:pt-14">
          <div className="lg:col-span-7">
            <Link to="/#daerah" className="tombol-teks text-[15px] text-mori/80 hover:text-mori"><Icon name="arrow-left" size={16} />Semua daerah</Link>
            <h1 className="judul-display mt-6" style={{ fontSize: 'clamp(44px, 3.4vw + 26px, 84px)' }}>Tari {region.name}</h1>
            <p className="lead muted-langit mt-5 max-w-[42ch]">{all.length} tarian, dari tingkat Pemula sampai Ahli. Mulailah dari yang paling ringan.</p>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-[24px] border border-white/[0.12] bg-white/[0.04] p-2">
              <Kain id={region.id} className="h-48 rounded-[18px] lg:h-60" />
            </div>
            <p className="mt-3 text-[14px] text-muted-gelap">Motif {region.kain}</p>
          </div>
        </div>
      </Langit>

      <div className="wadah pt-8">
        <div className="flex flex-col gap-5 border-y border-garis py-5">
          <nav aria-label="Daerah lain" className="-mx-4 overflow-x-auto px-4">
            <ul className="flex min-w-max gap-2">
              {regions.data?.map((r) => {
                const on = r.id === region.id;
                return (
                  <li key={r.id}>
                    <Link to={`/daerah/${r.id}`} aria-current={on ? 'page' : undefined}
                      className={`flex min-h-[44px] items-center gap-2 rounded-full border py-1 pl-1.5 pr-4 text-[14px] font-bold ${on ? 'border-nila bg-nila text-mori' : 'border-garis hover:border-nila/40'}`}>
                      <Kain id={r.id} className="kain-kecil h-7 w-7 rounded-full" />
                      {r.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Segmented label="Tingkat" value={level} onChange={setLevel} options={[[0, 'Semua'], ...LEVELS.map((l) => [l, TINGKAT[l].label] as [Difficulty, string])]} />
            <Segmented label="Posisi" value={posture} onChange={setPosture} options={[['semua', 'Semua'], ['berdiri', 'Berdiri'], ['duduk', 'Duduk']]} />
          </div>
        </div>

        {dances.isLoading ? (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[260px]" />)}</div>
        ) : dances.isError ? (
          <div className="mt-12"><EmptyState icon="alert" title="Daftar tarian gagal dimuat">Periksa koneksi internetmu, lalu muat ulang.</EmptyState></div>
        ) : list.length === 0 ? (
          <div className="mt-12"><EmptyState title="Tidak ada tarian yang cocok" action={<button type="button" className="tombol-garis" onClick={() => { setLevel(0); setPosture('semua'); }}>Hapus saringan</button>}>Coba tingkat atau posisi lain.</EmptyState></div>
        ) : (
          LEVELS.filter((l) => list.some((d) => d.difficulty === l)).map((l) => (
            <section key={l} className="mt-20" aria-labelledby={`tingkat-${l}`}>
              <div className="grid gap-2 lg:grid-cols-12 lg:items-end">
                <h2 id={`tingkat-${l}`} className="text-[40px] lg:col-span-5">{TINGKAT[l].label}</h2>
                <p className="text-[16px] text-muted lg:col-span-6 lg:col-start-7">{TINGKAT[l].keterangan}</p>
              </div>
              <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {list.filter((d) => d.difficulty === l).map((d, i) => <DanceCard key={d.id} dance={d} index={i} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function Segmented<T extends string | number>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label={`Saring ${label.toLowerCase()}`}>
      <span className="text-[14px] font-bold text-muted">{label}</span>
      <div className="flex flex-wrap rounded-[10px] bg-sumur p-1">
        {options.map(([v, t]) => (
          <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={`min-h-[44px] rounded-[8px] px-3.5 text-[14px] font-bold transition-colors duration-[220ms] ${value === v ? 'bg-mori text-nila' : 'text-muted hover:text-nila'}`}
            style={value === v ? { boxShadow: 'var(--shadow-1)' } : undefined}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
