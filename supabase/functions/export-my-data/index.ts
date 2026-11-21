// export-my-data — kembalikan JSON semua data milik pengguna (hak akses data, UU PDP).
import { adminClient, json, requireUser, serve } from '../_shared/http.ts';

serve(async (req) => {
  const { user } = await requireUser(req);
  const admin = adminClient();
  const uid = user.id;
  const [profile, attempts, tests, members, owned, consents, reports] = await Promise.all([
    admin.from('profiles').select('*').eq('id', uid).maybeSingle(),
    admin.from('attempts').select('step_id, score, wiraga, wirama, coverage, speed, created_at').eq('profile_id', uid).order('created_at'),
    admin.from('test_runs').select('dance_id, score, wiraga, wirama, per_step, eligible, created_at').eq('profile_id', uid).order('created_at'),
    admin.from('sanggar_members').select('sanggar_id, role, joined_at').eq('profile_id', uid),
    admin.from('sanggar').select('id, name, city, province, created_at, verified_at').eq('owner_id', uid),
    admin.from('step_consents').select('id, dancer_name, consent_text_version, agreed_at').eq('signed_by', uid),
    admin.from('reports').select('target_type, target_id, reason, status, created_at').eq('reporter_id', uid),
  ]);
  return json(req, {
    format: 'obah-anyar-data-pribadi',
    dibuat: new Date().toISOString(),
    akun: { id: uid, email: user.email, dibuat: user.created_at, email_terverifikasi: Boolean(user.email_confirmed_at) },
    profil: profile.data,
    percobaan: attempts.data ?? [],
    tes_akhir: tests.data ?? [],
    keanggotaan_sanggar: members.data ?? [],
    sanggar_milik: owned.data ?? [],
    persetujuan_yang_dibuat: consents.data ?? [],
    laporan: reports.data ?? [],
    catatan: 'Video kamera pelajar tidak pernah disimpan oleh Obah Anyar.',
  });
});
