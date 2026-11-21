/**
 * Mesin satu gerak: tonton contoh, hitung mundur, rekam, nilai langsung.
 * Dipakai halaman Latihan per bab dan Tes akhir.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { frameSimilarity, statusOf } from '../../pose/compare';
import { mirrorFrame } from '../../pose/features';
import { countAt, frameAt, RecordingBuffer } from '../../pose/session';
import { CrowdTracker } from '../../pose/tracker';
import type { PoseFrame, StepKeypoints } from '../../pose/types';
import type { usePoseCamera } from './usePoseCamera';

export type SessionMode = 'siap' | 'menonton' | 'hitung' | 'merekam' | 'menilai';

export interface Recording { frames: PoseFrame[]; crowdRatio: number }

type Cam = ReturnType<typeof usePoseCamera>;

interface Runner {
  kind: 'watch' | 'record';
  ref: StepKeypoints;
  speed: number;
  start: number;
  resolve: (r: Recording | null) => void;
}

export function useMoveSession(cam: Cam, onFrameExtra?: (lm: PoseFrame['lm'], now: number) => void) {
  const [mode, setMode] = useState<SessionMode>('siap');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [liveCounts, setLiveCounts] = useState<(number | null)[]>([]);
  const timeRef = useRef(0);
  const runnerRef = useRef<Runner | null>(null);
  const bufferRef = useRef(new RecordingBuffer());
  const crowdRef = useRef(new CrowdTracker());
  const smoothRef = useRef<number | null>(null);
  const countAccRef = useRef<{ sum: number; n: number }[]>([]);
  const extraRef = useRef(onFrameExtra);
  extraRef.current = onFrameExtra;
  const cancelledRef = useRef(false);

  // pemrosesan tiap cuplikan kamera
  useEffect(() => {
    let lastUi = 0;
    cam.onFrameRef.current = ({ now, poses }) => {
      const main = poses[0];
      if (main) extraRef.current?.(main, now);
      const r = runnerRef.current;
      if (!r || r.kind !== 'record') { cam.statusRef.current = null; return; }
      crowdRef.current.push(poses.length);
      if (!main) return;
      bufferRef.current.push(now, main);
      const t = (now - r.start) * r.speed;
      const sim = frameSimilarity(frameAt(r.ref, t), mirrorFrame({ t, lm: main }), r.ref.aspect);
      cam.statusRef.current = sim.perSegment.map(statusOf);
      const pct = sim.overall * 100;
      smoothRef.current = smoothRef.current == null ? pct : smoothRef.current * 0.85 + pct * 0.15;
      const c = countAt(r.ref, t) - 1;
      const acc = countAccRef.current[c];
      if (acc) { acc.sum += pct; acc.n++; }
      if (now - lastUi > 120) {
        lastUi = now;
        setLiveScore(Math.round(smoothRef.current));
        setLiveCounts(countAccRef.current.map((a, i) => (i < c && a.n ? Math.round(a.sum / a.n) : null)));
      }
    };
    return () => { cam.onFrameRef.current = null; };
  }, [cam.onFrameRef, cam.statusRef]);

  // jam acuan
  useEffect(() => {
    let raf = 0;
    let lastCount = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = runnerRef.current;
      if (!r) return;
      const t = (performance.now() - r.start) * r.speed;
      timeRef.current = Math.min(t, r.ref.durationMs);
      const c = countAt(r.ref, t);
      if (c !== lastCount) { lastCount = c; setActiveCount(c); }
      if (t >= r.ref.durationMs) {
        runnerRef.current = null;
        lastCount = -1;
        cam.statusRef.current = null;
        if (r.kind === 'record') {
          r.resolve({ frames: bufferRef.current.normalized(r.speed).map(mirrorFrame), crowdRatio: crowdRef.current.ratio });
        } else r.resolve(null);
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [cam.statusRef]);

  const watch = useCallback((ref: StepKeypoints, speed: number) => {
    cancelledRef.current = false;
    setMode('menonton');
    return new Promise<void>((resolve) => {
      runnerRef.current = { kind: 'watch', ref, speed, start: performance.now(), resolve: () => { setMode('siap'); setActiveCount(null); resolve(); } };
    });
  }, []);

  const countdownFn = useCallback(async () => {
    setMode('hitung');
    for (const n of [3, 2, 1]) {
      if (cancelledRef.current) break;
      setCountdown(n);
      await new Promise((r) => setTimeout(r, 900));
    }
    setCountdown(null);
  }, []);

  /** Rekam satu gerak. Mengembalikan null bila dibatalkan. */
  const record = useCallback(async (ref: StepKeypoints, speed: number, opts: { countdown?: boolean } = {}): Promise<Recording | null> => {
    cancelledRef.current = false;
    timeRef.current = 0;
    if (opts.countdown !== false) await countdownFn();
    if (cancelledRef.current) { setMode('siap'); return null; }
    bufferRef.current.begin(performance.now());
    crowdRef.current.reset();
    smoothRef.current = null;
    countAccRef.current = Array.from({ length: ref.counts }, () => ({ sum: 0, n: 0 }));
    setLiveCounts(Array(ref.counts).fill(null));
    setLiveScore(null);
    setMode('merekam');
    const rec = await new Promise<Recording | null>((resolve) => {
      runnerRef.current = { kind: 'record', ref, speed, start: performance.now(), resolve };
    });
    setActiveCount(null);
    setMode(rec ? 'menilai' : 'siap');
    return rec;
  }, [countdownFn]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const r = runnerRef.current;
    runnerRef.current = null;
    cam.statusRef.current = null;
    r?.resolve(null);
    setMode('siap');
    setActiveCount(null);
    setCountdown(null);
  }, [cam.statusRef]);

  const done = useCallback(() => setMode('siap'), []);

  return { mode, countdown, activeCount, liveScore, liveCounts, timeRef, watch, record, cancel, done };
}
