// moderate-name — validasi & simpan nama tampilan; tolak kata kasar/SARA dari daftar kata terlarang.
// Penegakan juga ada di database (trigger check_display_name), jadi jalur langsung tetap aman.
import { adminClient, displayNameSchema, HttpError, json, rateLimit, readJson, requireUser, serve, z } from '../_shared/http.ts';

const Body = z.object({ display_name: displayNameSchema });

serve(async (req) => {
  const { user } = await requireUser(req);
  const { display_name } = Body.parse(await readJson(req));
  const admin = adminClient();
  await rateLimit(admin, user.id, 'moderate-name', 10, 3600);

  const { data: clean } = await admin.rpc('name_is_clean', { p_name: display_name });
  if (clean === false) throw new HttpError(422, 'nama_ditolak', 'Nama mengandung kata yang tidak diizinkan. Pilih nama lain.');

  const { error } = await admin.from('profiles').update({ display_name }).eq('id', user.id);
  if (error) throw new HttpError(422, 'nama_ditolak', 'Nama tidak bisa dipakai. Pilih nama lain.');
  return json(req, { ok: true, display_name });
});
