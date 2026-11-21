/**
 * Gerak pemanasan SINTETIS (bukan rekaman maestro) — hanya untuk uji coba
 * alur latihan sebelum ada rekaman asli. Diberi label jelas di antarmuka.
 */
import type { Landmark, PoseFrame, StepKeypoints } from '../pose/types';

export type SyntheticKind = 'angkat-lengan' | 'mendhak' | 'ayun-samping';

interface Params { armL: number; armR: number; elbowL: number; elbowR: number; knee: number; sway: number }

const UPPER = 0.12, FORE = 0.11, THIGH = 0.17, SHIN = 0.17;

function at(x: number, y: number): Landmark { return { x, y, z: 0, visibility: 0.99 }; }

/** Bangun 33 titik MediaPipe dari parameter sendi. Sudut lengan: 0 = turun, pi/2 = ke samping, pi = ke atas. */
export function buildPose(p: Params): Landmark[] {
  const cx = 0.5 + p.sway;
  const drop = p.knee * 0.07;
  const shY = 0.3 + drop, hipY = 0.53 + drop;
  const lSh = at(cx + 0.075, shY), rSh = at(cx - 0.075, shY);
  const lHip = at(cx + 0.05, hipY), rHip = at(cx - 0.05, hipY);
  const arm = (sh: Landmark, ang: number, elb: number, side: 1 | -1) => {
    const e = at(sh.x + side * Math.sin(ang) * UPPER, sh.y + Math.cos(ang) * UPPER);
    const a2 = ang + elb;
    const w = at(e.x + side * Math.sin(a2) * FORE, e.y + Math.cos(a2) * FORE);
    return [e, w] as const;
  };
  const [lEl, lWr] = arm(lSh, p.armL, p.elbowL, 1);
  const [rEl, rWr] = arm(rSh, p.armR, p.elbowR, -1);
  const kneeOut = p.knee * 0.07;
  const lKn = at(lHip.x + kneeOut, hipY + THIGH * (1 - p.knee * 0.35));
  const rKn = at(rHip.x - kneeOut, hipY + THIGH * (1 - p.knee * 0.35));
  const lAn = at(lHip.x + 0.02, 0.9);
  const rAn = at(rHip.x - 0.02, 0.9);
  void SHIN;
  const headY = shY - 0.1;
  const lm: Landmark[] = [];
  lm[0] = at(cx, headY);
  for (let i = 1; i <= 10; i++) lm[i] = at(cx + (i <= 3 || i === 7 || i === 9 ? 0.02 : -0.02), headY - 0.01 + (i >= 9 ? 0.03 : 0));
  lm[11] = lSh; lm[12] = rSh; lm[13] = lEl; lm[14] = rEl; lm[15] = lWr; lm[16] = rWr;
  lm[17] = lm[19] = lm[21] = at(lWr.x, lWr.y + 0.01);
  lm[18] = lm[20] = lm[22] = at(rWr.x, rWr.y + 0.01);
  lm[23] = lHip; lm[24] = rHip; lm[25] = lKn; lm[26] = rKn; lm[27] = lAn; lm[28] = rAn;
  lm[29] = at(lAn.x - 0.01, 0.92); lm[30] = at(rAn.x + 0.01, 0.92);
  lm[31] = at(lAn.x + 0.03, 0.93); lm[32] = at(rAn.x - 0.03, 0.93);
  return lm;
}

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x);

function paramsAt(kind: SyntheticKind, u: number): Params {
  const base: Params = { armL: 0.15, armR: 0.15, elbowL: 0, elbowR: 0, knee: 0, sway: 0 };
  const cycle = ease((u * 2) % 1); // dua siklus per gerak
  if (kind === 'angkat-lengan') return { ...base, armL: 0.15 + cycle * 2.6, armR: 0.15 + cycle * 2.6 };
  if (kind === 'mendhak') return { ...base, knee: cycle, armL: 1.2, armR: 1.2, elbowL: 0.9, elbowR: 0.9 };
  const s = Math.sin(u * Math.PI * 4);
  return { ...base, armL: 1.5 + s * 0.5, armR: 1.5 - s * 0.5, elbowL: 0.3, elbowR: 0.3, sway: s * 0.03 };
}

export function syntheticStep(kind: SyntheticKind, durationMs = 8000, counts = 8, fps = 30): StepKeypoints {
  const frames: PoseFrame[] = [];
  const n = Math.round((durationMs / 1000) * fps);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * durationMs;
    frames.push({ t, lm: buildPose(paramsAt(kind, t / durationMs)) });
  }
  return { version: 1, counts, durationMs, aspect: 3 / 4, fps, frames };
}
