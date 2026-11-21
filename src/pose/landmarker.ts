// TODO(prototipe): ganti dengan landmarker.ts asli. Antarmuka: loadLandmarker -> PoseDetector.
import type { Landmark } from './types';

export type PoseModel = 'lite' | 'full';
export interface PoseDetector {
  detect(video: HTMLVideoElement, timestampMs: number): Landmark[][];
  close(): void;
}

const MODEL_URL: Record<PoseModel, string> = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
};

let cached: Promise<PoseDetector> | null = null;

/** Dimuat belakangan (dynamic import) supaya tidak masuk bundle awal. */
export function loadLandmarker(model: PoseModel = 'lite'): Promise<PoseDetector> {
  if (cached) return cached;
  cached = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
    const create = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL[model], delegate },
        runningMode: 'VIDEO',
        numPoses: 2, // 2 agar bisa mendeteksi lebih dari satu orang
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    const lm = await create('GPU').catch(() => create('CPU'));
    let last = -1;
    return {
      detect(video: HTMLVideoElement, ts: number) {
        const t = ts <= last ? last + 1 : ts;
        last = t;
        const r = lm.detectForVideo(video, t);
        return (r.landmarks ?? []) as Landmark[][];
      },
      close() { lm.close(); cached = null; },
    };
  })();
  cached.catch(() => { cached = null; });
  return cached;
}
