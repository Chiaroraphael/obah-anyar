// TODO(prototipe): ganti dengan session.ts asli. Antarmuka: frameAt, countAt, RecordingBuffer.
import type { PoseFrame, StepKeypoints } from './types';

/** Cuplikan acuan pada waktu t (ms waktu acuan). */
export function frameAt(ref: StepKeypoints, t: number): PoseFrame {
  const f = ref.frames;
  if (!f.length) return { t, lm: [] };
  const clamped = Math.max(0, Math.min(ref.durationMs, t));
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (f[m].t < clamped) lo = m + 1;
    else hi = m;
  }
  return f[lo];
}

/** Hitungan aktif (1-based) pada waktu t. */
export function countAt(ref: Pick<StepKeypoints, 'counts' | 'durationMs'>, t: number): number {
  return Math.min(ref.counts, Math.max(1, Math.floor((t / ref.durationMs) * ref.counts) + 1));
}

export class RecordingBuffer {
  frames: PoseFrame[] = [];
  private start = 0;
  begin(now: number) { this.frames = []; this.start = now; }
  push(now: number, lm: PoseFrame['lm']) { this.frames.push({ t: now - this.start, lm }); }
  /** Normalisasi waktu ke durasi acuan (untuk kecepatan 0,5x / 0,75x). */
  normalized(speed: number): PoseFrame[] { return this.frames.map((f) => ({ t: f.t * speed, lm: f.lm })); }
  toKeypoints(counts: number, aspect: number): StepKeypoints {
    const durationMs = this.frames.length ? this.frames[this.frames.length - 1].t : 0;
    const fps = durationMs ? Math.round((this.frames.length / durationMs) * 1000) : 0;
    return { version: 1, counts, durationMs, aspect, fps, frames: this.frames };
  }
}
