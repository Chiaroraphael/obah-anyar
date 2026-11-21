/** Operasi Mode Maestro: simpan gerak ke Storage + tabel steps/step_consents. */
import { callFunction, supabase } from '../../lib/supabase';
import type { StepKeypoints } from '../../pose/types';
import type { ContentStatus, PropKind, Step } from '../../types/database.types';

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 60;
export const CONSENT_MAX_BYTES = 10 * 1024 * 1024;
export const CONSENT_TEXT_VERSION = 'v1-2026-11';

export interface NewStepInput {
  danceId: string;
  sanggarId: string;
  name: string;
  description: string;
  counts: number;
  prop: PropKind | null;
  recordedByLabel: string;
  keypoints: StepKeypoints;
  video: Blob | null;
  consent: { dancerName: string; document: File | null };
  orderIndex: number;
  partId: string | null;
}

export function validateVideoFile(f: File): string | null {
  if (!['video/mp4', 'video/webm'].includes(f.type)) return 'Format video harus MP4 atau WebM.';
  if (f.size > VIDEO_MAX_BYTES) return 'Ukuran video maksimal 50 MB.';
  return null;
}
export function validateConsentFile(f: File): string | null {
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) return 'Scan surat harus PDF, JPG, atau PNG.';
  if (f.size > CONSENT_MAX_BYTES) return 'Ukuran scan maksimal 10 MB.';
  return null;
}

export async function saveStep(input: NewStepInput): Promise<Step> {
  if (!supabase) throw new Error('Server belum dikonfigurasi.');
  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id;
  if (!uid) throw new Error('Sesi berakhir. Masuk lagi.');
  const stepId = crypto.randomUUID();
  const base = `${input.sanggarId}/${stepId}`;

  // 1) persetujuan penari (wajib)
  let documentPath: string | null = null;
  if (input.consent.document) {
    const ext = input.consent.document.name.split('.').pop()?.toLowerCase() ?? 'pdf';
    documentPath = `${base}/persetujuan.${ext}`;
    const up = await supabase.storage.from('consents').upload(documentPath, input.consent.document, { contentType: input.consent.document.type, upsert: false });
    if (up.error) throw new Error('Scan surat persetujuan gagal diunggah.');
  }
  const { data: consent, error: cErr } = await supabase
    .from('step_consents')
    .insert({ dancer_name: input.consent.dancerName, consent_text_version: CONSENT_TEXT_VERSION, agreed_at: new Date().toISOString(), signed_by: uid, document_path: documentPath, sanggar_id: input.sanggarId })
    .select('id')
    .single();
  if (cErr || !consent) throw new Error('Persetujuan penari gagal disimpan.');

  // 2) kerangka gerak acuan
  const kpPath = `${base}/kerangka.json`;
  const kpBlob = new Blob([JSON.stringify(input.keypoints)], { type: 'application/json' });
  if (kpBlob.size > 5 * 1024 * 1024) throw new Error('Data kerangka melebihi 5 MB. Perpendek gerak.');
  const kpUp = await supabase.storage.from('step-keypoints').upload(kpPath, kpBlob, { contentType: 'application/json' });
  if (kpUp.error) throw new Error('Data kerangka gagal diunggah.');

  // 3) video (opsional)
  let videoPath: string | null = null;
  if (input.video) {
    const type = input.video.type.includes('mp4') ? 'mp4' : 'webm';
    videoPath = `${base}/video.${type}`;
    const vUp = await supabase.storage.from('step-videos').upload(videoPath, input.video, { contentType: `video/${type}` });
    if (vUp.error) throw new Error('Video gagal diunggah.');
  }

  // 4) baris gerak (status draf)
  const { data, error } = await supabase
    .from('steps')
    .insert({
      id: stepId,
      dance_id: input.danceId,
      sanggar_id: input.sanggarId,
      order_index: input.orderIndex,
      part_id: input.partId,
      name: input.name,
      description: input.description,
      counts: input.counts,
      duration_ms: Math.round(input.keypoints.durationMs),
      aspect: input.keypoints.aspect,
      prop: input.prop,
      keypoints_path: kpPath,
      video_path: videoPath,
      recorded_by_label: input.recordedByLabel,
      recorded_by_profile: uid,
      consent_id: consent.id,
      status: 'draf',
    })
    .select('*')
    .single();
  if (error) throw new Error('Gerak gagal disimpan: ' + error.message);
  return data as Step;
}

export async function setStepStatus(stepId: string, status: Extract<ContentStatus, 'draf' | 'ditinjau'>) {
  if (!supabase) return;
  const { error } = await supabase.from('steps').update({ status }).eq('id', stepId);
  if (error) throw new Error('Status gagal diubah.');
}

export async function publishStep(stepId: string) {
  return callFunction<{ ok: true }>('publish-step', { step_id: stepId });
}

export async function swapOrder(a: Step, b: Step) {
  if (!supabase) return;
  await supabase.from('steps').update({ order_index: b.order_index }).eq('id', a.id);
  await supabase.from('steps').update({ order_index: a.order_index }).eq('id', b.id);
}

/** Paket tarian: metadata gerak + kerangka (tanpa video) untuk cadangan/pindah. */
export interface DancePackage { format: 'obah-anyar-paket'; version: 1; dance_id: string; exported_at: string; steps: Array<Omit<Step, 'id' | 'sanggar_id' | 'keypoints_path' | 'video_path' | 'status'> & { keypoints: StepKeypoints | null }> }
