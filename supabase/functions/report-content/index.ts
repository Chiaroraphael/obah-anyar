// report-content — simpan laporan konten, maks. 20 per hari per pengguna.
import { adminClient, json, rateLimit, readJson, requireUser, serve, z } from '../_shared/http.ts';

const Body = z.object({
  target_type: z.enum(['step', 'nama_papan_skor', 'sanggar'], { errorMap: () => ({ message: 'Jenis laporan tidak valid' }) }),
  target_id: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter').max(500, 'Alasan maksimal 500 karakter'),
});

serve(async (req) => {
  const { user } = await requireUser(req);
  const body = Body.parse(await readJson(req));
  const admin = adminClient();
  await rateLimit(admin, user.id, 'report-content', 20, 86400);
  const { error } = await admin.from('reports').insert({ ...body, reporter_id: user.id });
  if (error) throw error;
  return json(req, { ok: true });
});
