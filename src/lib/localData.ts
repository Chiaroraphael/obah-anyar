/**
 * Data lokal untuk mode tanpa Supabase (pengembangan / pratinjau).
 * Dibangun dari src/data/katalog.ts — sumber yang sama dengan supabase/seed_katalog.sql.
 * Deskripsi tarian dan bagian bertanda draf; nama maestro/sanggar = placeholder.
 */
import { bagianOf, DAERAH, PEMANASAN, TARIAN, type TarianData } from '../data/katalog';
import { asetBab, REKAMAN } from '../data/rekaman';
import type { Dance, DancePart, LeaderboardRow, Region, Step } from '../types/database.types';

const draf = ' (Deskripsi draf — perlu ditinjau sanggar.)';
const ALL: TarianData[] = [...TARIAN, PEMANASAN];

export const LOCAL_REGIONS: Region[] = DAERAH.map((d) => ({ ...d, dance_count: TARIAN.filter((t) => t.region === d.id).length }));

export const LOCAL_PARTS: DancePart[] = ALL.flatMap((t) =>
  bagianOf(t).map((p, i) => ({ id: `${t.id}-${i + 1}`, dance_id: t.id, order_index: i + 1, name: p.name, focus: p.focus, counts: p.counts })),
);

const synth = (n: number, path: string, description: string): Step => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, dance_id: 'pemanasan', sanggar_id: null, order_index: n,
  name: bagianOf(PEMANASAN)[n - 1].name, description, counts: 8, duration_ms: 8000, aspect: 0.75, prop: null,
  keypoints_path: path, video_path: null, recorded_by_label: 'Gerak sintetis (uji coba)', status: 'terbit', part_id: `pemanasan-${n}`, synthetic: true,
});

/** Gerak dari rekaman acuan bawaan (video + lagu + kerangka di public/tarian/…). */
const REKAMAN_STEPS: Step[] = REKAMAN.flatMap((r) => {
  const t = ALL.find((x) => x.id === r.danceId);
  if (!t) return [];
  const parts = bagianOf(t);
  return r.bab.map((b, i): Step => ({
    id: b.id, dance_id: r.danceId, sanggar_id: null, order_index: i + 1,
    name: parts[i]?.name ?? `Bab ${i + 1}`, description: parts[i]?.focus ?? '', counts: b.counts, duration_ms: b.durationMs,
    aspect: r.aspect, prop: r.prop, keypoints_path: asetBab(r, i + 1, 'json'), video_path: asetBab(r, i + 1, 'mp4'),
    audio_path: asetBab(r, i + 1, 'm4a'), recorded_by_label: r.label, status: 'terbit', part_id: `${r.danceId}-${i + 1}`,
  }));
});

export const LOCAL_STEPS: Step[] = [
  synth(1, 'synthetic:angkat-lengan', 'Angkat kedua lengan dari samping badan hingga ke atas kepala, lalu turunkan perlahan. Dua kali dalam 8 hitungan.'),
  synth(2, 'synthetic:mendhak', 'Rentangkan lengan setinggi bahu dengan siku sedikit ditekuk, lalu tekuk kedua lutut (mendhak) dan kembali tegak.'),
  synth(3, 'synthetic:ayun-samping', 'Ayunkan kedua lengan bergantian ke kiri dan kanan sambil menggeser berat badan.'),
  ...REKAMAN_STEPS,
];

export const LOCAL_DANCES: Dance[] = ALL.map((t) => {
  const region = DAERAH.find((d) => d.id === t.region);
  return {
    id: t.id, name: t.name, region: t.suku, province: region?.province ?? 'Semua daerah',
    summary: t.summary + (t.id === 'pemanasan' ? '' : draf), context: t.summary + (t.id === 'pemanasan' ? '' : draf),
    posture: t.posture, accompaniment: t.accompaniment, status: 'terbit', sanggar_id: null, verified_by_note: t.note ?? null,
    props: (t.props ?? []).map((p) => ({ kind: p.kind, label: p.label, note: p.note })),
    step_count: LOCAL_STEPS.filter((s) => s.dance_id === t.id).length,
    maestro_label: null, sanggar_label: null,
    region_id: t.region || null, difficulty: t.tingkat, part_count: bagianOf(t).length,
  };
});

/** Data contoh papan skor — HANYA untuk pengembangan, selalu diberi label "Data contoh". */
export const SAMPLE_LEADERBOARD: LeaderboardRow[] = [
  { rank: 1, display_name: 'Contoh_A', score: 91, wiraga: 92, wirama: 88, achieved_at: new Date(Date.now() - 864e5).toISOString() },
  { rank: 2, display_name: 'Contoh_B', score: 86, wiraga: 85, wirama: 89, achieved_at: new Date(Date.now() - 2 * 864e5).toISOString() },
  { rank: 3, display_name: 'Contoh_C', score: 82, wiraga: 80, wirama: 86, achieved_at: new Date(Date.now() - 3 * 864e5).toISOString() },
  { rank: 4, display_name: 'Contoh_D', score: 77, wiraga: 78, wirama: 74, achieved_at: new Date(Date.now() - 5 * 864e5).toISOString() },
  { rank: 5, display_name: 'Contoh_E', score: 71, wiraga: 70, wirama: 73, achieved_at: new Date(Date.now() - 9 * 864e5).toISOString() },
];
