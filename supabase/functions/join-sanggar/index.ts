// join-sanggar — bergabung dengan kode undangan. Maestro menjadi 'maestro', lainnya 'murid'.
import { adminClient, getProfile, HttpError, json, rateLimit, readJson, requireUser, serve, z } from '../_shared/http.ts';

const Body = z.object({ invite_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, 'Kode undangan terdiri atas 8 huruf/angka') });

serve(async (req) => {
  const { user } = await requireUser(req);
  const { invite_code } = Body.parse(await readJson(req));
  const admin = adminClient();
  await rateLimit(admin, user.id, 'join-sanggar', 10, 3600);
  const me = await getProfile(admin, user.id);

  const { data: s } = await admin.from('sanggar').select('id, name, verified_at').eq('invite_code', invite_code).maybeSingle();
  if (!s) throw new HttpError(404, 'kode_salah', 'Kode undangan tidak ditemukan.');

  const role = me.role === 'maestro' ? 'maestro' : 'murid';
  const { error } = await admin.from('sanggar_members').upsert({ sanggar_id: s.id, profile_id: user.id, role }, { onConflict: 'sanggar_id,profile_id', ignoreDuplicates: true });
  if (error) throw error;
  return json(req, { sanggar: { id: s.id, name: s.name, verified: Boolean(s.verified_at) }, role });
});
