/**
 * Kemajuan di perangkat (mode tamu & cadangan offline). Saat masuk akun,
 * percobaan juga dikirim ke tabel attempts, dan kemajuan lokal bisa dipindah ke akun.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocalAttempt { stepId: string; danceId: string; score: number; wiraga: number; wirama: number; coverage: number; speed: number; at: string; synced?: boolean }
export interface LocalTest { danceId: string; score: number; wiraga: number; wirama: number; perStep: Record<string, number>; at: string; eligible: boolean; submitted: boolean }

interface ProgressState {
  attempts: LocalAttempt[];
  tests: LocalTest[];
  wantToLearn: string[];
  migrationOffered: boolean;
  addAttempt: (a: LocalAttempt) => void;
  addTest: (t: LocalTest) => void;
  markTestSubmitted: (at: string) => void;
  markSynced: () => void;
  setWantToLearn: (ids: string[]) => void;
  setMigrationOffered: (v: boolean) => void;
  clear: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      attempts: [],
      tests: [],
      wantToLearn: [],
      migrationOffered: false,
      addAttempt: (a) => set((s) => ({ attempts: [...s.attempts, a].slice(-500) })),
      addTest: (t) => set((s) => ({ tests: [...s.tests, t].slice(-100) })),
      markTestSubmitted: (at) => set((s) => ({ tests: s.tests.map((t) => (t.at === at ? { ...t, submitted: true } : t)) })),
      markSynced: () => set((s) => ({ attempts: s.attempts.map((a) => ({ ...a, synced: true })) })),
      setWantToLearn: (ids) => set({ wantToLearn: ids }),
      setMigrationOffered: (v) => set({ migrationOffered: v }),
      clear: () => set({ attempts: [], tests: [], wantToLearn: [] }),
    }),
    { name: 'oa-kemajuan' },
  ),
);

export function bestByStep(attempts: LocalAttempt[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of attempts) out[a.stepId] = Math.max(out[a.stepId] ?? 0, a.score);
  return out;
}
