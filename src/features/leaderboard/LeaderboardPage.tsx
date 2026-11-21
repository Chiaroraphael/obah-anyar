import { useSearchParams } from 'react-router-dom';
import { useDances, useRegions } from '../../lib/queries';
import type { Dance } from '../../types/database.types';
import { Skeleton } from '../../components/ui';
import { LeaderboardTabs } from './LeaderboardTabs';
import { Kain } from '../../components/Ornamen';
import { wastraOf } from '../../lib/wastra';

export function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const dances = useDances();
  const regions = useRegions();
  const selected = params.get('tarian') ?? 'pemanasan';
  const groups: { name: string; list: Dance[] }[] = [
    { name: 'Pemanasan', list: (dances.data ?? []).filter((d) => !d.region_id) },
    ...(regions.data ?? []).map((r) => ({ name: r.name, list: (dances.data ?? []).filter((d) => d.region_id === r.id) })),
  ].filter((g) => g.list.length);
  const current = dances.data?.find((d) => d.id === selected);
  return (
    <main className="pb-10">
      <div className="wadah pt-8">
      <h1 className="judul-display" style={{ fontSize: 'clamp(38px, 2vw + 30px, 64px)' }}>Skor tes akhir terbaik</h1>
      <p className="mt-3 max-w-2xl text-[16px] text-muted">Hanya tes akhir dengan contoh disembunyikan dan satu orang di kamera yang masuk papan skor. Yang disimpan hanya nama tampilan dan skor, tanpa video.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Pilih tarian" className="min-w-0">
          <h2 className="label-kecil text-soga">Tarian</h2>
          {dances.isLoading ? <div className="mt-3 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}</div> : (
            <div className="mt-3 flex gap-5 overflow-x-auto pb-2 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto lg:pr-2">
            {groups.map((g) => (
            <div key={g.name} className="shrink-0">
            <h3 className="mb-2 text-[14px] font-extrabold text-soga">{g.name}</h3>
            <ul className="flex gap-2 lg:flex-col">
              {g.list.map((d) => (
                <li key={d.id} className="shrink-0">
                  <button type="button" aria-current={d.id === selected ? 'true' : undefined} onClick={() => setParams({ tarian: d.id })}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-[10px] border-2 px-2.5 text-left text-[15px] font-bold transition-transform ${d.id === selected ? 'border-nila -translate-y-0.5' : 'border-nila/10 bg-kertas hover:border-nila/40'}`}
                    style={d.id === selected ? { background: wastraOf(d.id).base, color: wastraOf(d.id).ink } : undefined}>
                    <Kain id={d.id} className="kain-kecil h-7 w-7 shrink-0 rounded-[6px]" />
                    <span className="flex-1">{d.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            </div>
            ))}
            </div>
          )}
        </nav>
        <section className="overflow-hidden rounded-kartu kertas-potong bg-kertas" aria-label={`Papan skor ${current?.name ?? ''}`}>
          <div className="flex items-center gap-4 border-b border-garis px-5 py-5 sm:px-6">
            <Kain id={selected} className="kain-kecil h-12 w-12 shrink-0 rounded-[10px]" />
            <h2 className="text-[32px]">{current?.name ?? '…'}</h2>
          </div>
          <div className="p-5 sm:p-6">
          <LeaderboardTabs danceId={selected} />
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}
