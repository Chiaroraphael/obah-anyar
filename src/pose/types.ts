/**
 * Tipe bersama modul AI.
 * TODO(prototipe): modul asli `src/pose/` dari repo prototipe belum dilampirkan.
 * File-file di folder ini menyediakan ANTARMUKA yang sama dengan implementasi
 * sederhana agar aplikasi bisa berjalan ujung ke ujung. Ganti isi file dengan
 * modul prototipe apa adanya (features.ts, compare.ts, feedback.ts, tracker.ts,
 * landmarker.ts, draw.ts, session.ts) — jangan ubah tanda tangan fungsi di sini
 * tanpa menyesuaikan pemanggilnya di src/features/practice & src/features/test.
 */
export interface Landmark { x: number; y: number; z: number; visibility?: number }
/** Satu cuplikan pose: 33 titik tubuh MediaPipe, t dalam ms sejak awal gerak. */
export interface PoseFrame { t: number; lm: Landmark[] }
/** Data kerangka gerak acuan (disimpan di bucket step-keypoints). */
export interface StepKeypoints {
  version: 1;
  counts: number;
  durationMs: number;
  aspect: number;
  fps: number;
  frames: PoseFrame[];
}
export type SegmentStatus = 'tepat' | 'hampir' | 'perbaiki';
export interface CompareResult {
  score: number;   // 0–100
  wiraga: number;  // ketepatan gerak 0–100
  wirama: number;  // ketepatan irama 0–100
  perCount: number[]; // skor per hitungan 0–100
  curve: number[];    // kecocokan sepanjang gerak 0–100
  coverage: number;   // 0–1, porsi cuplikan dengan badan terlihat
  segmentErrors: number[][]; // [hitungan][segmen] selisih bertanda (rad)
}
export interface Tip { count: number; text: string; key: string; severity: SegmentStatus }
