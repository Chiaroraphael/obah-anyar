-- =====================================================================
-- Obah Anyar — Row Level Security (Bagian F)
-- Prinsip: tolak secara bawaan; hanya izinkan yang tertulis di sini.
-- service_role (Edge Functions) melewati RLS dan TIDAK pernah dipakai di frontend.
-- =====================================================================

-- Hak dasar tabel (RLS tetap menyaring baris).
grant usage on schema public to anon, authenticated;
grant select on public.dances, public.dance_props, public.steps, public.ai_models, public.sanggar to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.sanggar to authenticated;
grant select, delete on public.sanggar_members to authenticated;
grant insert, update on public.dances, public.dance_props to authenticated;
grant insert, update, delete on public.steps to authenticated;
grant select, insert on public.step_consents to authenticated;
grant select, insert on public.attempts to authenticated;
grant select on public.step_progress to authenticated;
grant select on public.test_runs to authenticated;          -- TIDAK ada insert: hanya lewat submit-test
grant select, insert, update, delete on public.ai_models to authenticated;
grant select, insert on public.training_clips to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, delete on public.banned_words to authenticated;

-- Kolom profil yang boleh diubah pengguna sendiri (role, is_minor juga dijaga trigger).
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, school_name) on public.profiles to authenticated;

-- ---------- profiles ----------
create policy "profil: baca milik sendiri" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profil: ubah milik sendiri" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- Publik tidak bisa membaca tabel ini; nama di papan skor lewat RPC get_leaderboard.

-- ---------- sanggar ----------
create policy "sanggar: publik baca yang terverifikasi" on public.sanggar for select to anon, authenticated
  using (verified_at is not null or public.is_sanggar_member(id) or owner_id = auth.uid() or public.is_admin());
create policy "sanggar: pemilik ubah miliknya" on public.sanggar for update to authenticated
  using (public.is_sanggar_owner(id) or public.is_admin()) with check (public.is_sanggar_owner(id) or public.is_admin());
-- Insert lewat Edge Function create-sanggar; verifikasi lewat verify-sanggar (admin).

-- ---------- sanggar_members ----------
create policy "anggota: lihat sesama anggota" on public.sanggar_members for select to authenticated
  using (profile_id = auth.uid() or public.is_sanggar_member(sanggar_id) or public.is_admin());
create policy "anggota: pemilik mengeluarkan anggota / keluar sendiri" on public.sanggar_members for delete to authenticated
  using ((public.is_sanggar_owner(sanggar_id) and role <> 'pemilik') or (profile_id = auth.uid() and role <> 'pemilik') or public.is_admin());
-- Gabung lewat Edge Function join-sanggar.

-- ---------- dances ----------
create policy "tarian: baca terbit / draf sanggar sendiri" on public.dances for select to anon, authenticated
  using (status = 'terbit' or (sanggar_id is not null and public.is_sanggar_member(sanggar_id)) or public.is_admin());
create policy "tarian: staf sanggar buat draf" on public.dances for insert to authenticated
  with check ((status = 'draf' and sanggar_id is not null and public.is_sanggar_staff(sanggar_id) and public.is_sanggar_verified(sanggar_id)) or public.is_admin());
create policy "tarian: staf sanggar ubah draf" on public.dances for update to authenticated
  using ((status in ('draf', 'ditolak') and sanggar_id is not null and public.is_sanggar_staff(sanggar_id)) or public.is_admin())
  with check ((status in ('draf', 'ditinjau') and sanggar_id is not null and public.is_sanggar_staff(sanggar_id)) or public.is_admin());

-- ---------- dance_props ----------
create policy "properti: ikut tarian" on public.dance_props for select to anon, authenticated
  using (exists (select 1 from public.dances d where d.id = dance_id
                 and (d.status = 'terbit' or (d.sanggar_id is not null and public.is_sanggar_member(d.sanggar_id)) or public.is_admin())));
create policy "properti: staf/admin tulis" on public.dance_props for insert to authenticated
  with check (public.is_admin() or exists (select 1 from public.dances d where d.id = dance_id and d.status = 'draf' and d.sanggar_id is not null and public.is_sanggar_staff(d.sanggar_id)));
create policy "properti: staf/admin ubah" on public.dance_props for update to authenticated
  using (public.is_admin() or exists (select 1 from public.dances d where d.id = dance_id and d.status = 'draf' and d.sanggar_id is not null and public.is_sanggar_staff(d.sanggar_id)));

-- ---------- steps ----------
create policy "gerak: baca terbit / milik sanggar" on public.steps for select to anon, authenticated
  using (status = 'terbit' or (sanggar_id is not null and public.is_sanggar_staff(sanggar_id)) or public.is_admin());
create policy "gerak: maestro sanggar terverifikasi buat draf" on public.steps for insert to authenticated
  with check (
    (status = 'draf' and sanggar_id is not null and public.is_sanggar_staff(sanggar_id) and public.is_sanggar_verified(sanggar_id)
     and recorded_by_profile = auth.uid())
    or public.is_admin()
  );
create policy "gerak: maestro ubah draf/tinjauan" on public.steps for update to authenticated
  using ((status in ('draf', 'ditinjau', 'ditolak') and sanggar_id is not null and public.is_sanggar_staff(sanggar_id)) or public.is_admin())
  with check ((status in ('draf', 'ditinjau') and sanggar_id is not null and public.is_sanggar_staff(sanggar_id)) or public.is_admin());
create policy "gerak: maestro hapus yang belum terbit" on public.steps for delete to authenticated
  using ((status <> 'terbit' and sanggar_id is not null and public.is_sanggar_staff(sanggar_id)) or public.is_admin());
-- Perubahan ke 'terbit' HANYA lewat Edge Function publish-step (dijaga trigger guard_step_publish).

-- ---------- step_consents ----------
create policy "persetujuan: pembuat/pemilik/admin baca" on public.step_consents for select to authenticated
  using (signed_by = auth.uid() or (sanggar_id is not null and public.is_sanggar_owner(sanggar_id)) or public.is_admin());
create policy "persetujuan: staf sanggar tulis" on public.step_consents for insert to authenticated
  with check (signed_by = auth.uid() and sanggar_id is not null and public.is_sanggar_staff(sanggar_id));

-- ---------- attempts ----------
create policy "percobaan: tulis milik sendiri" on public.attempts for insert to authenticated
  with check (profile_id = auth.uid());
create policy "percobaan: baca milik sendiri" on public.attempts for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
-- (Tahap berikut) pemilik/maestro membaca kemajuan murid lewat view khusus.

-- ---------- test_runs ----------
create policy "tes: baca milik sendiri" on public.test_runs for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
-- Tidak ada policy insert: klien tidak bisa menulis langsung. Insert hanya lewat submit-test.

-- ---------- ai_models ----------
create policy "model: publik baca yang aktif" on public.ai_models for select to anon, authenticated
  using (active or public.is_admin());
create policy "model: admin tulis" on public.ai_models for insert to authenticated with check (public.is_admin());
create policy "model: admin ubah" on public.ai_models for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "model: admin hapus" on public.ai_models for delete to authenticated using (public.is_admin());

-- ---------- training_clips ----------
create policy "klip: admin & pembuat baca" on public.training_clips for select to authenticated
  using (contributor_profile = auth.uid() or public.is_admin());
create policy "klip: admin & pembuat tulis" on public.training_clips for insert to authenticated
  with check (contributor_profile = auth.uid() or public.is_admin());

-- ---------- reports ----------
create policy "laporan: pengguna masuk mengirim" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "laporan: admin baca" on public.reports for select to authenticated using (public.is_admin());
create policy "laporan: admin ubah" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- audit_log & banned_words & rate_events ----------
create policy "audit: admin baca" on public.audit_log for select to authenticated using (public.is_admin());
create policy "kata terlarang: admin" on public.banned_words for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- rate_events: tanpa policy (hanya service_role).
