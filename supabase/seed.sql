-- =====================================================================
-- Seed — HANYA dijalankan di lingkungan pengembangan (`supabase db reset`).
-- Tidak ikut `supabase db push` ke staging/produksi.
-- Deskripsi tarian bertanda draf; gerak pemanasan SINTETIS (bukan rekaman maestro).
-- =====================================================================

-- Tarian, daerah, properti, dan bagian ada di seed_katalog.sql (dijalankan lebih dulu).

-- 3 gerak pemanasan sintetis. keypoints_path 'synthetic:*' dibangkitkan di browser (src/lib/synthetic.ts).
insert into public.steps (id, dance_id, sanggar_id, order_index, name, description, counts, duration_ms, aspect, keypoints_path, recorded_by_label, status, part_id) values
  ('00000000-0000-4000-8000-000000000001', 'pemanasan', null, 1, 'Angkat lengan',
   'Angkat kedua lengan dari samping badan hingga ke atas kepala, lalu turunkan perlahan. Dua kali dalam 8 hitungan.', 8, 8000, 0.75, 'synthetic:angkat-lengan', 'Gerak sintetis (uji coba)', 'terbit', md5('pemanasan-' || 1)::uuid),
  ('00000000-0000-4000-8000-000000000002', 'pemanasan', null, 2, 'Mendhak',
   'Rentangkan lengan setinggi bahu dengan siku sedikit ditekuk, lalu tekuk kedua lutut (mendhak) dan kembali tegak.', 8, 8000, 0.75, 'synthetic:mendhak', 'Gerak sintetis (uji coba)', 'terbit', md5('pemanasan-' || 2)::uuid),
  ('00000000-0000-4000-8000-000000000003', 'pemanasan', null, 3, 'Ayun samping',
   'Ayunkan kedua lengan bergantian ke kiri dan kanan sambil menggeser berat badan.', 8, 8000, 0.75, 'synthetic:ayun-samping', 'Gerak sintetis (uji coba)', 'terbit', md5('pemanasan-' || 3)::uuid)
on conflict (id) do nothing;

-- Daftar kata terlarang awal (lengkapi oleh admin lewat SQL/dasbor).
insert into public.banned_words (word) values
  ('anjing'), ('bangsat'), ('bajingan'), ('kontol'), ('memek'), ('ngentot'), ('goblok'), ('tolol'), ('kafir'), ('pki')
on conflict do nothing;

-- ---------- Data contoh papan skor (pengembangan saja) ----------
-- Lima akun contoh tanpa kata sandi yang bisa dipakai masuk.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'contoh' || n || '@contoh.invalid', jsonb_build_object('display_name', 'Contoh_' || chr(64 + n), 'role', 'pelajar'), now(), now(), now()
from generate_series(1, 5) as n
on conflict do nothing;

insert into public.test_runs (profile_id, dance_id, score, wiraga, wirama, per_step, crowd_ratio, example_visible, eligible, flags, created_at)
select p.id, 'pemanasan', s.score, s.wiraga, s.wirama, '{}'::jsonb, 0, false, true, '{"contoh": true}'::jsonb, now() - (s.days || ' days')::interval
from public.profiles p
join (values ('Contoh_A', 91, 92, 88, 1), ('Contoh_B', 86, 85, 89, 2), ('Contoh_C', 82, 80, 86, 3), ('Contoh_D', 77, 78, 74, 5), ('Contoh_E', 71, 70, 73, 9))
  as s(name, score, wiraga, wirama, days) on s.name = p.display_name;
