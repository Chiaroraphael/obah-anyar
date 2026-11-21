/**
 * Lapisan data. Baca data biasa langsung lewat supabase-js (dijaga RLS);
 * aksi khusus lewat Edge Functions. Bila Supabase belum dikonfigurasi,
 * memakai data lokal (src/lib/localData.ts) supaya antarmuka tetap bisa dicoba.
 */
import { useQuery } from '@tanstack/react-query';
import { syntheticStep, type SyntheticKind } from './synthetic';
import { LOCAL_DANCES, LOCAL_PARTS, LOCAL_REGIONS, LOCAL_STEPS, SAMPLE_LEADERBOARD } from './localData';
import { callFunction, isSupabaseConfigured, supabase } from './supabase';
import { isStaticPath, staticUrl } from './media';
import { enqueue } from './offlineQueue';
import { useAuth } from '../features/auth/authStore';
import type { StepKeypoints } from '../pose/types';
import type { AttemptRow, Dance, DancePart, LeaderboardRow, Region, Step, TestRun } from '../types/database.types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapDance(row: any): Dance {
  return {
    ...row,
    props: row.dance_props ?? [],
    step_count: row.steps?.[0]?.count ?? 0,
    part_count: row.dance_parts_count?.[0]?.count ?? row.steps?.[0]?.count ?? 0,
    difficulty: row.difficulty ?? 1,
    region_id: row.region_id ?? null,
    maestro_label: null,
    sanggar_label: row.sanggar?.name ?? null,
  };
}

export function useDances() {
  return useQuery({
    queryKey: ['dances'],
    queryFn: async (): Promise<Dance[]> => {
      if (!supabase) { await delay(250); return sortDances(LOCAL_DANCES); }
      const { data, error } = await supabase
        .from('dances')
        .select('*, dance_props(*), steps(count), dance_parts_count:dance_parts(count), sanggar:sanggar_id(name)')
        .eq('status', 'terbit')
        .order('name');
      if (error) throw error;
      return sortDances((data ?? []).map(mapDance));
    },
  });
}

/** Urut: tingkat termudah dulu, lalu nama. */
export function sortDances(list: Dance[]): Dance[] {
  return [...list].sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, 'id'));
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Region[]> => {
      if (!supabase) { await delay(120); return LOCAL_REGIONS; }
      const { data, error } = await supabase.from('regions').select('*, dances(count)').order('sort');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, province: r.province, kain: r.kain, sort: r.sort, dance_count: r.dances?.[0]?.count ?? 0 }));
    },
  });
}

/** Kerangka bagian (kurikulum) tarian, urut. */
export function useParts(danceId: string | undefined) {
  return useQuery({
    queryKey: ['parts', danceId],
    enabled: Boolean(danceId),
    queryFn: async (): Promise<DancePart[]> => {
      if (!supabase) { await delay(120); return LOCAL_PARTS.filter((p) => p.dance_id === danceId); }
      const { data, error } = await supabase.from('dance_parts').select('*').eq('dance_id', danceId!).order('order_index');
      if (error) throw error;
      return data as DancePart[];
    },
  });
}

export function useDance(id: string | undefined) {
  return useQuery({
    queryKey: ['dance', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Dance | null> => {
      if (!supabase) { await delay(150); return LOCAL_DANCES.find((d) => d.id === id) ?? null; }
      const { data, error } = await supabase
        .from('dances')
        .select('*, dance_props(*), steps(count), dance_parts_count:dance_parts(count), sanggar:sanggar_id(name)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDance(data) : null;
    },
  });
}

export function useSteps(danceId: string | undefined) {
  return useQuery({
    queryKey: ['steps', danceId],
    enabled: Boolean(danceId),
    queryFn: async (): Promise<(Step & { sanggar_name?: string | null })[]> => {
      if (!supabase) { await delay(150); return LOCAL_STEPS.filter((s) => s.dance_id === danceId); }
      const { data, error } = await supabase
        .from('steps')
        .select('*, sanggar:sanggar_id(name)')
        .eq('dance_id', danceId!)
        .eq('status', 'terbit')
        .order('order_index');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, sanggar_name: r.sanggar?.name ?? null }));
    },
  });
}

const kpCache = new Map<string, Promise<StepKeypoints>>();
/** Ambil data kerangka gerak acuan (publik untuk gerak terbit, signed URL untuk draf). */
export function loadKeypoints(step: Step): Promise<StepKeypoints> {
  const key = step.keypoints_path ?? step.id;
  if (kpCache.has(key)) return kpCache.get(key)!;
  const p = (async () => {
    if (!step.keypoints_path) throw new Error('Gerak ini belum punya data kerangka.');
    if (step.keypoints_path.startsWith('synthetic:')) return syntheticStep(step.keypoints_path.slice(10) as SyntheticKind, step.duration_ms, step.counts);
    if (isStaticPath(step.keypoints_path)) {
      // Rekaman acuan bawaan (public/tarian/…)
      const res = await fetch(staticUrl(step.keypoints_path)!);
      if (!res.ok) throw new Error('Data gerak tidak bisa dimuat.');
      return (await res.json()) as StepKeypoints;
    }
    if (!supabase) throw new Error('Server belum dikonfigurasi.');
    // Bucket privat; policy Storage mengizinkan baca untuk gerak terbit (siapa pun) dan draf (anggota sanggar).
    const { data, error } = await supabase.storage.from('step-keypoints').download(step.keypoints_path);
    if (error || !data) throw new Error(step.status === 'terbit' ? 'Data gerak tidak bisa dimuat.' : 'Tidak bisa membuka data gerak draf.');
    return JSON.parse(await data.text()) as StepKeypoints;
  })();
  kpCache.set(key, p);
  p.catch(() => kpCache.delete(key));
  return p;
}

/** URL media gerak: aset bawaan langsung, selain itu signed URL bucket step-videos (privat, dicek policy). */
function useStepMediaUrl(kind: 'video' | 'audio', path: string | null | undefined): string | null {
  const local = staticUrl(path);
  const q = useQuery({
    queryKey: ['step-media', kind, path],
    enabled: Boolean(supabase && path && !local),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase!.storage.from('step-videos').createSignedUrl(path!, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
  return local ?? q.data ?? null;
}

/** Video contoh gerak. null bila tidak ada video. */
export function useStepVideoUrl(step: Step | undefined): string | null {
  return useStepMediaUrl('video', step?.video_path);
}

/** Lagu iringan gerak. null bila gerak ini tidak punya lagu. */
export function useStepAudioUrl(step: Step | undefined): string | null {
  return useStepMediaUrl('audio', step?.audio_path);
}

export type LeaderboardPeriod = 'minggu' | 'semua' | 'sanggarku';
export interface LeaderboardResult { rows: LeaderboardRow[]; sample: boolean }

export function useLeaderboard(danceId: string | undefined, period: LeaderboardPeriod, limit = 20) {
  const sanggarId = useAuth((s) => s.sanggar?.id ?? null);
  const name = useAuth((s) => s.profile?.display_name ?? null);
  return useQuery({
    queryKey: ['leaderboard', danceId, period, sanggarId, limit],
    enabled: Boolean(danceId),
    queryFn: async (): Promise<LeaderboardResult> => {
      if (!supabase) {
        await delay(200);
        if (period === 'sanggarku') return { rows: [], sample: true };
        const rows = danceId === 'pemanasan' ? SAMPLE_LEADERBOARD.filter((r) => period === 'semua' || Date.now() - Date.parse(r.achieved_at) < 7 * 864e5) : [];
        return { rows: rows.slice(0, limit), sample: true };
      }
      if (period === 'sanggarku' && !sanggarId) return { rows: [], sample: false };
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_dance: danceId,
        p_period: period === 'minggu' ? 'minggu' : 'semua',
        p_sanggar: period === 'sanggarku' ? sanggarId : null,
        p_limit: limit,
      });
      if (error) throw error;
      return { rows: ((data ?? []) as LeaderboardRow[]).map((r) => ({ ...r, is_me: Boolean(name && r.display_name === name) })), sample: false };
    },
  });
}

export function useMyRank(danceId: string | undefined) {
  const authed = useAuth((s) => s.status === 'authed' && !s.demo);
  return useQuery({
    queryKey: ['my-rank', danceId],
    enabled: Boolean(danceId && authed && supabase),
    queryFn: async (): Promise<{ rank: number | null; score: number | null }> => {
      const { data, error } = await supabase!.rpc('get_my_rank', { p_dance: danceId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { rank: row?.rank ?? null, score: row?.score ?? null };
    },
  });
}

/** Simpan percobaan ke cloud bila masuk akun (selalu juga disimpan lokal oleh pemanggil). */
export async function recordAttempt(a: { step_id: string; score: number; wiraga: number; wirama: number; coverage: number; speed: number }) {
  const s = useAuth.getState();
  if (!supabase || s.status !== 'authed' || s.demo || !s.userId) return;
  const { error } = await supabase.from('attempts').insert({ ...a, profile_id: s.userId });
  if (error) console.warn('Percobaan belum tersimpan di cloud:', error.message);
}

export interface SubmitTestBody {
  dance_id: string;
  per_step: Record<string, number>;
  wiraga: number;
  wirama: number;
  crowd_ratio: number;
  example_visible: boolean;
}
export interface SubmitTestResult { eligible: boolean; rank: number | null; queued?: boolean; reason?: string }

export async function submitTest(body: SubmitTestBody): Promise<SubmitTestResult> {
  if (!isSupabaseConfigured) {
    await delay(500);
    return { eligible: !body.example_visible && body.crowd_ratio < 0.15, rank: null, reason: 'Mode lokal: skor tidak dikirim ke server.' };
  }
  if (!navigator.onLine) {
    enqueue({ fn: 'submit-test', body });
    return { eligible: false, rank: null, queued: true };
  }
  return callFunction<SubmitTestResult>('submit-test', body);
}

export function useMyAttempts() {
  const uid = useAuth((s) => (s.demo ? null : s.userId));
  return useQuery({
    queryKey: ['my-attempts', uid],
    enabled: Boolean(uid && supabase),
    queryFn: async (): Promise<AttemptRow[]> => {
      const { data, error } = await supabase!.from('attempts').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as AttemptRow[];
    },
  });
}

export function useMyTests() {
  const uid = useAuth((s) => (s.demo ? null : s.userId));
  return useQuery({
    queryKey: ['my-tests', uid],
    enabled: Boolean(uid && supabase),
    queryFn: async (): Promise<TestRun[]> => {
      const { data, error } = await supabase!.from('test_runs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data as TestRun[];
    },
  });
}

export function useStepProgress() {
  const uid = useAuth((s) => (s.demo ? null : s.userId));
  return useQuery({
    queryKey: ['step-progress', uid],
    enabled: Boolean(uid && supabase),
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase!.from('step_progress').select('step_id, best_score');
      if (error) throw error;
      const out: Record<string, number> = {};
      (data ?? []).forEach((r: any) => (out[r.step_id] = r.best_score));
      return out;
    },
  });
}
