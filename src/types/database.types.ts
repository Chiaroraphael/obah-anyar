/**
 * Tipe domain aplikasi.
 * TODO: setelah proyek Supabase dibuat, jalankan `npm run gen:types` untuk
 * menghasilkan tipe `Database` asli dari skema, lalu ketikkan klien:
 * `createClient<Database>(...)`. Tipe di bawah mencerminkan skema di
 * supabase/migrations dan dipakai oleh lapisan queries.ts.
 */
export type UserRole = 'pelajar' | 'maestro' | 'guru' | 'admin';
export type MemberRole = 'pemilik' | 'maestro' | 'murid';
export type ContentStatus = 'draf' | 'ditinjau' | 'terbit' | 'ditolak';
export type Posture = 'berdiri' | 'duduk';
export type PropKind = 'piring' | 'topeng_reog' | 'kipas' | 'selendang' | 'payung' | 'topeng' | 'bokor' | 'kuda_kepang';
export type Difficulty = 1 | 2 | 3 | 4;

export interface Region { id: string; name: string; province: string; kain: string; sort: number; dance_count?: number }

/** Bagian kurikulum tarian (urutan materi yang wajib lulus sebelum tes akhir). */
export interface DancePart { id: string; dance_id: string; order_index: number; name: string; focus: string; counts: number }

export interface DanceProp { kind: PropKind; label: string; note: string | null }

export interface Dance {
  id: string;
  name: string;
  region: string;
  province: string;
  summary: string;
  context: string;
  posture: Posture;
  accompaniment: string;
  status: ContentStatus;
  sanggar_id: string | null;
  verified_by_note: string | null;
  props: DanceProp[];
  step_count: number;
  maestro_label: string | null;
  sanggar_label: string | null;
  region_id: string | null;
  difficulty: Difficulty;
  part_count: number;
}

export interface Step {
  id: string;
  dance_id: string;
  sanggar_id: string | null;
  order_index: number;
  name: string;
  description: string;
  counts: number;
  duration_ms: number;
  aspect: number;
  prop: PropKind | null;
  keypoints_path: string | null;
  video_path: string | null;
  /** lagu iringan bab ini (opsional); "static:/…" = aset bawaan di public/ */
  audio_path?: string | null;
  recorded_by_label: string;
  status: ContentStatus;
  part_id: string | null;
  /** true bila gerak sintetis uji coba (bukan rekaman maestro) */
  synthetic?: boolean;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  school_name: string | null;
  is_minor: boolean;
  guardian_consent_at: string | null;
  onboarded?: boolean;
}

export interface Sanggar {
  id: string;
  name: string;
  city: string;
  province: string;
  description: string;
  contact_email: string;
  owner_id: string;
  verified_at: string | null;
  invite_code: string;
}

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  score: number;
  wiraga: number;
  wirama: number;
  achieved_at: string;
  is_me?: boolean;
}

export interface AttemptRow {
  id: string;
  step_id: string;
  score: number;
  wiraga: number;
  wirama: number;
  coverage: number;
  speed: number;
  created_at: string;
}

export interface TestRun {
  id: string;
  dance_id: string;
  score: number;
  wiraga: number;
  wirama: number;
  per_step: Record<string, number>;
  eligible: boolean;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
