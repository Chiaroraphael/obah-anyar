-- =====================================================================
-- Obah Anyar — bucket Storage & policy (Bagian H)
-- Path: {sanggar_id}/{step_id}/... (avatars: {profile_id}/...)
-- Validasi tipe & ukuran: di bucket (di bawah), di frontend, dan di Edge Functions.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('step-videos',    'step-videos',    false, 52428800, array['video/mp4', 'video/webm']),
  ('step-keypoints', 'step-keypoints', false, 5242880,  array['application/json']),
  ('consents',       'consents',       false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('avatars',        'avatars',        true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('ai-models',      'ai-models',      true,  null,     null),
  ('training-clips', 'training-clips', false, null,     array['application/json'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Bagian pertama path sebagai uuid (null bila bukan uuid).
create or replace function public.path_uuid(p_name text, p_index int default 1) returns uuid
language plpgsql immutable as $$
begin
  return ((storage.foldername(p_name))[p_index])::uuid;
exception when others then
  return null;
end $$;

-- ---------- step-videos & step-keypoints ----------
-- Baca: siapa pun untuk gerak TERBIT (path dicek ke tabel steps); staf sanggar untuk drafnya.
create policy "gerak-berkas: baca terbit atau staf sanggar" on storage.objects for select to anon, authenticated
  using (
    bucket_id in ('step-videos', 'step-keypoints') and (
      exists (select 1 from public.steps s where s.status = 'terbit' and (s.video_path = name or s.keypoints_path = name))
      or public.is_sanggar_staff(public.path_uuid(name))
      or public.is_admin()
    )
  );
create policy "gerak-berkas: staf sanggar terverifikasi unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('step-videos', 'step-keypoints')
    and public.is_sanggar_staff(public.path_uuid(name))
    and public.is_sanggar_verified(public.path_uuid(name))
  );
create policy "gerak-berkas: staf hapus yang belum terbit" on storage.objects for delete to authenticated
  using (
    bucket_id in ('step-videos', 'step-keypoints')
    and (public.is_admin() or (public.is_sanggar_staff(public.path_uuid(name))
         and not exists (select 1 from public.steps s where s.status = 'terbit' and (s.video_path = name or s.keypoints_path = name))))
  );

-- ---------- consents (PRIVAT: pembuat, pemilik sanggar, admin) ----------
create policy "persetujuan-berkas: baca" on storage.objects for select to authenticated
  using (bucket_id = 'consents' and (owner = auth.uid() or public.is_sanggar_owner(public.path_uuid(name)) or public.is_admin()));
create policy "persetujuan-berkas: unggah staf" on storage.objects for insert to authenticated
  with check (bucket_id = 'consents' and public.is_sanggar_staff(public.path_uuid(name)));

-- ---------- avatars (baca publik, tulis pemilik) ----------
create policy "avatar: tulis pemilik" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.path_uuid(name) = auth.uid());
create policy "avatar: ubah pemilik" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.path_uuid(name) = auth.uid());
create policy "avatar: hapus pemilik" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.path_uuid(name) = auth.uid());

-- ---------- ai-models (baca publik, tulis admin) ----------
create policy "model-berkas: admin tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'ai-models' and public.is_admin());
create policy "model-berkas: admin hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'ai-models' and public.is_admin());

-- ---------- training-clips (PRIVAT: admin) ----------
create policy "klip-berkas: admin" on storage.objects for all to authenticated
  using (bucket_id = 'training-clips' and public.is_admin())
  with check (bucket_id = 'training-clips' and public.is_admin());
