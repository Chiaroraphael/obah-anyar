-- Tes RLS (pgTAP). Jalankan: supabase test db
-- Membuktikan pengguna A tidak bisa membaca/mengubah data pengguna B, dan aturan peran berlaku.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ---------- Data uji ----------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@uji.invalid', '{"display_name":"Pelajar A","role":"pelajar"}', now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@uji.invalid', '{"display_name":"Pelajar B","role":"admin"}', now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'm@uji.invalid', '{"display_name":"Maestro M","role":"maestro"}', now());

select is((select role::text from public.profiles where id = '22222222-2222-4222-8222-222222222222'), 'pelajar', 'peran admin tidak bisa didapat dari pendaftaran');

insert into public.sanggar (id, name, city, province, contact_email, owner_id) values
  ('44444444-4444-4444-8444-444444444444', 'Sanggar Uji', 'Kota', 'Provinsi', 's@uji.invalid', '33333333-3333-4333-8333-333333333333');
insert into public.sanggar_members (sanggar_id, profile_id, role) values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'pemilik');
insert into public.attempts (profile_id, step_id, score, wiraga, wirama) values
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000001', 80, 80, 80);
insert into public.test_runs (profile_id, dance_id, score, wiraga, wirama, eligible) values
  ('22222222-2222-4222-8222-222222222222', 'jaipong', 80, 80, 80, true);

-- ---------- Sebagai tamu (anon) ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from public.profiles)::int, 0, 'tamu tidak bisa membaca profiles');
select ok((select count(*) from public.dances where status = 'terbit') >= 7, 'tamu bisa membaca tarian terbit');
select is((select count(*) from public.sanggar)::int, 0, 'tamu tidak melihat sanggar yang belum terverifikasi');
select ok((select count(*) from public.get_leaderboard('jaipong')) >= 1, 'tamu bisa membaca papan skor lewat RPC');

-- ---------- Sebagai pelajar A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*) from public.profiles)::int, 1, 'A hanya melihat profilnya sendiri');
select is((select count(*) from public.attempts where profile_id = '22222222-2222-4222-8222-222222222222')::int, 0, 'A tidak bisa membaca percobaan B');
select is((select count(*) from public.test_runs where profile_id = '22222222-2222-4222-8222-222222222222')::int, 0, 'A tidak bisa membaca tes B');
select throws_ok(
  $$ insert into public.attempts (profile_id, step_id, score, wiraga, wirama) values ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000001', 99, 99, 99) $$,
  '42501', null, 'A tidak bisa menulis percobaan atas nama B');
select lives_ok(
  $$ insert into public.attempts (profile_id, step_id, score, wiraga, wirama) values ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', 75, 75, 75) $$,
  'A bisa menulis percobaannya sendiri');
select throws_ok(
  $$ insert into public.test_runs (profile_id, dance_id, score, wiraga, wirama, eligible) values ('11111111-1111-4111-8111-111111111111', 'jaipong', 100, 100, 100, true) $$,
  '42501', null, 'klien tidak bisa insert test_runs langsung');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null, 'A tidak bisa mengubah perannya sendiri');
update public.profiles set display_name = 'Diubah' where id = '22222222-2222-4222-8222-222222222222';
reset role;
select is((select display_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'), 'Pelajar B', 'A tidak bisa mengubah profil B');

-- ---------- Sebagai maestro M (sanggar belum terverifikasi) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.steps (dance_id, sanggar_id, name, counts, duration_ms, recorded_by_label, recorded_by_profile, status)
     values ('jaipong', '44444444-4444-4444-8444-444444444444', 'Uji', 8, 8000, 'M', '33333333-3333-4333-8333-333333333333', 'draf') $$,
  '42501', null, 'maestro sanggar belum terverifikasi tidak bisa membuat gerak');
update public.sanggar set verified_at = now() where id = '44444444-4444-4444-8444-444444444444';
reset role;
select ok((select verified_at is null from public.sanggar where id = '44444444-4444-4444-8444-444444444444'), 'maestro tidak bisa memverifikasi sanggarnya sendiri');

-- ---------- Penerbitan langsung ditolak ----------
update public.sanggar set verified_at = now() where id = '44444444-4444-4444-8444-444444444444';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.steps (dance_id, sanggar_id, name, counts, duration_ms, recorded_by_label, recorded_by_profile, status)
     values ('jaipong', '44444444-4444-4444-8444-444444444444', 'Uji', 8, 8000, 'M', '33333333-3333-4333-8333-333333333333', 'terbit') $$,
  null, null, 'gerak tidak bisa langsung berstatus terbit tanpa publish-step');

select * from finish();
rollback;
