// TODO(prototipe): ganti dengan compare.ts asli (DTW + wiraga/wirama). Antarmuka: compareSequences, frameSimilarity, statusOf, PASS_SCORE.
import { angleDiff, BOBOT_SEGMEN, frameFeatures, SEGMEN_KAKI, SEGMEN_TEKUK, SEGMENTS } from './features';
import type { CompareResult, PoseFrame, SegmentStatus } from './types';

export const PASS_SCORE = 70;
const N = 64; // jumlah titik setelah resample
const TOL = Math.PI / 3; // selisih 60 derajat = kecocokan 0

export function statusOf(sim: number): SegmentStatus {
  return sim >= 0.8 ? 'tepat' : sim >= 0.6 ? 'hampir' : 'perbaiki';
}

/** Kecocokan satu cuplikan pelajar vs acuan: keseluruhan & per segmen (0–1). */
export function frameSimilarity(ref: PoseFrame, user: PoseFrame, aspect = 1) {
  const r = frameFeatures(ref.lm, aspect);
  const u = frameFeatures(user.lm, aspect);
  const signed = r.angles.map((a, i) => angleDiff(u.angles[i], a));
  // Segmen kaki (sering tertutup kain) yang tidak terbaca di acuan atau pelajar tidak ikut dinilai, bukan dinilai 0.
  const dinilai = SEGMENTS.map(([name], i) => !((SEGMEN_KAKI.has(name) || SEGMEN_TEKUK.has(name)) && (r.vis[i] < 0.4 || u.vis[i] < 0.4)));
  const perSegment = signed.map((d, i) => (!dinilai[i] ? 1 : u.vis[i] < 0.4 ? 0 : Math.max(0, 1 - Math.abs(d) / TOL)));
  let sum = 0;
  let wsum = 0;
  perSegment.forEach((v, i) => { if (dinilai[i]) { sum += v * BOBOT_SEGMEN[i]; wsum += BOBOT_SEGMEN[i]; } });
  // dikuadratkan agar segmen yang diam (dan otomatis cocok) tidak menutupi kesalahan
  const mean = wsum > 0 ? sum / wsum : 0;
  const overall = mean * mean;
  return { overall, perSegment, signed: signed.map((d, i) => (dinilai[i] ? d : 0)) };
}

function resample(frames: PoseFrame[], n: number): PoseFrame[] {
  if (frames.length === 0) return [];
  const out: PoseFrame[] = [];
  for (let i = 0; i < n; i++) out.push(frames[Math.min(frames.length - 1, Math.round((i / (n - 1)) * (frames.length - 1)))]);
  return out;
}

function empty(counts: number, coverage: number): CompareResult {
  return {
    score: 0, wiraga: 0, wirama: 0, coverage,
    perCount: Array(counts).fill(0), curve: Array(N).fill(0),
    segmentErrors: Array.from({ length: counts }, () => Array(SEGMENTS.length).fill(0)),
  };
}

/**
 * Bandingkan rekaman pelajar dengan acuan memakai Dynamic Time Warping.
 * userFrames: cuplikan yang SUDAH dicerminkan (mirrorFrame) bila perlu.
 */
export function compareSequences(refFrames: PoseFrame[], userFrames: PoseFrame[], counts: number, aspect = 1): CompareResult {
  const visible = userFrames.filter((f) => f.lm.length >= 29 && (f.lm[11].visibility ?? 1) > 0.4 && (f.lm[23].visibility ?? 1) > 0.4);
  const coverage = userFrames.length ? visible.length / userFrames.length : 0;
  const ref = resample(refFrames, N);
  const user = resample(visible, N);
  if (!ref.length || !user.length) return empty(counts, coverage);

  const sim: number[][] = ref.map((r) => user.map((u) => frameSimilarity(r, u, aspect).overall));
  // DTW dengan pita Sakoe-Chiba 25%
  const band = Math.ceil(N * 0.25);
  const cost = Array.from({ length: N }, () => Array<number>(N).fill(Infinity));
  for (let i = 0; i < N; i++) {
    for (let j = Math.max(0, i - band); j <= Math.min(N - 1, i + band); j++) {
      const c = 1 - sim[i][j];
      const prev = i === 0 && j === 0 ? 0 : Math.min(
        i > 0 ? cost[i - 1][j] : Infinity,
        j > 0 ? cost[i][j - 1] : Infinity,
        i > 0 && j > 0 ? cost[i - 1][j - 1] : Infinity,
      );
      cost[i][j] = c + prev;
    }
  }
  const path: Array<[number, number]> = [];
  let i = N - 1;
  let j = N - 1;
  path.push([i, j]);
  while (i > 0 || j > 0) {
    const opts: Array<[number, number, number]> = [];
    if (i > 0 && j > 0) opts.push([cost[i - 1][j - 1], i - 1, j - 1]);
    if (i > 0) opts.push([cost[i - 1][j], i - 1, j]);
    if (j > 0) opts.push([cost[i][j - 1], i, j - 1]);
    opts.sort((a, b) => a[0] - b[0]);
    i = opts[0][1];
    j = opts[0][2];
    path.push([i, j]);
  }
  path.reverse();

  const acc = Array<number>(N).fill(0);
  const cnt = Array<number>(N).fill(0);
  let dev = 0;
  for (const [a, b] of path) { acc[a] += sim[a][b]; cnt[a]++; dev += Math.abs(a - b) / N; }
  const curve = acc.map((v, k) => Math.round((v / Math.max(1, cnt[k])) * 100));
  const wiraga = Math.round((curve.reduce((s, v) => s + v, 0) / N) * Math.min(1, coverage / 0.8));
  const wirama = Math.round(Math.max(0, 1 - dev / path.length / 0.2) * 100);

  const perCount: number[] = [];
  const segmentErrors: number[][] = [];
  for (let c = 0; c < counts; c++) {
    const from = Math.floor((c / counts) * N);
    const to = Math.max(from + 1, Math.floor(((c + 1) / counts) * N));
    const slice = curve.slice(from, to);
    perCount.push(Math.round(slice.reduce((s, v) => s + v, 0) / slice.length));
    const errs = Array<number>(SEGMENTS.length).fill(0);
    let n = 0;
    for (const [a, b] of path) {
      if (a >= from && a < to) { frameSimilarity(ref[a], user[b], aspect).signed.forEach((e, k) => (errs[k] += e)); n++; }
    }
    segmentErrors.push(errs.map((e) => e / Math.max(1, n)));
  }
  const score = Math.round(wiraga * 0.75 + wirama * 0.25);
  return { score, wiraga, wirama, perCount, curve, coverage, segmentErrors };
}
