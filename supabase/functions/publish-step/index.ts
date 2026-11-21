// publish-step — pemilik sanggar / admin menerbitkan gerak setelah pemeriksaan.
import { adminClient, audit, getProfile, HttpError, json, readJson, requireUser, serve, z } from '../_shared/http.ts';

const Body = z.object({ step_id: z.string().uuid('ID gerak tidak valid') });

async function objectExists(admin: ReturnType<typeof adminClient>, bucket: string, path: string): Promise<number | null> {
  const parts = path.split('/');
  const file = parts.pop()!;
  const { data } = await admin.storage.from(bucket).list(parts.join('/'), { search: file, limit: 1 });
  const obj = data?.find((o) => o.name === file);
  return obj ? Number(obj.metadata?.size ?? 0) : null;
}

serve(async (req) => {
  const { user } = await requireUser(req);
  const { step_id } = Body.parse(await readJson(req));
  const admin = adminClient();
  const me = await getProfile(admin, user.id);

  const { data: step } = await admin.from('steps').select('*').eq('id', step_id).maybeSingle();
  if (!step) throw new HttpError(404, 'gerak_tidak_ada', 'Gerak tidak ditemukan.');
  if (step.status === 'terbit') throw new HttpError(409, 'sudah_terbit', 'Gerak ini sudah terbit.');

  const isAdmin = me.role === 'admin';
  if (!isAdmin) {
    const { data: m } = await admin.from('sanggar_members').select('role').eq('sanggar_id', step.sanggar_id).eq('profile_id', user.id).maybeSingle();
    if (m?.role !== 'pemilik') throw new HttpError(403, 'akses_ditolak', 'Hanya pemilik sanggar atau admin yang bisa menerbitkan gerak.');
    const { data: s } = await admin.from('sanggar').select('verified_at').eq('id', step.sanggar_id).maybeSingle();
    if (!s?.verified_at) throw new HttpError(403, 'sanggar_belum_verifikasi', 'Sanggar belum diverifikasi admin.');
    if (step.status !== 'ditinjau') throw new HttpError(409, 'belum_ditinjau', 'Minta tinjauan dulu sebelum menerbitkan.');
  }

  if (!step.consent_id) throw new HttpError(422, 'tanpa_persetujuan', 'Gerak belum punya persetujuan penari.');
  if (!step.keypoints_path) throw new HttpError(422, 'tanpa_kerangka', 'Data kerangka gerak belum ada.');
  if (!step.video_path) throw new HttpError(422, 'tanpa_video', 'Video contoh gerak belum ada.');
  if (step.duration_ms < 1000 || step.duration_ms > 60000) throw new HttpError(422, 'durasi', 'Durasi gerak harus 1–60 detik.');

  const kpSize = await objectExists(admin, 'step-keypoints', step.keypoints_path);
  if (kpSize == null) throw new HttpError(422, 'kerangka_hilang', 'Berkas kerangka tidak ditemukan di penyimpanan.');
  if (kpSize > 5 * 1024 * 1024) throw new HttpError(422, 'kerangka_besar', 'Berkas kerangka melebihi 5 MB.');
  const vSize = await objectExists(admin, 'step-videos', step.video_path);
  if (vSize == null) throw new HttpError(422, 'video_hilang', 'Berkas video tidak ditemukan di penyimpanan.');

  // Cek kewajaran isi kerangka (jumlah cuplikan cocok dengan durasi).
  const { data: kpBlob } = await admin.storage.from('step-keypoints').download(step.keypoints_path);
  try {
    const kp = JSON.parse(await kpBlob!.text());
    const fps = (kp.frames?.length ?? 0) / (step.duration_ms / 1000);
    if (!Array.isArray(kp.frames) || fps < 5 || fps > 120) throw new Error();
  } catch {
    throw new HttpError(422, 'kerangka_tidak_valid', 'Data kerangka tidak valid atau terlalu sedikit cuplikan.');
  }

  const { error } = await admin.from('steps').update({ status: 'terbit' }).eq('id', step_id);
  if (error) throw error;
  await audit(admin, user.id, 'terbitkan_gerak', 'step', step_id, { dance_id: step.dance_id, sanggar_id: step.sanggar_id });
  return json(req, { ok: true });
});
