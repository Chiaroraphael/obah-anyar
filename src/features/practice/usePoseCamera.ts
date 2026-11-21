/**
 * Kamera + estimasi pose di perangkat. Video tidak pernah dikirim ke mana pun.
 * Menyediakan cuplikan pose terbaru, kesiapan badan, jumlah orang, dan fps.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLandmarker, type PoseDetector } from '../../pose/landmarker';
import { PoseSmoother, readiness as checkReadiness, type Readiness } from '../../pose/tracker';
import { drawSkeleton } from '../../pose/draw';
import type { Landmark, SegmentStatus } from '../../pose/types';
import { POSE_MODEL } from '../../lib/supabase';

export type CameraPhase = 'idle' | 'loading-model' | 'requesting' | 'ready' | 'denied' | 'notfound' | 'insecure' | 'error';

export interface FrameInfo { now: number; poses: Landmark[][] }

export function usePoseCamera(posture: 'berdiri' | 'duduk' = 'berdiri') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<CameraPhase>('idle');
  const [ready, setReady] = useState<Readiness>('tidak-ada');
  const [people, setPeople] = useState(0);
  const [fps, setFps] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const latestRef = useRef<Landmark[] | undefined>(undefined);
  /** Diisi pemakai: status warna per segmen untuk menggambar kerangka. */
  const statusRef = useRef<SegmentStatus[] | null>(null);
  /** Diisi pemakai: dipanggil setiap cuplikan. */
  const onFrameRef = useRef<((f: FrameInfo) => void) | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const loop = useCallback(() => {
    let frames = 0;
    let lastFpsAt = performance.now();
    let lastReady: Readiness | null = null;
    let lastPeople = -1;
    const smoother = new PoseSmoother();
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const v = videoRef.current;
      const c = canvasRef.current;
      const det = detectorRef.current;
      if (!v || !c || !det || v.readyState < 2) return;
      const now = performance.now();
      let poses: Landmark[][] = [];
      try { poses = det.detect(v, now); } catch { return; }
      // haluskan penari utama (titik mentah MediaPipe bergetar, terutama kaki)
      const main = smoother.push(poses[0], now);
      if (main) poses = [main, ...poses.slice(1)];
      latestRef.current = main;
      const r = checkReadiness(main, posture);
      if (r !== lastReady) { lastReady = r; setReady(r); }
      if (poses.length !== lastPeople) { lastPeople = poses.length; setPeople(poses.length); }
      onFrameRef.current?.({ now, poses });
      // gambar
      const w = c.clientWidth, h = c.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // sesuaikan dengan object-cover video
      const vw = v.videoWidth || 640, vh = v.videoHeight || 480;
      const scale = Math.max(w / vw, h / vh);
      const dw = vw * scale, dh = vh * scale;
      ctx.save();
      ctx.translate((w - dw) / 2, (h - dh) / 2);
      for (let i = 1; i < poses.length; i++) drawSkeleton(ctx, poses[i], dw, dh, { color: 'rgba(185,183,207,.5)', mirror: true });
      if (main) drawSkeleton(ctx, main, dw, dh, { mirror: true, status: statusRef.current ?? undefined, color: '#3FCFB8' });
      ctx.restore();
      frames++;
      if (now - lastFpsAt > 1000) { setFps(Math.round((frames * 1000) / (now - lastFpsAt))); frames = 0; lastFpsAt = now; }
    };
    tick();
  }, [posture]);

  const start = useCallback(async () => {
    setErrorText(null);
    if (!window.isSecureContext) { setPhase('insecure'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setPhase('notfound'); return; }
    setPhase('loading-model');
    const modelP = loadLandmarker(POSE_MODEL).then((d) => { detectorRef.current = d; });
    try {
      await modelP;
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
      setPhase('error');
      return;
    }
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setPhase('ready');
      loop();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setPhase('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') setPhase('notfound');
      else { setErrorText(String(e)); setPhase('error'); }
    }
  }, [loop]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, canvasRef, phase, ready, people, fps, errorText, latestRef, statusRef, onFrameRef, start, stop };
}
