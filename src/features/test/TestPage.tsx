import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { CameraStage } from '../../components/CameraStage';
import { ReferencePlayer } from '../../components/ReferencePlayer';
import { BeatBar, EmptyState, Skeleton } from '../../components/ui';
import { NotFoundPage, ServerErrorPage } from '../../components/PageStates';
import { loadKeypoints, useDance, useStepAudioUrl, useStepVideoUrl } from '../../lib/queries';
import { useMusikIringan } from '../../lib/media';
import { compareSequences } from '../../pose/compare';
import { buildTips } from '../../pose/feedback';
import { READINESS_TEXT } from '../../pose/tracker';
import type { StepKeypoints } from '../../pose/types';
import { useCourse } from '../dances/useCourse';
import { usePoseCamera } from '../practice/usePoseCamera';
import { useMoveSession } from '../practice/useMoveSession';
import { TestResult, type TestOutcome } from './TestResult';
import { DAERAH } from '../../data/katalog';
import { Kain } from '../../components/Ornamen';
import { wastraOf, wastraVars } from '../../lib/wastra';

type Phase = 'aturan' | 'jalan' | 'hasil';

export function TestPage() {
  const { danceId } = useParams();
  const dance = useDance(danceId);
  const course = useCourse(danceId);
  const ordered = course.orderedSteps;
  const cam = usePoseCamera(dance.data?.posture ?? 'berdiri');
  const session = useMoveSession(cam);
  const [phase, setPhase] = useState<Phase>('aturan');
  const [showExample, setShowExample] = useState(false);
  const [kps, setKps] = useState<StepKeypoints[] | null>(null);
  const [kpError, setKpError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const videoUrl = useStepVideoUrl(ordered[current]);
  const audioUrl = useStepAudioUrl(ordered[current]);
  const [musik, setMusik] = useMusikIringan();
  const adaMusik = ordered.some((s) => Boolean(s.audio_path));

  useEffect(() => {
    if (!ordered.length || !course.allRecorded) return;
    Promise.all(ordered.map(loadKeypoints)).then(setKps).catch((e: Error) => setKpError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered.map((s) => s.id).join(','), course.allRecorded]);

  if (dance.isLoading || course.isLoading) return <div className="wadah py-10"><Skeleton className="h-64" /></div>;
  if (dance.isError || course.isError) return <ServerErrorPage />;
  if (!dance.data) return <NotFoundPage />;
  const list = ordered;
  if (!list.length) {
    return <main className="wadah py-16"><EmptyState icon="camera" title="Tarian ini belum punya gerak" action={<Link to="/maestro" className="tombol-utama">Buka Mode Maestro</Link>}>Tes akhir tersedia setelah maestro merekam gerak acuan.</EmptyState></main>;
  }
  if (!course.allPassed && phase === 'aturan') {
    return (
      <main className="wadah py-16">
        <EmptyState icon="lock" title="Tes akhir masih terkunci" action={course.active ? <Link to={`/tarian/${danceId}/bab/${course.active.index}`} className="tombol-utama">Lanjutkan Bagian {course.active.index}</Link> : <Link to={`/tarian/${danceId}`} className="tombol-utama">Daftar bagian</Link>}>
          Luluskan semua {course.total} bagian ({course.passedCount} sudah lulus{course.allRecorded ? '' : `, ${course.total - course.recordedCount} belum terekam maestro`}) untuk membuka tes akhir.
        </EmptyState>
      </main>
    );
  }

  const run = async () => {
    if (!kps) return;
    setPhase('jalan');
    const results: { step: (typeof list)[number]; r: ReturnType<typeof compareSequences>; tips: ReturnType<typeof buildTips> }[] = [];
    let crowdMax = 0;
    for (let i = 0; i < kps.length; i++) {
      setCurrent(i);
      if (i > 0) {
        setBanner(`Gerak ${i + 1} dari ${kps.length}: ${list[i].name}`);
        await new Promise((r) => setTimeout(r, 1600));
        setBanner(null);
      }
      const rec = await session.record(kps[i], 1, { countdown: i === 0 });
      if (!rec) { setPhase('aturan'); return; }
      crowdMax = Math.max(crowdMax, rec.crowdRatio);
      const r = compareSequences(kps[i].frames, rec.frames, kps[i].counts, kps[i].aspect);
      results.push({ step: list[i], r, tips: buildTips(r, 2) });
    }
    session.done();
    const n = results.length;
    const avg = (f: (x: (typeof results)[number]) => number) => Math.round(results.reduce((s, x) => s + f(x), 0) / n);
    setOutcome({
      danceId: dance.data!.id,
      danceName: dance.data!.name,
      score: avg((x) => x.r.score),
      wiraga: avg((x) => x.r.wiraga),
      wirama: avg((x) => x.r.wirama),
      perStep: results.map((x) => ({ id: x.step.id, name: x.step.name, score: x.r.score })),
      curve: results.flatMap((x) => x.r.curve),
      tips: results.flatMap((x) => x.tips.map((t) => ({ ...t, stepName: x.step.name }))).sort((a, b) => (a.severity === 'perbaiki' ? -1 : 1) - (b.severity === 'perbaiki' ? -1 : 1)).slice(0, 3),
      crowdRatio: crowdMax,
      exampleVisible: showExample,
    });
    setPhase('hasil');
  };

  if (phase === 'hasil' && outcome) return <TestResult outcome={outcome} onRetry={() => { setOutcome(null); setPhase('aturan'); }} />;

  const kp = kps?.[current] ?? null;
  const step = list[current];
  const camReady = cam.phase === 'ready';
  const bodyReady = cam.ready === 'siap';

  return (
    <div className="tema-gelap min-h-[calc(100dvh-78px)] bg-nila-malam pb-12 text-mori" style={wastraVars(wastraOf(danceId))}>
      <Kain id={danceId} className="h-3 border-b-2 border-nila-malam" />
      <div className="wadah pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Jejak" className="contents">
          {(() => { const r = DAERAH.find((x) => x.id === dance.data!.region_id); return r ? <><Link to={`/daerah/${r.id}`} className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-muted-gelap hover:text-mori">{r.name}</Link><span className="text-mori/20" aria-hidden>/</span></> : null; })()}
          <Link to={`/tarian/${danceId}`} className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-muted-gelap hover:text-mori gap-1.5"><Icon name="arrow-left" size={18} />{dance.data.name}</Link>
          </nav>
          <span className="text-mori/20" aria-hidden>/</span>
          <h1 className="text-[20px]">Tes akhir</h1>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="relative lap:grid lap:grid-cols-2 lap:gap-4">
              <ReferencePlayer keypoints={kp} timeRef={session.timeRef} videoUrl={videoUrl} audioUrl={audioUrl} musik={musik} hidden={!showExample} playing={session.mode === 'merekam'}
                className={`${cam.phase === 'ready' ? '' : 'hidden lap:block'} absolute right-3 top-14 z-10 w-[34%] aspect-[3/4] lap:relative lap:inset-auto lap:w-auto lap:aspect-[4/3]`} />
              <CameraStage videoRef={cam.videoRef} canvasRef={cam.canvasRef} phase={cam.phase} ready={cam.ready} onStart={cam.start} errorText={cam.errorText} className="aspect-[3/4] lap:aspect-[4/3]"
                overlay={
                  <>
                    {phase === 'jalan' && <span className="absolute left-3 top-12 chip bg-prada text-nila">Gerak {current + 1} dari {list.length}: {step?.name}</span>}
                    {cam.people > 1 && <span className="absolute left-3 top-[88px] chip bg-perbaiki text-mori">Lebih dari satu orang, skor tidak masuk papan</span>}
                    {session.mode === 'merekam' && <span className="absolute right-3 top-3 chip bg-perbaiki text-mori"><Icon name="rec" size={10} className="denyut" />Merekam</span>}
                    {session.countdown && (
                      <div className="absolute inset-0 grid place-items-center bg-nila-malam/40" role="status" aria-live="assertive"><span className="angka text-[120px] text-prada">{session.countdown}</span></div>
                    )}
                    {banner && (
                      <div className="absolute inset-0 grid place-items-center bg-nila-malam/80 motif-kawung" role="status" aria-live="assertive">
                        <div className="text-center"><div className="label-kecil text-prada">Berikutnya</div><div className="mt-2 text-[28px] font-extrabold">{banner}</div></div>
                      </div>
                    )}
                  </>
                } />
            </div>
            {phase === 'jalan' && kp && <div className="mt-4"><BeatBar counts={kp.counts} active={session.activeCount} /></div>}
            {kpError && <p className="mt-3 rounded-[10px] bg-perbaiki/15 p-3 text-[14px] text-perbaiki-terang" role="alert">{kpError}</p>}
          </div>

          <aside>
            {phase === 'aturan' ? (
              <div className="kartu-gelap p-5 motif-kawung" style={{ ['--kawung-opasitas' as string]: 0.05 }}>
                <h2 className="text-[22px]">Aturan tes akhir</h2>
                <ul className="mt-4 space-y-3 text-[15px]">
                  {[
                    ['play', `Semua ${list.length} gerak berurutan pada kecepatan 1×.`],
                    ['eye-off', 'Contoh maestro disembunyikan, menari dari ingatan.'],
                    ['user', 'Hanya satu orang di kamera.'],
                    ['trophy', 'Masuk akun agar skor tercatat di papan skor.'],
                  ].map(([i, t]) => <li key={t} className="flex gap-3"><Icon name={i} size={18} className="mt-0.5 shrink-0 text-prada" />{t}</li>)}
                </ul>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[10px] bg-white/[0.05] p-3 text-[14px]">
                  <input type="checkbox" checked={showExample} onChange={(e) => setShowExample(e.target.checked)} className="mt-0.5 h-5 w-5 accent-prada" />
                  <span>Tampilkan contoh <span className="text-muted-gelap">(skor tidak masuk papan skor)</span></span>
                </label>
                {adaMusik && (
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-[10px] bg-white/[0.05] p-3 text-[14px]">
                    <input type="checkbox" checked={musik} onChange={(e) => setMusik(e.target.checked)} className="mt-0.5 h-5 w-5 accent-prada" />
                    <span>Putar musik iringan <span className="text-muted-gelap">(setiap gerak diiringi potongan lagunya)</span></span>
                  </label>
                )}
                <p className={`mt-4 flex items-center gap-2 text-[14px] font-semibold ${camReady && bodyReady ? 'text-tepat' : 'text-hampir'}`} role="status" aria-live="polite">
                  <span className={`h-2.5 w-2.5 rounded-full ${camReady && bodyReady ? 'bg-tepat' : 'bg-hampir'}`} aria-hidden />
                  {camReady ? READINESS_TEXT[cam.ready] : 'Nyalakan kamera terlebih dahulu'}
                </p>
                <button type="button" className="tombol-utama mt-4 w-full min-h-[52px]" disabled={camReady && (!bodyReady || !kps)} onClick={camReady ? run : cam.start}>
                  <Icon name={camReady ? 'play' : 'camera'} size={18} />{camReady ? (kps ? 'Mulai tes' : 'Memuat gerak…') : 'Nyalakan kamera'}
                </button>
              </div>
            ) : (
              <div className="kartu-gelap p-5">
                <h2 className="label-kecil text-prada">Urutan gerak</h2>
                <ol className="mt-3 space-y-2">
                  {list.map((s, i) => (
                    <li key={s.id} className={`flex items-center gap-3 rounded-[10px] p-2.5 ${i === current ? 'bg-prada/15' : ''}`} aria-current={i === current ? 'step' : undefined}>
                      <span className={`grid h-8 w-8 place-items-center rounded-[9px] angka text-[14px] ${i < current ? 'bg-tepat text-nila' : i === current ? 'bg-prada text-nila' : 'bg-white/10 text-muted-gelap'}`}>{i < current ? <Icon name="check" size={16} strokeWidth={2.4} /> : i + 1}</span>
                      <span className="text-[15px] font-semibold">{s.name}</span>
                    </li>
                  ))}
                </ol>
                <button type="button" className="tombol-garis-gelap mt-5 w-full" onClick={() => { session.cancel(); setPhase('aturan'); }}><Icon name="x" size={18} />Batalkan tes</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
