import { describe, expect, it } from 'vitest';
import { compareSequences, frameSimilarity, PASS_SCORE } from './compare';
import { buildTips } from './feedback';
import { mirrorFrame, tekukLutut } from './features';
import { readiness } from './tracker';
import { countAt } from './session';
import { buildPose, syntheticStep } from '../lib/synthetic';

const ref = syntheticStep('angkat-lengan');

describe('modul pose (antarmuka sementara)', () => {
  it('gerak identik mendapat skor tinggi', () => {
    const r = compareSequences(ref.frames, ref.frames, ref.counts);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.perCount).toHaveLength(ref.counts);
  });
  it('gerak berbeda mendapat skor lebih rendah', () => {
    const r = compareSequences(ref.frames, syntheticStep('mendhak').frames, ref.counts);
    expect(r.score).toBeLessThan(PASS_SCORE);
  });
  it('mirror dua kali kembali ke semula', () => {
    const f = ref.frames[10];
    expect(mirrorFrame(mirrorFrame(f)).lm[13].x).toBeCloseTo(f.lm[13].x);
  });
  it('mirror pose simetris tetap cocok', () => {
    const f = ref.frames[20];
    expect(frameSimilarity(f, mirrorFrame(f)).overall).toBeGreaterThan(0.95);
  });
  it('kecocokan cuplikan sama = 1', () => {
    expect(frameSimilarity(ref.frames[5], ref.frames[5]).overall).toBeCloseTo(1);
  });
  it('koreksi maksimal 3 dan bernomor hitungan', () => {
    const r = compareSequences(ref.frames, syntheticStep('ayun-samping').frames, ref.counts);
    const tips = buildTips(r);
    expect(tips.length).toBeLessThanOrEqual(3);
    tips.forEach((t) => expect(t.count).toBeGreaterThanOrEqual(1));
  });
  it('kesiapan badan', () => {
    expect(readiness(undefined)).toBe('tidak-ada');
    expect(readiness(ref.frames[0].lm)).toBe('siap');
    const noFeet = ref.frames[0].lm.map((p, i) => (i === 27 || i === 28 ? { ...p, visibility: 0.1 } : p));
    expect(readiness(noFeet)).toBe('kaki');
    expect(readiness(noFeet, 'duduk')).toBe('siap');
  });
  it('hitungan aktif', () => {
    expect(countAt({ counts: 8, durationMs: 8000 }, 0)).toBe(1);
    expect(countAt({ counts: 8, durationMs: 8000 }, 7999)).toBe(8);
  });
});

describe('tekukan lutut dari pinggul–pergelangan kaki (lutut tertutup kain)', () => {
  const mendhak = syntheticStep('mendhak');
  const lurus = syntheticStep('angkat-lengan').frames[0];
  const dalam = mendhak.frames.reduce((a, f) => (f.lm[23].y > a.lm[23].y ? f : a));
  it('kaki lurus ≈ tidak ditekuk, mendhak lebih ditekuk', () => {
    const l = tekukLutut(lurus.lm, 23, 27, 0.75).angle;
    const d = tekukLutut(dalam.lm, 23, 27, 0.75).angle;
    expect(d).toBeGreaterThan(l + 0.3);
  });
  it('tidak memakai titik lutut: lutut yang ditebak salah tidak mengubah perkiraan', () => {
    const rusak = dalam.lm.map((p, i) => (i === 25 || i === 26 ? { ...p, x: p.x + 0.2, y: p.y - 0.1 } : p));
    expect(tekukLutut(rusak, 23, 27, 0.75).angle).toBeCloseTo(tekukLutut(dalam.lm, 23, 27, 0.75).angle);
  });
  it('lutut tertutup (visibilitas rendah) tidak menurunkan kecocokan', () => {
    const tertutup = dalam.lm.map((p, i) => (i === 25 || i === 26 ? { x: p.x + 0.15, y: p.y - 0.15, z: 0, visibility: 0.1 } : p));
    expect(frameSimilarity(dalam, { t: 0, lm: tertutup }, 0.75).overall).toBeGreaterThan(0.95);
  });
  it('acuan mendhak, pelajar berdiri lurus → skor turun dan koreksi tekuk lutut', () => {
    const tegak = mendhak.frames.map((f) => ({ t: f.t, lm: buildPose({ armL: 1.2, armR: 1.2, elbowL: 0.9, elbowR: 0.9, knee: 0, sway: 0 }) }));
    const r = compareSequences(mendhak.frames, tegak, mendhak.counts, 0.75);
    expect(r.score).toBeLessThan(compareSequences(mendhak.frames, mendhak.frames, mendhak.counts, 0.75).score);
    expect(buildTips(r).some((t) => t.key.startsWith('tekuk_lutut') && t.text.includes('lebih dalam'))).toBe(true);
  });
});
