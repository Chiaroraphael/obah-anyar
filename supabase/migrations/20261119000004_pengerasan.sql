-- =====================================================================
-- Pengerasan keamanan (hasil Supabase Security Advisor)
-- =====================================================================

-- search_path tetap untuk fungsi tanpa SECURITY DEFINER.
alter function public.set_updated_at() set search_path = public;
alter function public.gen_invite_code() set search_path = public, extensions;
alter function public.is_trusted_context() set search_path = public;
alter function public.path_uuid(text, int) set search_path = public, storage;

-- Fungsi trigger tidak boleh dipanggil lewat /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.check_display_name() from public, anon, authenticated;

-- Fungsi internal moderasi: hanya service_role (Edge Function moderate-name) dan trigger.
revoke execute on function public.name_is_clean(text) from public, anon, authenticated;

-- RPC yang butuh masuk akun: cabut dari tamu.
revoke execute on function public.complete_onboarding(public.user_role, text) from anon;
revoke execute on function public.get_my_rank(text) from anon;
revoke execute on function public.get_sanggar_members(uuid) from anon;
revoke execute on function public.admin_reset_display_name(uuid) from anon;

-- Catatan sengaja:
-- * get_leaderboard tetap bisa dipanggil tamu (papan skor publik, hanya nama tampilan + skor).
-- * is_admin / is_sanggar_* dipakai di policy RLS sehingga harus bisa dieksekusi anon & authenticated;
--   fungsi ini hanya mengembalikan boolean untuk auth.uid() pemanggil.
-- * rate_events sengaja tanpa policy: hanya service_role.
