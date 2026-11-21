import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ChapterRow } from '../../components/ChapterRow';
import { LeaderboardList } from '../../components/LeaderboardTable';
import { EmptyState, ProgressRing, Skeleton, SkeletonList } from '../../components/ui';
import { TingkatBadge } from '../../components/Tingkat';
import { useDance, useLeaderboard, useRegions } from '../../lib/queries';
import { useCourse, type PartView } from './useCourse';
import { NotFoundPage, ServerErrorPage } from '../../components/PageStates';
import { useAuth } from '../auth/authStore';
import { Kain } from '../../components/Ornamen';
import { auroraDaerah, wastraOf, wastraVars } from '../../lib/wastra';
import { Langit } from '../../components/Langit';
import { TINGKAT } from '../../data/katalog';

type Tab = 'belajar' | 'tentang' | 'papan';

export function DanceDetailPage() {
  const { danceId } = useParams();
  const dance = useDance(danceId);
  const course = useCourse(danceId);
  const regions = useRegions();
  const board = useLeaderboard(danceId, 'semua', 5);
  const role = useAuth((s) => s.profile?.role);
  const status = useAuth((s) => s.status);
  const [tab, setTab] = useState<Tab>('belajar');

  if (dance.isLoading) return <DetailSkeleton />;
  if (dance.isError) return <ServerErrorPage />;
  if (!dance.data) return <NotFoundPage />;
  const d = dance.data;
  const region = regions.data?.find((r) => r.id === d.region_id);
  const w = wastraOf(d.id, d.province);
  const firstStep = course.orderedSteps[0];
  const totalMs = course.orderedSteps.reduce((s, x) => s + x.duration_ms, 0);
  const tk = TINGKAT[d.difficulty];
  const DRAF = / \(Deskripsi draf.*\)$/;
  const isDraft = DRAF.test(d.summary);
  const summary = d.summary.replace(DRAF, '');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'belajar', label: `Bagian (${course.total || d.part_count})` },
    { id: 'tentang', label: 'Tentang tarian' },
    { id: 'papan', label: 'Papan skor' },
  ];

  return (
    <main className="pb-24" style={wastraVars(w)}>
      {/* Hero di langit malam, aurora diwarnai kain daerah tarian */}
      <Langit style={auroraDaerah(w)}>
        <div className="wadah grid items-end gap-10 pb-16 pt-10 lg:grid-cols-12 lg:pb-20 lg:pt-14">
          <div className="lg:col-span-7">
            <nav aria-label="Jejak" className="flex flex-wrap items-center gap-x-2 text-[15px] text-mori/80">
              <Link to="/#daerah" className="tombol-teks hover:text-mori">Semua daerah</Link>
              {region && <><span aria-hidden className="text-mori/40">/</span><Link to={`/daerah/${region.id}`} className="tombol-teks hover:text-mori">{region.name}</Link></>}
            </nav>
            <h1 className="judul-display mt-6" style={{ fontSize: 'clamp(44px, 3.4vw + 26px, 84px)' }}>{d.name}</h1>
            <p className="lead muted-langit mt-5 max-w-[46ch]">{summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-mori">
              <TingkatBadge level={d.difficulty} parts={course.total || d.part_count} dark />
              <span className="text-[14px] text-muted-gelap">{d.region === d.province ? d.region : `${d.region}, ${d.province}`}</span>
            </div>
            {isDraft && <p className="mt-3 text-[14px] text-muted-gelap">Deskripsi masih draf dan akan ditinjau sanggar.</p>}
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-[24px] border border-white/[0.12] bg-white/[0.04] p-2">
              <Kain id={d.id} className="h-48 rounded-[18px] lg:h-60" style={wastraVars(w)} />
            </div>
            <p className="mt-3 text-[14px] text-muted-gelap">Motif {w.kain}</p>
          </div>
        </div>
      </Langit>

      <div className="wadah">
        <div className="grid gap-12 pt-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
              <Info label="Iringan" value={d.accompaniment} />
              <Info label="Posisi" value={d.posture === 'duduk' ? 'Duduk' : 'Berdiri'} />
              <Info label="Properti" value={d.props.length ? d.props.map((p) => p.label).join(', ') : 'Tanpa properti'} />
              <Info label="Terekam" value={`${course.recordedCount} dari ${course.total} bagian${totalMs ? `, ${Math.round(totalMs / 1000)} detik` : ''}`} />
            </dl>

            {course.total > 0 && <ProgressCard danceId={d.id} course={course} guest={status !== 'authed'} />}

            <div className="mt-12 flex gap-1 overflow-x-auto border-b border-garis" role="tablist" aria-label="Isi halaman tarian">
              {tabs.map((t) => (
                <button key={t.id} role="tab" type="button" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}
                  className={`-mb-px min-h-[48px] shrink-0 border-b-2 px-4 text-[15px] font-bold ${tab === t.id ? 'text-nila' : 'border-transparent text-muted hover:text-nila'}`} style={tab === t.id ? { borderColor: w.base } : undefined}>
                  {t.label}
                </button>
              ))}
            </div>

            <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-6">
              {tab === 'belajar' && (
                course.isLoading ? <SkeletonList rows={4} className="h-[84px]" /> :
                course.isError ? <EmptyState icon="alert" title="Daftar bagian gagal dimuat">Periksa koneksi lalu muat ulang.</EmptyState> :
                course.total === 0 ? (
                  <EmptyState icon="book" title="Kerangka bagian belum disusun">Maestro atau admin perlu menyusun bagian-bagian tarian ini terlebih dahulu.</EmptyState>
                ) : (
                  <>
                    <PartMap views={course.views} />
                    {course.recordedCount === 0 && (
                      <div className="sumur mb-6 flex flex-wrap items-center gap-4 p-5">
                        <Icon name="camera" className="shrink-0 text-muted" />
                        <p className="min-w-0 flex-1 text-[15px]">Gerak {d.name} belum direkam maestro, jadi bagian-bagian di bawah belum bisa dilatih. {role === 'maestro' || role === 'admin' ? 'Rekam lewat Mode Maestro.' : 'Sambil menunggu, coba Pemanasan Dasar.'}</p>
                        {role === 'maestro' || role === 'admin'
                          ? <Link to="/maestro" className="tombol-utama min-h-[44px] px-4 text-[14px]">Mode Maestro</Link>
                          : <Link to="/tarian/pemanasan" className="tombol-garis min-h-[44px] px-4 text-[14px]">Pemanasan Dasar</Link>}
                      </div>
                    )}
                    <ol className="divide-y divide-garis border-y border-garis">
                      {course.views.map((v) => <ChapterRow key={v.part.id} view={v} danceId={d.id} total={course.total} />)}
                    </ol>
                    <TestCard danceId={d.id} unlocked={course.allPassed} total={course.total} waiting={!course.allRecorded} />
                    {d.id !== 'pemanasan' && (
                      <p className="mt-4 flex gap-2 text-[14px] text-muted"><Icon name="info" size={16} className="mt-0.5 shrink-0" />Nama dan fokus bagian masih draf dan akan disempurnakan oleh maestro sanggar.</p>
                    )}
                  </>
                )
              )}
              {tab === 'tentang' && (
                <div className="max-w-2xl space-y-4 text-[16px] leading-relaxed">
                  <p>{d.context}</p>
                  <p className="text-[14px] text-muted"><b className="text-nila">Tingkat {tk.label}:</b> {tk.keterangan}</p>
                  {d.verified_by_note && (
                    <p className="flex gap-3 rounded-[10px] border-2 border-nila/10 bg-kertas p-4 text-[14px]"><Icon name="info" className="mt-0.5 shrink-0 text-soga" />{d.verified_by_note}</p>
                  )}
                  {d.props.map((p) => <p key={p.kind} className="text-[14px] text-muted"><b className="text-nila">{p.label}:</b> {p.note}</p>)}
                </div>
              )}
              {tab === 'papan' && (
                <div>
                  <LeaderboardList rows={board.data?.rows} sample={board.data?.sample} loading={board.isLoading} error={board.isError} />
                  <Link to={`/papan-skor?tarian=${d.id}`} className="tombol-teks mt-3">Lihat papan skor lengkap<Icon name="arrow" size={16} /></Link>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-kartu bg-nila p-5 text-mori motif-kawung" style={{ ['--kawung-opasitas' as string]: 0.1 }}>
              <div className="label-kecil text-prada">Contoh gerak oleh</div>
              <p className="mt-2 text-[18px] font-bold">{firstStep?.synthetic ? 'Gerak sintetis (uji coba)' : firstStep?.recorded_by_label ?? '[Nama maestro]'}</p>
              <p className="text-[14px] text-muted-gelap">{firstStep?.synthetic ? 'Bukan rekaman maestro; hanya untuk mencoba aplikasi.' : firstStep?.sanggar_name ?? d.sanggar_label ?? '[Nama sanggar]'}</p>
            </div>
            <div className="kartu p-5">
              <h2 className="label-kecil text-soga">Tips sebelum mulai</h2>
              <ul className="mt-3 space-y-3 text-[15px]">
                {[
                  ['device', 'Taruh HP/laptop setinggi pinggang, sekitar 2 meter di depanmu.'],
                  ['user', d.posture === 'duduk' ? 'Pastikan kepala sampai pinggul terlihat di kamera.' : 'Pastikan seluruh badan, dari kepala sampai kaki, terlihat.'],
                  ['eye', 'Cari ruangan terang dan latar yang tidak ramai.'],
                  ['shield', 'Video tetap di perangkatmu. Hanya skor yang bisa dikirim.'],
                ].map(([i, t]) => (
                  <li key={t} className="flex gap-3"><Icon name={i} size={18} className="mt-0.5 shrink-0 text-soga" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="kartu p-5">
              <div className="flex items-center justify-between">
                <h2 className="label-kecil text-soga">Papan skor</h2>
                <Link to={`/papan-skor?tarian=${d.id}`} className="inline-flex min-h-[44px] items-center text-[14px] font-bold underline-offset-4 hover:underline">Semua</Link>
              </div>
              <div className="mt-2"><LeaderboardList compact rows={board.data?.rows.slice(0, 3)} sample={board.data?.sample} loading={board.isLoading} error={board.isError} emptyText="Belum ada skor tes akhir." /></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ProgressCard({ danceId, course, guest }: { danceId: string; course: ReturnType<typeof useCourse>; guest: boolean }) {
  const { passedCount, total, active, waiting, allPassed } = course;
  return (
    <div className="sumur mt-10 flex flex-wrap items-center gap-5 p-6">
      <ProgressRing done={passedCount} total={total} />
      <div className="min-w-0 flex-1">
        <div className="label-kecil text-soga">Kemajuanmu</div>
        <p className="mt-1 text-[17px] font-bold">
          {allPassed ? 'Semua bagian lulus. Saatnya tes akhir.' : `${passedCount} dari ${total} bagian lulus`}
        </p>
        <p className="text-[14px] text-muted">
          {waiting && !active ? `Bagian ${waiting.index} (${waiting.part.name}) menunggu rekaman maestro.` : 'Lulus tiap bagian dengan skor 70 atau lebih, berurutan.'}
          {guest && ' Kemajuan tamu disimpan di perangkat ini.'}
        </p>
      </div>
      {allPassed ? (
        <Link to={`/tarian/${danceId}/tes`} className="tombol-utama w-full sm:w-auto">Mulai tes akhir<Icon name="arrow" size={18} /></Link>
      ) : active ? (
        <Link to={`/tarian/${danceId}/bab/${active.index}`} className="tombol-utama w-full sm:w-auto">{passedCount ? 'Lanjutkan' : 'Mulai'} Bagian {active.index}<Icon name="arrow" size={18} /></Link>
      ) : null}
    </div>
  );
}

/** Peta jalur: batu loncatan tiap bagian sampai bendera tes akhir. */
function PartMap({ views }: { views: PartView[] }) {
  return (
    <div className="mb-6 overflow-x-auto pb-2" aria-hidden>
      <ol className="flex min-w-max items-center gap-0">
        {views.map((v) => (
          <li key={v.part.id} className="flex items-center">
            <span className={`grid h-9 w-9 place-items-center rounded-full border text-[14px] angka ${
              v.state === 'lulus' ? 'border-transparent bg-pendar/20 text-pendar-teks' : v.state === 'aktif' ? 'border-nila bg-nila text-mori' : 'border-garis text-muted'
            }`}>{v.state === 'lulus' ? <Icon name="check" size={16} strokeWidth={2.6} /> : v.index}</span>
            <span className={`h-px w-6 ${v.state === 'lulus' ? 'bg-nila/50' : 'bg-garis'}`} />
          </li>
        ))}
        <li className="flex items-center gap-2 rounded-full border-2 border-nila bg-nila px-3 py-1.5 text-[12px] font-bold text-prada">
          <Icon name="flag" size={14} />Tes akhir
        </li>
      </ol>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-garis pl-4 pr-3">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="mt-1 text-[15px] font-bold leading-snug">{value}</dd>
    </div>
  );
}

function TestCard({ danceId, unlocked, total, waiting }: { danceId: string; unlocked: boolean; total: number; waiting: boolean }) {
  return (
    <div className="mt-6 overflow-hidden rounded-kartu kertas-potong bg-nila p-6 text-mori motif-kawung" style={{ ['--kawung-opasitas' as string]: 0.14 }}>
      <div className="flex flex-wrap items-center gap-5">
        <div className="min-w-0 flex-1">
          <div className="label-kecil text-prada">Tes akhir</div>
          <h3 className="judul-display mt-1 text-[24px]">Semua {total} bagian, dari ingatan</h3>
          <p className="mt-1 text-[14px] text-muted-gelap">Contoh disembunyikan. Skormu masuk papan skor tarian ini.</p>
          <span className="mt-2 block font-jawa text-[14px] text-prada/80" aria-hidden>ꦲꦺꦴꦧꦃꦲꦚꦂ</span>
        </div>
        {unlocked ? (
          <Link to={`/tarian/${danceId}/tes`} className="tombol-utama w-full sm:w-auto">Mulai tes akhir<Icon name="arrow" size={18} /></Link>
        ) : (
          <span className="chip bg-white/10 py-2 text-muted-gelap"><Icon name="lock" size={16} />{waiting ? 'Terkunci sampai semua bagian terekam dan lulus' : 'Terkunci: luluskan semua bagian dulu'}</span>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="wadah py-10" aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-12 w-72" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      <div className="mt-8"><SkeletonList rows={4} className="h-[84px]" /></div>
    </main>
  );
}
