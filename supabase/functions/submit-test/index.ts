// submit-test — simpan hasil tes akhir dan tentukan eligible untuk papan skor.
import { adminClient, HttpError, json, rateLimit, readJson, requireUser, serve, z } from '../_shared/http.ts';

const score = z.number({ invalid_type_error: 'Skor harus angka' }).int('Skor harus bilangan bulat').min(0, 'Skor 0–100').max(100, 'Skor 0–100');
const Body = z.object({
  dance_id: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Tarian tidak valid'),
  per_step: z.record(z.string().uuid('ID gerak tidak valid'), score),
  wiraga: score,
  wirama: score,
  crowd_ratio: z.number().min(0).max(1),
  example_visible: z.boolean(),
  // (tahap berikut) data kerangka terkompresi untuk dinilai ulang di server, lalu dihapus.
  keypoints: z.string().max(2_000_000).optional(),
});

serve(async (req) => {
  const { user, userClient } = await requireUser(req);
  const body = Body.parse(await readJson(req));
  const admin = adminClient();

  await rateLimit(admin, user.id, 'submit-test', 10, 3600);

  const { data: dance } = await admin.from('dances').select('id, status').eq('id', body.dance_id).maybeSingle();
  if (!dance || dance.status !== 'terbit') throw new HttpError(404, 'tarian_tidak_ada', 'Tarian tidak ditemukan.');

  const { data: steps } = await admin.from('steps').select('id, part_id').eq('dance_id', body.dance_id).eq('status', 'terbit');
  const expected = new Set((steps ?? []).map((s) => s.id));
  // Tes akhir hanya sah bila SEMUA bagian kurikulum sudah punya gerak terbit.
  const { count: partCount } = await admin.from('dance_parts').select('id', { count: 'exact', head: true }).eq('dance_id', body.dance_id);
  const filledParts = new Set((steps ?? []).map((s) => s.part_id).filter(Boolean));
  if ((partCount ?? 0) > 0 && filledParts.size < (partCount ?? 0)) {
    throw new HttpError(409, 'bagian_belum_lengkap', 'Belum semua bagian tarian ini terekam maestro, jadi tes akhir belum bisa dinilai.');
  }
  const sent = Object.keys(body.per_step);
  if (!expected.size) throw new HttpError(400, 'tanpa_gerak', 'Tarian ini belum punya gerak terbit.');
  if (sent.length !== expected.size || sent.some((id) => !expected.has(id))) {
    throw new HttpError(400, 'gerak_tidak_cocok', 'Daftar gerak tidak cocok dengan tarian ini. Muat ulang halaman lalu ulangi tes.');
  }

  const values = Object.values(body.per_step);
  const total = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

  // Cek kewajaran skor: skor total harus konsisten dengan wiraga/wirama.
  const flags: Record<string, unknown> = {};
  const implied = body.wiraga * 0.75 + body.wirama * 0.25;
  if (Math.abs(implied - total) > 15) flags.tidak_wajar = { implied: Math.round(implied), total };
  if (values.every((v) => v === 100)) flags.semua_sempurna = true;
  if (body.example_visible) flags.contoh_ditampilkan = true;
  if (body.crowd_ratio >= 0.15) flags.lebih_dari_satu_orang = body.crowd_ratio;
  if (!user.email_confirmed_at) flags.email_belum_verifikasi = true;

  const eligible = !body.example_visible && body.crowd_ratio < 0.15 && !flags.tidak_wajar && !flags.semua_sempurna && Boolean(user.email_confirmed_at);

  // TODO(P2): bila body.keypoints ada, hitung ulang skor dengan modul compare.ts yang sama, set verified=true, lalu buang datanya (tidak disimpan).

  const { error } = await admin.from('test_runs').insert({
    profile_id: user.id,
    dance_id: body.dance_id,
    score: total,
    wiraga: body.wiraga,
    wirama: body.wirama,
    per_step: body.per_step,
    crowd_ratio: body.crowd_ratio,
    example_visible: body.example_visible,
    eligible,
    verified: false,
    flags,
  });
  if (error) throw error;

  let rank: number | null = null;
  if (eligible) {
    const { data } = await userClient.rpc('get_my_rank', { p_dance: body.dance_id });
    rank = (Array.isArray(data) ? data[0]?.rank : null) ?? null;
  }
  const reason = eligible ? undefined
    : flags.email_belum_verifikasi ? 'Verifikasi emailmu dulu agar skor masuk papan skor.'
    : body.example_visible ? 'Contoh ditampilkan selama tes, jadi skor tidak masuk papan skor.'
    : body.crowd_ratio >= 0.15 ? 'Terdeteksi lebih dari satu orang, jadi skor tidak masuk papan skor.'
    : 'Skor ditandai untuk ditinjau dan belum masuk papan skor.';
  return json(req, { eligible, rank, score: total, reason });
});
