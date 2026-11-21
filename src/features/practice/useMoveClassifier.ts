/**
 * Klasifikasi ragam gerak (JST) di perangkat dengan TensorFlow.js.
 * Model aktif diambil dari tabel ai_models (kind 'klasifikasi'). Bila belum ada
 * model aktif, hook mengembalikan null dan fitur disembunyikan tanpa galat.
 * Fitur masukan = sudut 10 segmen dari features.ts (HARUS sama dengan saat pelatihan),
 * jendela 2 detik, prediksi tiap 0,5 detik.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { frameFeatures } from '../../pose/features';
import type { Landmark } from '../../pose/types';

interface ModelRow { id: string; url: string; labels: string[]; version: number }
export interface Prediction { label: string; prob: number }

const WINDOW_MS = 2000;
const STEP_MS = 500;
const FRAMES = 30; // jendela di-resample ke 30 cuplikan (≈15 fps)

export function useMoveClassifier(danceId: string | undefined) {
  const modelRow = useQuery({
    queryKey: ['ai-model', danceId, 'klasifikasi'],
    enabled: Boolean(danceId && supabase),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ModelRow | null> => {
      const { data } = await supabase!.from('ai_models').select('id,url,labels,version').eq('dance_id', danceId!).eq('kind', 'klasifikasi').eq('active', true).maybeSingle();
      return (data as ModelRow) ?? null;
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tfRef = useRef<any>(null);
  const windowRef = useRef<{ t: number; f: number[] }[]>([]);
  const lastPredRef = useRef(0);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    const row = modelRow.data;
    if (!row) return;
    let alive = true;
    (async () => {
      try {
        const tf = await import('@tensorflow/tfjs');
        const m = await tf.loadLayersModel(row.url);
        if (alive) { tfRef.current = tf; modelRef.current = m; }
      } catch (e) {
        console.warn('Model klasifikasi tidak bisa dimuat; fitur disembunyikan.', e);
      }
    })();
    return () => { alive = false; };
  }, [modelRow.data]);

  const push = useCallback((lm: Landmark[], now: number) => {
    const m = modelRef.current, tf = tfRef.current, row = modelRow.data;
    if (!m || !tf || !row) return;
    windowRef.current.push({ t: now, f: frameFeatures(lm).angles });
    while (windowRef.current.length && now - windowRef.current[0].t > WINDOW_MS) windowRef.current.shift();
    if (now - lastPredRef.current < STEP_MS || windowRef.current.length < 8) return;
    lastPredRef.current = now;
    const w = windowRef.current;
    const seq = Array.from({ length: FRAMES }, (_, i) => w[Math.round((i / (FRAMES - 1)) * (w.length - 1))].f);
    const probs: number[] = tf.tidy(() => Array.from(m.predict(tf.tensor3d([seq])).dataSync() as Float32Array));
    let best = 0;
    probs.forEach((p, i) => { if (p > probs[best]) best = i; });
    setPrediction({ label: row.labels[best] ?? 'lainnya', prob: probs[best] });
  }, [modelRow.data]);

  return { enabled: Boolean(modelRow.data), prediction, push };
}
