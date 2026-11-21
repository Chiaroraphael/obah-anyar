import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { CameraStage } from '../../components/CameraStage';
import { ReferencePlayer } from '../../components/ReferencePlayer';
import { BeatBar, EmptyState, Skeleton, StatusChip } from '../../components/ui';
import { NotFoundPage, ServerErrorPage } from '../../components/PageStates';
import { loadKeypoints, recordAttempt, useDance, useStepAudioUrl, useStepVideoUrl } from '../../lib/queries';
import { useMusikIringan } from '../../lib/media';
import { useProgress } from '../../lib/progress';
import { compareSequences, PASS_SCORE } from '../../pose/compare';
import { buildTips } from '../../pose/feedback';
import { SEGMENTS } from '../../pose/features';
import { READINESS_TEXT } from '../../pose/tracker';
import type { CompareResult, StepKeypoints, Tip } from '../../pose/types';
import { useCourse } from '../dances/useCourse';
import { usePoseCamera } from './usePoseCamera';
import { useMoveSession } from './useMoveSession';
import { useMoveClassifier } from './useMoveClassifier';
import { AttemptResult } from './AttemptResult';
import { DAERAH } from '../../data/katalog';
import { Kain } from '../../components/Ornamen';
import { wastraOf, wastraVars } from '../../lib/wastra';

const SPEEDS = [0.5, 0.75, 1] as const;
const SEG_LABEL: Record<string, string> = {
  lengan_atas_kiri: 'lengan atas kiri', lengan_atas_kanan: 'lengan atas kanan', lengan_bawah_kiri: 'siku kiri', lengan_bawah_kanan: 'siku kanan',
  paha_kiri: 'lutut kiri', paha_kanan: 'lutut kanan', betis_kiri: 'kaki kiri', betis_kanan: 'kaki kanan', badan: 'posisi badan', bahu: 'kedua bahu',
  tekuk_lutut_kiri: 'tekukan lutut kiri', tekuk_lutut_kanan: 'tekukan lutut kanan',
};

export function PracticePage() {
  const { danceId, babNo } = useParams();
  const nav = useNavigate();
  const index = Number(babNo) || 1;
  const dance = useDance(danceId);
  const course = useCourse(danceId);
  const view = course.views.find((v) => v.index === index);
  const step = view?.step ?? undefined;
  const [kp, setKp] = useState<StepKeypoints | null>(null);
  const [kpError, setKpError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [result, setResult] = useState<{ r: CompareResult; tips: Tip[]; crowd: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const addAttempt = useProgress((s) => s.addAttempt);
  const allAttempts = useProgress((s) => s.attempts);
  const posture = dance.data?.posture ?? 'berdiri';
  const cam = usePoseCamera(posture);
  const classifier = useMoveClassifier(danceId);
  const session = useMoveSession(cam, classifier.enabled ? classifier.push : undefined);
  const resultRef = useRef<HTMLDivElement>(null);
  const videoUrl = useStepVideoUrl(step);
  const audioUrl = useStepAudioUrl(step);
  const [musik, setMusik] = useMusikIringan();

  useEffect(() => {
    setKp(null); setKpError(null); setResult(null);
    if (!step) return;
    loadKeypoints(step).then(setKp).catch((e: Error) => setKpError(e.message));
  }, [step]);

  // petunjuk langsung saat merekam: segmen terburuk saat ini
  useEffect(() => {
    if (session.mode !== 'merekam') { setHint(null); return; }
    const id = setInterval(() => {
      const st = cam.statusRef.current;
      if (!st) return;
      const k = st.findIndex((s) => s === 'perbaiki');
      const h = k >= 0 ? k : st.findIndex((s) => s === 'hampir');
      setHint(h >= 0 ? `Perhatikan ${SEG_LABEL[SEGMENTS[h][0]]}` : 'Bagus, pertahankan');
    }, 400);
    return () => clearInterval(id);
  }, [session.mode, cam.statusRef]);

  const history = useMemo(() => allAttempts.filter((a) => a.stepId === step?.id).slice(-5).reverse(), [allAttempts, step?.id]);

  if (dance.isLoading || course.isLoading) return <PracticeSkeleton />;
  if (dance.isError || course.isError) return <ServerErrorPage />;
  if (!dance.data) return <NotFoundPage />;
  if (!step) {
    return (
      <main className="wadah py-16">
        <EmptyState icon="camera" title={view ? `Bagian ${index}, ${view.part.name}, belum terekam` : 'Bagian ini tidak ada'} action={<><Link to={`/tarian/${danceId}`} className="tombol-utama">Kembali ke daftar bagian</Link><Link to="/tarian/pemanasan" className="tombol-garis">Coba Pemanasan Dasar</Link></>}>
          {view ? `Gerak acuan bagian ini belum direkam maestro sanggar. Tarian ini punya ${course.total} bagian, ${course.recordedCount} sudah terekam.` : `Tarian ini punya ${course.total} bagian.`}
        </EmptyState>
      </main>
    );
  }
  const locked = view?.state === 'kunci';
  if (locked) {
    return (
      <main className="wadah py-16">
        <EmptyState icon="lock" title={`Bagian ${index} masih terkunci`} action={course.active ? <Link to={`/tarian/${danceId}/bab/${course.active.index}`} className="tombol-utama">Ke Bagian {course.active.index}</Link> : <Link to={`/tarian/${danceId}`} className="tombol-utama">Daftar bagian</Link>}>
          Luluskan bagian sebelumnya dengan skor minimal {PASS_SCORE} untuk membuka bagian ini.
        </EmptyState>
      </main>
    );
  }

  const busy = session.mode !== 'siap';
  const camReady = cam.phase === 'ready';
  const bodyReady = cam.ready === 'siap';
  const canStart = Boolean(kp) && camReady && bodyReady && !busy;
  const next = index < course.total ? index + 1 : null;
  const nextRecorded = next ? Boolean(course.views.find((v) => v.index === next)?.step) : false;

  const startAttempt = async () => {
    if (!kp) return;
    setResult(null);
    const rec = await session.record(kp, speed);
    if (!rec) return;
    const r = compareSequences(kp.frames, rec.frames, kp.counts, kp.aspect);
    const tips = buildTips(r, 3);
    const at = new Date().toISOString();
    addAttempt({ stepId: step.id, danceId: dance.data!.id, score: r.score, wiraga: r.wiraga, wirama: r.wirama, coverage: r.coverage, speed, at });
    void recordAttempt({ step_id: step.id, score: r.score, wiraga: r.wiraga, wirama: r.wirama, coverage: Number(r.coverage.toFixed(3)), speed });
    setResult({ r, tips, crowd: rec.crowdRatio });
    session.done();
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const watch = async () => { if (kp) await session.watch(kp, speed); };
  const topTip = session.mode === 'merekam' ? hint : result?.tips[0] ? `Hitungan ${result.tips[0].count}: ${result.tips[0].text}` : null;
  const wrongMove = classifier.prediction && classifier.prediction.label !== step.name && classifier.prediction.label !== 'lainnya' && classifier.prediction.prob > 0.6;

  return (
    <div className="tema-gelap min-h-[calc(100dvh-78px)] bg-nila-malam text-mori pb-[230px] lap:pb-10" style={wastraVars(wastraOf(danceId))}>
      <Kain id={danceId} className="h-3 border-b-2 border-nila-malam" />
      <div className="wadah pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Jejak" className="contents">
          {(() => { const r = DAERAH.find((x) => x.id === dance.data!.region_id); return r ? <><Link to={`/daerah/${r.id}`} className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-muted-gelap hover:text-mori">{r.name}</Link><span className="text-mori/20" aria-hidden>/</span></> : null; })()}
          <Link to={`/tarian/${danceId}`} className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-muted-gelap hover:text-mori gap-1.5" aria-label={`Kembali ke daftar bagian ${dance.data.name}`}>
            <Icon name="arrow-left" size={18} />{dance.data.name}
          </Link>
          </nav>
          <span className="text-mori/20" aria-hidden>/</span>
          <h1 className="text-[18px] sm:text-[20px]">Bagian {index} dari {course.total}: {view?.part.name ?? step.name}</h1>
          {step.synthetic && <StatusChip tone="hampir" dark>Gerak sintetis (uji coba)</StatusChip>}
          {classifier.enabled && classifier.prediction && (
            <StatusChip tone={wrongMove ? 'hampir' : 'live'} dark icon="eye">Gerak terdeteksi: {classifier.prediction.label} ({Math.round(classifier.prediction.prob * 100)}%)</StatusChip>
          )}
        </div>
        {wrongMove && <p className="mt-2 text-[14px] font-semibold text-hampir" role="status">Gerak yang terdeteksi bukan gerak bagian ini. Ikuti contoh {step.name}.</p>}

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {result ? (
              <div ref={resultRef}>
                <AttemptResult
                  result={result.r}
                  tips={result.tips}
                  stepName={step.name}
                  crowd={result.crowd}
                  onRetry={() => setResult(null)}
                  onNext={next && nextRecorded ? () => nav(`/tarian/${danceId}/bab/${next}`) : next ? () => nav(`/tarian/${danceId}`) : undefined}
                  onTest={!next ? () => nav(`/tarian/${danceId}/tes`) : undefined}
                />
              </div>
            ) : (
              <>
                <div className="relative lap:grid lap:grid-cols-2 lap:gap-4">
                  <ReferencePlayer
                    keypoints={kp}
                    timeRef={session.timeRef}
                    videoUrl={videoUrl}
                    audioUrl={audioUrl}
                    musik={musik}
                    playing={session.mode === 'menonton' || session.mode === 'merekam'}
                    speed={speed}
                    label="Contoh maestro"
                    className={`${cam.phase === 'ready' || session.mode === 'menonton' ? '' : 'hidden lap:block'} absolute right-3 top-14 z-10 w-[34%] aspect-[3/4] shadow-lg lap:relative lap:inset-auto lap:w-auto lap:aspect-[4/3] lap:shadow-none`}
                  />
                  <CameraStage
                    videoRef={cam.videoRef}
                    canvasRef={cam.canvasRef}
                    phase={cam.phase}
                    ready={cam.ready}
                    errorText={cam.errorText}
                    onStart={cam.start}
                    className="aspect-[3/4] lap:aspect-[4/3]"
                    overlay={
                      <>
                        <div className="absolute left-3 top-12 flex flex-col items-start gap-2">
                          {session.activeCount && <span className="chip bg-prada text-nila text-[14px]">Hitungan {session.activeCount}/{step.counts}</span>}
                          {cam.people > 1 && <span className="chip bg-perbaiki text-mori">Terdeteksi {cam.people} orang</span>}
                        </div>
                        {session.mode === 'merekam' && session.liveScore != null && (
                          <div className="absolute bottom-3 right-3 rounded-[10px] bg-nila-malam/80 px-3 py-2 text-right backdrop-blur" aria-live="off">
                            <div className="label-kecil text-muted-gelap">Skor langsung</div>
                            <div className={`angka text-[30px] leading-none ${session.liveScore >= 70 ? 'text-tepat' : 'text-perbaiki-terang'}`}>{session.liveScore}</div>
                          </div>
                        )}
                        {session.mode === 'merekam' && <span className="absolute right-3 top-3 chip bg-perbaiki text-mori"><Icon name="rec" size={10} className="denyut" />Merekam</span>}
                        {session.mode === 'hitung' && session.countdown && (
                          <div className="absolute inset-0 grid place-items-center bg-nila-malam/40" role="status" aria-live="assertive">
                            <span className="angka text-[120px] text-prada drop-shadow">{session.countdown}</span>
                          </div>
                        )}
                        {session.mode === 'menilai' && (
                          <div className="absolute inset-0 grid place-items-center bg-nila-malam/70" role="status" aria-live="polite">
                            <span className="text-[18px] font-bold denyut">Menilai gerakmu…</span>
                          </div>
                        )}
                      </>
                    }
                  />
                </div>
                {kpError && <p className="mt-3 rounded-[10px] bg-perbaiki/15 p-3 text-[14px] text-perbaiki-terang" role="alert">{kpError}</p>}
              </>
            )}

            {/* Bar kontrol — di HP menjadi bottom sheet */}
            {!result && (
              <section aria-label="Kontrol latihan" className="fixed inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-white/10 bg-nila p-4 pb-[max(16px,env(safe-area-inset-bottom))] lap:static lap:mt-4 lap:rounded-kartu lap:border lap:bg-white/[0.04] lap:p-4">
                {topTip && <p className="mb-3 text-[14px] font-semibold text-mori lap:hidden" aria-live="polite">{topTip}</p>}
                <BeatBar counts={step.counts} active={session.activeCount} scores={session.mode === 'merekam' ? session.liveCounts : undefined} compact />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className={`hidden lap:flex items-center gap-2 text-[14px] font-semibold ${bodyReady && camReady ? 'text-tepat' : 'text-hampir'}`} role="status" aria-live="polite">
                    <span className={`h-2.5 w-2.5 rounded-full ${bodyReady && camReady ? 'bg-tepat' : 'bg-hampir'}`} aria-hidden />
                    {camReady ? READINESS_TEXT[cam.ready] : 'Kamera belum menyala'}
                    {camReady && cam.fps > 0 && <span className="text-muted-gelap font-normal">· {cam.fps} fps</span>}
                  </p>
                  <div className="flex items-center gap-2 lap:ml-auto">
                    {audioUrl && (
                      <button type="button" aria-pressed={musik} onClick={() => setMusik(!musik)} title={musik ? 'Matikan musik iringan' : 'Nyalakan musik iringan'}
                        className={`flex min-h-[52px] items-center gap-2 rounded-[10px] px-3 text-[14px] font-bold ${musik ? 'bg-prada/15 text-prada' : 'bg-white/[0.06] text-muted-gelap hover:text-mori'}`}>
                        <Icon name={musik ? 'music' : 'music-off'} size={18} />
                        <span className="sr-only">Musik iringan </span>{musik ? 'Musik' : 'Musik mati'}
                      </button>
                    )}
                    <div className="flex items-center gap-1 rounded-[10px] bg-white/[0.06] p-1" role="group" aria-label="Kecepatan contoh">
                      {SPEEDS.map((s) => (
                        <button key={s} type="button" disabled={busy} aria-pressed={speed === s} onClick={() => setSpeed(s)}
                          className={`min-h-[44px] min-w-[52px] rounded-[9px] px-2 text-[14px] font-bold ${speed === s ? 'bg-mori text-nila' : 'text-muted-gelap hover:text-mori'}`}>
                          {String(s).replace('.', ',')}×
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 lap:flex lap:w-auto">
                    {session.mode === 'menonton' || session.mode === 'merekam' || session.mode === 'hitung' ? (
                      <button type="button" className="tombol-garis-gelap col-span-2 min-h-[52px] lap:min-h-[44px]" onClick={session.cancel}><Icon name="x" size={18} />Hentikan</button>
                    ) : (
                      <>
                        <button type="button" className="tombol-garis-gelap min-h-[52px] lap:min-h-[44px]" disabled={!kp || busy} onClick={watch}>
                          <Icon name="eye" size={18} /><span className="lap:hidden">Contoh</span><span className="hidden lap:inline">Tonton contoh</span>
                        </button>
                        <button type="button" className="tombol-utama min-h-[52px] lap:min-h-[44px]" disabled={!canStart && camReady} onClick={camReady ? startAttempt : cam.start}
                          title={!bodyReady && camReady ? READINESS_TEXT[cam.ready] : undefined}>
                          <Icon name={camReady ? 'play' : 'camera'} size={18} />{camReady ? 'Mulai coba' : <><span className="lap:hidden">Kamera</span><span className="hidden lap:inline">Nyalakan kamera</span></>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {camReady && !bodyReady && !busy && <p className="mt-2 text-[14px] text-hampir lap:hidden" role="status">{READINESS_TEXT[cam.ready]}</p>}
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="kartu-gelap p-5">
              <h2 className="label-kecil text-prada">Koreksi langsung</h2>
              <p className="mt-2 text-[16px] font-semibold" aria-live="polite">
                {topTip ?? (session.mode === 'siap' ? 'Tekan "Mulai coba". Koreksi muncul di sini saat kamu menari.' : 'Ikuti contoh…')}
              </p>
              <ul className="mt-4 flex flex-wrap gap-3 text-[14px]" aria-label="Legenda warna kerangka">
                <li className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-full bg-tepat" aria-hidden />Tepat</li>
                <li className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-full bg-hampir" aria-hidden />Hampir</li>
                <li className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-full bg-perbaiki" aria-hidden />Perbaiki</li>
              </ul>
            </div>
            <div className="kartu-gelap p-5">
              <h2 className="label-kecil text-prada">Penjelasan gerak</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-mori/90">{step.description}</p>
              <p className="mt-3 text-[14px] text-muted-gelap">Oleh {step.recorded_by_label}, {step.counts} hitungan{audioUrl ? ', dengan musik iringan' : ''}</p>
            </div>
            <div className="kartu-gelap p-5">
              <h2 className="label-kecil text-prada">Riwayat percobaan</h2>
              {history.length === 0 ? (
                <p className="mt-2 text-[14px] text-muted-gelap">Belum ada percobaan di bagian ini.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {history.map((a) => (
                    <li key={a.at} className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="text-muted-gelap">{new Date(a.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}, kecepatan {String(a.speed).replace('.', ',')}×</span>
                      <span className="flex items-center gap-2">
                        <span className={`text-[12px] font-bold ${a.score >= PASS_SCORE ? 'text-tepat' : 'text-perbaiki-terang'}`}>{a.score >= PASS_SCORE ? 'Lulus' : 'Belum'}</span>
                        <span className="angka text-[17px]">{a.score}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PracticeSkeleton() {
  return (
    <div className="tema-gelap min-h-screen bg-nila-malam">
      <div className="wadah pt-6" aria-busy="true">
        <Skeleton className="h-6 w-64" />
        <div className="mt-5 grid gap-4 lap:grid-cols-2"><Skeleton className="aspect-[4/3]" /><Skeleton className="aspect-[4/3]" /></div>
        <Skeleton className="mt-4 h-24" />
      </div>
    </div>
  );
}
