import { useEffect, useRef, type MutableRefObject } from 'react';
import { drawSkeleton } from '../pose/draw';
import { frameAt } from '../pose/session';
import type { StepKeypoints } from '../pose/types';

interface Props {
  keypoints: StepKeypoints | null;
  /** waktu acuan saat ini (ms), diperbarui pemanggil tiap cuplikan */
  timeRef: MutableRefObject<number>;
  videoUrl?: string | null;
  /** lagu iringan; diputar selama `playing`, tetap terdengar walau contoh disembunyikan */
  audioUrl?: string | null;
  /** musik iringan nyala/mati */
  musik?: boolean;
  hidden?: boolean;
  label?: string;
  className?: string;
  playing?: boolean;
  speed?: number;
}

/** Selisih (ms) antara lagu dan jam acuan sebelum lagu digeser ulang. */
const BATAS_GESER_LAGU = 300;

/** Panel "Contoh maestro": video rekaman (bila ada) + kerangka emas yang disinkronkan, plus lagu iringan. */
export function ReferencePlayer({ keypoints, timeRef, videoUrl, audioUrl, musik = true, hidden, label = 'Contoh maestro', className = '', playing, speed = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playingRef = useRef(Boolean(playing));
  playingRef.current = Boolean(playing);
  const musikRef = useRef(musik);
  musikRef.current = musik;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = timeRef.current;
      // lagu mengikuti jam acuan yang sama dengan kerangka & video
      const a = audioRef.current;
      if (a && playingRef.current && musikRef.current && a.readyState >= 2 && Math.abs(a.currentTime * 1000 - t) > BATAS_GESER_LAGU) {
        a.currentTime = t / 1000;
      }
      const c = canvasRef.current;
      if (!c || !keypoints) return;
      const w = c.clientWidth, h = c.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const f = frameAt(keypoints, t);
      // jaga rasio kerangka: gambar di area dengan rasio acuan, di tengah
      const ar = keypoints.aspect || 0.75;
      let dw = w, dh = w / ar;
      if (dh > h) { dh = h; dw = h * ar; }
      ctx.save();
      ctx.translate((w - dw) / 2, (h - dh) / 2);
      drawSkeleton(ctx, f.lm, dw, dh, { color: '#D4A23A', jointColor: '#F7F1E4' });
      ctx.restore();
      const v = videoRef.current;
      if (v && v.readyState >= 2 && Math.abs(v.currentTime * 1000 - t) > 250) v.currentTime = t / 1000;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [keypoints, timeRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    if (playing) void v.play().catch(() => undefined);
    else v.pause();
  }, [playing, speed]);

  // Lagu: putar/jeda mengikuti `playing`, kecepatan mengikuti contoh (nada dijaga browser).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = speed;
    a.muted = !musik;
    if (playing && musik) {
      a.currentTime = Math.max(0, timeRef.current) / 1000;
      void a.play().catch(() => undefined);
    } else {
      a.pause();
    }
  }, [playing, speed, musik, audioUrl, timeRef]);

  // Safari/iOS hanya mengizinkan audio diputar setelah sentuhan pertama; "buka" elemen lagu sekali.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const buka = () => {
      if (playingRef.current || !a.paused) return;
      a.muted = true;
      a.play()
        .then(() => { if (!playingRef.current) a.pause(); a.muted = !musikRef.current; })
        .catch(() => { a.muted = !musikRef.current; });
    };
    window.addEventListener('pointerdown', buka, { once: true });
    return () => window.removeEventListener('pointerdown', buka);
  }, [audioUrl]);

  return (
    <div className={`${/(^|\s)absolute(\s|$)/.test(className) ? '' : 'relative'} overflow-hidden rounded-kartu bg-nila ring-1 ring-white/10 motif-kawung ${className}`} style={{ ['--kawung-opasitas' as string]: 0.07 }}>
      {videoUrl && !hidden && <video ref={videoRef} src={videoUrl} muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-contain opacity-60" />}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" aria-hidden />}
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${hidden ? 'invisible' : ''}`} role="img" aria-label={`${label}: kerangka gerak acuan berwarna emas`} />
      {hidden && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <p className="text-[14px] font-semibold text-muted-gelap">Contoh disembunyikan selama tes</p>
        </div>
      )}
      <span className="absolute left-2 top-2 chip bg-nila-malam/70 px-2 text-[11px] text-prada backdrop-blur lap:left-3 lap:top-3 lap:px-3 lap:text-[12px]">
        <span className="lap:hidden">Contoh</span><span className="hidden lap:inline">{label}</span>
      </span>
    </div>
  );
}
