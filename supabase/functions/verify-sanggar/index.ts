// verify-sanggar — admin memverifikasi / menolak sanggar + email pemberitahuan.
import { adminClient, audit, getProfile, HttpError, json, readJson, requireUser, sendEmail, serve, z } from '../_shared/http.ts';

const Body = z.object({
  sanggar_id: z.string().uuid('ID sanggar tidak valid'),
  decision: z.enum(['verifikasi', 'tolak'], { errorMap: () => ({ message: 'Keputusan harus verifikasi atau tolak' }) }),
  note: z.string().trim().max(500).optional(),
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

serve(async (req) => {
  const { user } = await requireUser(req);
  const body = Body.parse(await readJson(req));
  const admin = adminClient();
  const me = await getProfile(admin, user.id);
  if (me.role !== 'admin') throw new HttpError(403, 'akses_ditolak', 'Khusus admin.');

  const { data: s } = await admin.from('sanggar').select('id, name, contact_email').eq('id', body.sanggar_id).maybeSingle();
  if (!s) throw new HttpError(404, 'sanggar_tidak_ada', 'Sanggar tidak ditemukan.');

  const patch = body.decision === 'verifikasi'
    ? { verified_at: new Date().toISOString(), rejected_at: null, review_note: body.note ?? null }
    : { verified_at: null, rejected_at: new Date().toISOString(), review_note: body.note ?? null };
  const { error } = await admin.from('sanggar').update(patch).eq('id', s.id);
  if (error) throw error;
  await audit(admin, user.id, body.decision === 'verifikasi' ? 'verifikasi_sanggar' : 'tolak_sanggar', 'sanggar', s.id);

  const ok = body.decision === 'verifikasi';
  await sendEmail(
    s.contact_email,
    ok ? `Sanggar ${s.name} sudah diverifikasi` : `Pengajuan sanggar ${s.name} belum disetujui`,
    `<div style="font-family:sans-serif;color:#1C1F4A"><h2>${ok ? 'Selamat, sanggarmu terverifikasi' : 'Pengajuan belum disetujui'}</h2>
     <p>${ok ? 'Mode Maestro kini terbuka. Mulai rekam gerak acuan untuk murid-muridmu.' : 'Admin Obah Anyar belum dapat memverifikasi sanggarmu.'}</p>
     ${body.note ? `<p>Catatan admin: ${esc(body.note)}</p>` : ''}<p>— Obah Anyar</p></div>`,
  );
  return json(req, { ok: true });
});
