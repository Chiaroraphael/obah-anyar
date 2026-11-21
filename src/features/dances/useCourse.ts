/**
 * Kurikulum satu tarian: bagian-bagian (dance_parts) + gerak acuan yang mengisinya (steps)
 * + kemajuan pengguna. Bagian harus diluluskan berurutan; tes akhir terbuka bila semua lulus.
 */
import { useMemo } from 'react';
import { PASS_SCORE } from '../../pose/compare';
import { bestByStep, useProgress } from '../../lib/progress';
import { useParts, useStepProgress, useSteps } from '../../lib/queries';
import type { DancePart, Step } from '../../types/database.types';

export type PartState = 'lulus' | 'aktif' | 'kunci' | 'menunggu';

export interface PartView {
  part: DancePart;
  index: number; // 1-based
  step: (Step & { sanggar_name?: string | null }) | null;
  state: PartState;
  best?: number;
}

export function useCourse(danceId: string | undefined) {
  const parts = useParts(danceId);
  const steps = useSteps(danceId);
  const attempts = useProgress((s) => s.attempts);
  const cloud = useStepProgress();

  const course = useMemo(() => {
    const best: Record<string, number> = { ...bestByStep(attempts) };
    Object.entries(cloud.data ?? {}).forEach(([k, v]) => (best[k] = Math.max(best[k] ?? 0, v)));
    const stepList = steps.data ?? [];
    const partList = parts.data ?? [];
    const views: PartView[] = [];
    let open = true;
    for (const part of partList) {
      const step = stepList.find((s) => s.part_id === part.id) ?? stepList.find((s) => !s.part_id && s.order_index === part.order_index) ?? null;
      const b = step ? best[step.id] : undefined;
      const passed = b != null && b >= PASS_SCORE;
      let state: PartState;
      if (passed) state = 'lulus';
      else if (!open) state = 'kunci';
      else { state = step ? 'aktif' : 'menunggu'; open = false; }
      views.push({ part, index: part.order_index, step, state, best: b });
    }
    const passedCount = views.filter((v) => v.state === 'lulus').length;
    const recordedCount = views.filter((v) => v.step).length;
    const active = views.find((v) => v.state === 'aktif') ?? null;
    const waiting = views.find((v) => v.state === 'menunggu') ?? null;
    return {
      views,
      total: views.length,
      passedCount,
      recordedCount,
      active,
      waiting,
      allPassed: views.length > 0 && passedCount === views.length,
      allRecorded: views.length > 0 && recordedCount === views.length,
      /** gerak acuan urut sesuai bagian (untuk tes akhir) */
      orderedSteps: views.map((v) => v.step).filter((s): s is NonNullable<PartView['step']> => Boolean(s)),
    };
  }, [attempts, cloud.data, parts.data, steps.data]);

  return { ...course, isLoading: parts.isLoading || steps.isLoading, isError: parts.isError || steps.isError };
}
