// create-sanggar — maestro mendaftarkan sanggar baru (belum terverifikasi) + keanggotaan pemilik.
import { adminClient, audit, getProfile, HttpError, json, rateLimit, readJson, requireUser, serve, z } from '../_shared/http.ts';

const Body = z.object({
  name: z.string().trim().min(3, 'Nama sanggar minimal 3 karakter').max(80),
  city: z.string().trim().min(2, 'Kota wajib diisi').max(60),
  province: z.string().trim().min(2, 'Provinsi wajib diisi').max(60),
  description: z.string().trim().max(600, 'Deskripsi maksimal 600 karakter').optional().default(''),
  contact_email: z.string().trim().email('Email kontak tidak valid'),
});

serve(async (req) => {
  const { user } = await requireUser(req);
  const body = Body.parse(await readJson(req));
  const admin = adminClient();
  const me = await getProfile(admin, user.id);
  if (me.role !== 'maestro' && me.role !== 'admin') throw new HttpError(403, 'bukan_maestro', 'Hanya akun maestro yang bisa mendaftarkan sanggar.');
  await rateLimit(admin, user.id, 'create-sanggar', 3, 86400);

  const { count } = await admin.from('sanggar').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
  if ((count ?? 0) >= 1 && me.role !== 'admin') throw new HttpError(409, 'sudah_punya', 'Kamu sudah memiliki sanggar.');

  const { data: s, error } = await admin.from('sanggar').insert({ ...body, owner_id: user.id }).select('id, name, invite_code').single();
  if (error) throw error;
  const { error: mErr } = await admin.from('sanggar_members').insert({ sanggar_id: s.id, profile_id: user.id, role: 'pemilik' });
  if (mErr) throw mErr;
  await audit(admin, user.id, 'buat_sanggar', 'sanggar', s.id);
  return json(req, { sanggar: s });
});
