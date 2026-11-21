import { describe, expect, it } from 'vitest';
import { bagianOf, DAERAH, PEMANASAN, TARIAN, TINGKAT } from './katalog';
import { REKAMAN } from './rekaman';

describe('katalog per daerah', () => {
  it('setiap tarian punya daerah yang terdaftar', () => {
    const ids = new Set(DAERAH.map((d) => d.id));
    TARIAN.forEach((t) => expect(ids.has(t.region), t.id).toBe(true));
  });
  it('id tarian unik', () => {
    const ids = [...TARIAN, PEMANASAN].map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('setiap daerah punya minimal 3 tarian', () => {
    DAERAH.forEach((d) => expect(TARIAN.filter((t) => t.region === d.id).length, d.id).toBeGreaterThanOrEqual(3));
  });
  it('jumlah bagian sesuai tingkat kesulitan (kecuali bagian yang mengikuti rekaman acuan)', () => {
    [...TARIAN, PEMANASAN].filter((t) => !t.rekaman).forEach((t) => {
      const n = bagianOf(t).length;
      if (t.tingkat < 4) expect(n, t.id).toBe(TINGKAT[t.tingkat].bagian);
      else expect(n, t.id).toBeGreaterThanOrEqual(TINGKAT[4].bagian);
    });
  });
  it('makin sulit, makin banyak bagian (kerangka draf)', () => {
    const rata = (lv: 1 | 2 | 3 | 4) => {
      const xs = TARIAN.filter((t) => t.tingkat === lv && !t.rekaman).map((t) => bagianOf(t).length);
      return xs.reduce((s, x) => s + x, 0) / xs.length;
    };
    expect(rata(1)).toBeLessThan(rata(2));
    expect(rata(2)).toBeLessThan(rata(3));
    expect(rata(3)).toBeLessThan(rata(4));
  });
});

describe('rekaman acuan bawaan', () => {
  it('setiap rekaman punya tarian bertanda rekaman dengan jumlah bagian sama', () => {
    REKAMAN.forEach((r) => {
      const t = TARIAN.find((x) => x.id === r.danceId);
      expect(t, r.danceId).toBeDefined();
      expect(t!.rekaman, r.danceId).toBe(true);
      expect(bagianOf(t!).length, r.danceId).toBe(r.bab.length);
    });
  });
  it('hitungan bab sama dengan hitungan bagian, durasi 1–60 detik, hitungan 1–64', () => {
    REKAMAN.forEach((r) => {
      const parts = bagianOf(TARIAN.find((x) => x.id === r.danceId)!);
      r.bab.forEach((b, i) => {
        expect(b.counts, `${r.danceId} bab ${i + 1}`).toBe(parts[i].counts);
        expect(b.durationMs).toBeGreaterThanOrEqual(1000);
        expect(b.durationMs).toBeLessThanOrEqual(60000);
        expect(b.counts).toBeGreaterThanOrEqual(1);
        expect(b.counts).toBeLessThanOrEqual(64);
      });
    });
  });
  it('id gerak unik dan berformat uuid', () => {
    const ids = REKAMAN.flatMap((r) => r.bab.map((b) => b.id));
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
  });
});
