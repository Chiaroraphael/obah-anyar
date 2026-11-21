// TODO(prototipe): ganti dengan draw.ts asli. Antarmuka: drawSkeleton, BONES, STATUS_COLOR.
import { SEGMENTS } from './features';
import type { Landmark, SegmentStatus } from './types';

export const STATUS_COLOR: Record<SegmentStatus, string> = { tepat: '#3FCFB8', hampir: '#F3B63F', perbaiki: '#E8553E' };

export const BONES: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32],
];

const KAKI_KIRI = new Set([23, 25, 27]);
const KAKI_KANAN = new Set([24, 26, 28]);

/** Tulang paha & betis diwarnai menurut perkiraan tekukan lutut (titik lutut sering tertutup kain). */
function boneSegment(a: number, b: number): number {
  if (KAKI_KIRI.has(a) && KAKI_KIRI.has(b)) return SEGMENTS.findIndex(([n]) => n === 'tekuk_lutut_kiri');
  if (KAKI_KANAN.has(a) && KAKI_KANAN.has(b)) return SEGMENTS.findIndex(([n]) => n === 'tekuk_lutut_kanan');
  return SEGMENTS.findIndex(([, p, q]) => (p === a && q === b) || (p === b && q === a));
}

export interface DrawOptions {
  color?: string;
  jointColor?: string;
  status?: SegmentStatus[]; // per SEGMENTS
  mirror?: boolean;
  lineWidth?: number;
}

export function drawSkeleton(ctx: CanvasRenderingContext2D, lm: Landmark[], w: number, h: number, opt: DrawOptions = {}) {
  const X = (x: number) => (opt.mirror ? (1 - x) * w : x * w);
  const lw = opt.lineWidth ?? Math.max(3, w / 110);
  ctx.lineCap = 'round';
  for (const [a, b] of BONES) {
    const p = lm[a];
    const q = lm[b];
    // tulang kaki yang samar (mis. tertutup kain) tidak digambar agar tidak tampak bergetar
    const min = a >= 25 || b >= 25 ? 0.5 : 0.3;
    if (!p || !q || (p.visibility ?? 1) < min || (q.visibility ?? 1) < min) continue;
    const seg = boneSegment(a, b);
    ctx.strokeStyle = opt.status && seg >= 0 ? STATUS_COLOR[opt.status[seg]] : opt.color ?? '#D4A23A';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(X(p.x), p.y * h);
    ctx.lineTo(X(q.x), q.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = opt.jointColor ?? '#F7F1E4';
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = lm[i];
    if (!p || (p.visibility ?? 1) < (i >= 25 ? 0.5 : 0.3)) continue;
    ctx.beginPath();
    ctx.arc(X(p.x), p.y * h, i === 0 ? lw * 2.4 : lw * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}
