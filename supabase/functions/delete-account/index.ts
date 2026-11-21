// delete-account — hapus data pengguna lalu akun auth. Audit tanpa data pribadi.
import { adminClient, audit, json, readJson, requireUser, serve, z } from '../_shared/http.ts';

const Body = z.object({ confirm: z.literal('HAPUS', { errorMap: () => ({ message: 'Ketik HAPUS untuk konfirmasi.' }) }) });

serve(async (req) => {
  const { user } = await requireUser(req);
  Body.parse(await readJson(req));
  const admin = adminClient();
  const uid = user.id;

  // Berkas milik pengguna: foto profil.
  const { data: avatars } = await admin.storage.from('avatars').list(uid, { limit: 1000 });
  if (avatars?.length) await admin.storage.from('avatars').remove(avatars.map((o) => `${uid}/${o.name}`));

  // Data milik pengguna (sebagian juga terhapus otomatis lewat on delete cascade).
  await admin.from('attempts').delete().eq('profile_id', uid);
  await admin.from('test_runs').delete().eq('profile_id', uid);
  await admin.from('rate_events').delete().eq('profile_id', uid);
  await admin.from('sanggar_members').delete().eq('profile_id', uid).neq('role', 'pemilik');
  await admin.from('reports').update({ reporter_id: null }).eq('reporter_id', uid);
  // Gerak & persetujuan yang direkam untuk sanggar tetap milik sanggar (kolom pembuat menjadi null otomatis).

  const { error } = await admin.auth.admin.deleteUser(uid); // cascade ke profiles
  if (error) throw error;
  await audit(admin, null, 'hapus_akun', 'akun', null, {});
  return json(req, { ok: true });
});
