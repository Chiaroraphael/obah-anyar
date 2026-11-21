-- =====================================================================
-- Obah Anyar — skema inti (Bagian D)
-- Semua tabel: id uuid, created_at, RLS AKTIF (policy di migrasi 0002).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Enum ----------
create type public.user_role as enum ('pelajar', 'maestro', 'guru', 'admin');
create type public.member_role as enum ('pemilik', 'maestro', 'murid');
create type public.content_status as enum ('draf', 'ditinjau', 'terbit', 'ditolak');
create type public.posture as enum ('berdiri', 'duduk');
create type public.prop_kind as enum ('piring', 'topeng_reog');

-- ---------- Utilitas ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Kode undangan acak 8 karakter tanpa huruf mirip (0/O, 1/I).
create or replace function public.gen_invite_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  return code;
end $$;

-- Penanda "dipanggil dari fungsi tepercaya" untuk melewati trigger pelindung kolom.
create or replace function public.is_trusted_context() returns boolean
language sql stable as $$
  select coalesce(current_setting('oa.bypass', true), '') = 'on'
      or coalesce(auth.role(), '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin');
$$;

-- ---------- Kata terlarang (moderasi nama) ----------
create table public.banned_words (
  word text primary key check (word = lower(word) and length(word) between 2 and 40),
  created_at timestamptz not null default now()
);

create or replace function public.name_is_clean(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.banned_words b
    where lower(regexp_replace(p_name, '[ ._0-9]', '', 'g')) like '%' || b.word || '%'
  );
$$;

-- ---------- 1. profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 3 and 24 and display_name ~ '^[[:alnum:] ._]+$'),
  avatar_url text,
  role public.user_role not null default 'pelajar',
  school_name text check (school_name is null or char_length(school_name) <= 100),
  is_minor boolean not null default false,
  guardian_email text,
  guardian_consent_at timestamptz,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 2. sanggar ----------
create table public.sanggar (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  city text not null,
  province text not null,
  description text not null default '' check (char_length(description) <= 600),
  contact_email text not null,
  owner_id uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  rejected_at timestamptz,
  review_note text,
  invite_code text not null unique default public.gen_invite_code(),
  created_at timestamptz not null default now()
);

-- ---------- 3. sanggar_members ----------
create table public.sanggar_members (
  sanggar_id uuid not null references public.sanggar (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  joined_at timestamptz not null default now(),
  primary key (sanggar_id, profile_id)
);
create index sanggar_members_profile_idx on public.sanggar_members (profile_id);

-- Fungsi bantu otorisasi (SECURITY DEFINER agar tidak rekursif terhadap RLS).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_sanggar_member(p_sanggar uuid, p_roles public.member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sanggar_members
    where sanggar_id = p_sanggar and profile_id = auth.uid()
      and (p_roles is null or role = any (p_roles))
  );
$$;

create or replace function public.is_sanggar_staff(p_sanggar uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_sanggar_member(p_sanggar, array['pemilik', 'maestro']::public.member_role[]);
$$;

create or replace function public.is_sanggar_owner(p_sanggar uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_sanggar_member(p_sanggar, array['pemilik']::public.member_role[]);
$$;

create or replace function public.is_sanggar_verified(p_sanggar uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sanggar where id = p_sanggar and verified_at is not null);
$$;

-- ---------- 4. dances ----------
create table public.dances (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  region text not null,
  province text not null,
  summary text not null default '',
  context text not null default '',
  posture public.posture not null default 'berdiri',
  accompaniment text not null default '',
  status public.content_status not null default 'draf',
  sanggar_id uuid references public.sanggar (id) on delete set null,
  verified_by_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 5. dance_props ----------
create table public.dance_props (
  dance_id text not null references public.dances (id) on delete cascade,
  kind public.prop_kind not null,
  label text not null,
  note text,
  primary key (dance_id, kind)
);

-- ---------- 7. step_consents ----------
create table public.step_consents (
  id uuid primary key default gen_random_uuid(),
  dancer_name text not null check (char_length(dancer_name) between 2 and 100),
  consent_text_version text not null,
  agreed_at timestamptz not null default now(),
  signed_by uuid references public.profiles (id) on delete set null,
  sanggar_id uuid references public.sanggar (id) on delete cascade,
  document_path text,
  created_at timestamptz not null default now()
);

-- ---------- 6. steps ----------
create table public.steps (
  id uuid primary key default gen_random_uuid(),
  dance_id text not null references public.dances (id) on delete cascade,
  sanggar_id uuid references public.sanggar (id) on delete cascade,
  order_index int not null default 0,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  counts int not null check (counts between 1 and 32),
  duration_ms int not null check (duration_ms between 1000 and 60000),
  aspect real not null default 0.75 check (aspect > 0 and aspect < 4),
  prop public.prop_kind,
  keypoints_path text,
  video_path text,
  recorded_by_label text not null,
  recorded_by_profile uuid references public.profiles (id) on delete set null,
  consent_id uuid references public.step_consents (id) on delete restrict,
  status public.content_status not null default 'draf',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index steps_dance_status_order_idx on public.steps (dance_id, status, order_index);
create index steps_sanggar_idx on public.steps (sanggar_id);

-- ---------- 8. attempts (TANPA video) ----------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  score int not null check (score between 0 and 100),
  wiraga int not null check (wiraga between 0 and 100),
  wirama int not null check (wirama between 0 and 100),
  coverage real not null default 1 check (coverage between 0 and 1),
  speed real not null default 1 check (speed in (0.5, 0.75, 1)),
  created_at timestamptz not null default now()
);
create index attempts_profile_step_idx on public.attempts (profile_id, step_id);

-- ---------- 9. test_runs ----------
create table public.test_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dance_id text not null references public.dances (id) on delete cascade,
  score int not null check (score between 0 and 100),
  wiraga int not null check (wiraga between 0 and 100),
  wirama int not null check (wirama between 0 and 100),
  per_step jsonb not null default '{}'::jsonb,
  crowd_ratio real not null default 0 check (crowd_ratio between 0 and 1),
  example_visible boolean not null default false,
  eligible boolean not null default false,
  verified boolean not null default false,
  flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index test_runs_board_idx on public.test_runs (dance_id, eligible, score desc, created_at);
create index test_runs_profile_idx on public.test_runs (profile_id, created_at desc);

-- ---------- 10. ai_models ----------
create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  dance_id text not null references public.dances (id) on delete cascade,
  kind text not null check (kind in ('klasifikasi', 'properti')),
  version int not null,
  url text not null,
  labels jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (dance_id, kind, version)
);
create unique index ai_models_one_active on public.ai_models (dance_id, kind) where active;

-- ---------- 11. training_clips ----------
create table public.training_clips (
  id uuid primary key default gen_random_uuid(),
  dance_id text not null references public.dances (id) on delete cascade,
  label text not null,
  keypoints_path text not null,
  contributor_profile uuid references public.profiles (id) on delete set null,
  consent_id uuid references public.step_consents (id) on delete set null,
  split text not null default 'latih' check (split in ('latih', 'uji')),
  created_at timestamptz not null default now()
);

-- ---------- 12. reports ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('step', 'nama_papan_skor', 'sanggar')),
  target_id text not null,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'baru' check (status in ('baru', 'selesai')),
  created_at timestamptz not null default now()
);
create index reports_reporter_idx on public.reports (reporter_id, created_at);

-- ---------- 13. audit_log ----------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Catatan peristiwa untuk pembatasan laju di Edge Functions.
create table public.rate_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (profile_id, action, created_at desc);

-- ---------- RLS aktif di semua tabel ----------
alter table public.banned_words enable row level security;
alter table public.profiles enable row level security;
alter table public.sanggar enable row level security;
alter table public.sanggar_members enable row level security;
alter table public.dances enable row level security;
alter table public.dance_props enable row level security;
alter table public.step_consents enable row level security;
alter table public.steps enable row level security;
alter table public.attempts enable row level security;
alter table public.test_runs enable row level security;
alter table public.ai_models enable row level security;
alter table public.training_clips enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_events enable row level security;

-- ---------- Trigger updated_at ----------
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger dances_updated_at before update on public.dances for each row execute function public.set_updated_at();
create trigger steps_updated_at before update on public.steps for each row execute function public.set_updated_at();

-- ---------- Pelindung kolom profil (role, is_minor, dst. tidak boleh diubah sendiri) ----------
create or replace function public.protect_profile_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_trusted_context() or public.is_admin() then
    return new;
  end if;
  new.role := old.role;
  new.is_minor := old.is_minor;
  new.guardian_email := old.guardian_email;
  new.guardian_consent_at := old.guardian_consent_at;
  new.onboarded := old.onboarded;
  new.id := old.id;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_columns();

-- Nama tampilan wajib bersih dari kata terlarang (berlaku untuk semua jalur, termasuk update langsung).
create or replace function public.check_display_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.name_is_clean(new.display_name) then
    raise exception 'Nama tampilan mengandung kata yang tidak diizinkan' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger profiles_check_name before insert or update of display_name on public.profiles for each row execute function public.check_display_name();

-- Pelindung kolom sanggar (verifikasi hanya admin).
create or replace function public.protect_sanggar_columns() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_trusted_context() or public.is_admin() then
    return new;
  end if;
  new.verified_at := old.verified_at;
  new.rejected_at := old.rejected_at;
  new.review_note := old.review_note;
  new.owner_id := old.owner_id;
  new.invite_code := old.invite_code;
  return new;
end $$;
create trigger sanggar_protect before update on public.sanggar for each row execute function public.protect_sanggar_columns();

-- Status 'terbit' hanya lewat Edge Function publish-step (service role) atau admin.
create or replace function public.guard_step_publish() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_trusted_context() or public.is_admin() then
    return new;
  end if;
  if new.status = 'terbit' and (tg_op = 'INSERT' or old.status is distinct from 'terbit') then
    raise exception 'Gerak hanya bisa diterbitkan lewat publish-step' using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'UPDATE' then
    new.sanggar_id := old.sanggar_id;
    new.consent_id := coalesce(old.consent_id, new.consent_id);
  end if;
  return new;
end $$;
create trigger steps_guard_publish before insert or update on public.steps for each row execute function public.guard_step_publish();

-- ---------- Trigger handle_new_user ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  raw_name text := coalesce(meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', split_part(new.email, '@', 1), '');
  clean text := substr(trim(regexp_replace(raw_name, '[^[:alnum:] ._]', '', 'g')), 1, 24);
  v_role public.user_role := 'pelajar';
  v_minor boolean := coalesce((meta ->> 'is_minor')::boolean, false);
begin
  if char_length(clean) < 3 or not public.name_is_clean(clean) then
    clean := 'Penari_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  -- peran 'admin' TIDAK PERNAH dari pendaftaran
  if meta ->> 'role' in ('pelajar', 'guru') then v_role := (meta ->> 'role')::public.user_role; end if;
  if meta ->> 'role' = 'maestro' and not v_minor then v_role := 'maestro'; end if;

  perform set_config('oa.bypass', 'on', true);
  insert into public.profiles (id, display_name, role, is_minor, guardian_email, guardian_consent_at)
  values (
    new.id, clean, v_role, v_minor,
    case when v_minor then nullif(meta ->> 'guardian_email', '') end,
    case when v_minor and coalesce((meta ->> 'guardian_consent')::boolean, false) then now() end
  );
  perform set_config('oa.bypass', '', true);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- View step_progress (RLS pemanggil tetap berlaku) ----------
create view public.step_progress with (security_invoker = true) as
  select profile_id, step_id, max(score) as best_score, count(*)::int as attempt_count, max(created_at) as last_attempt_at
  from public.attempts
  group by profile_id, step_id;

-- ---------- RPC ----------
-- Papan skor: hanya test_runs eligible, satu baris per pengguna (skor terbaik). Hanya nama tampilan.
create or replace function public.get_leaderboard(p_dance text, p_period text default 'semua', p_sanggar uuid default null, p_limit int default 20)
returns table (rank bigint, display_name text, score int, wiraga int, wirama int, achieved_at timestamptz)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (t.profile_id) t.profile_id, t.score, t.wiraga, t.wirama, t.created_at
    from public.test_runs t
    where t.dance_id = p_dance
      and t.eligible
      and (p_period <> 'minggu' or t.created_at >= now() - interval '7 days')
      and (
        p_sanggar is null
        or (public.is_sanggar_member(p_sanggar)
            and exists (select 1 from public.sanggar_members m where m.sanggar_id = p_sanggar and m.profile_id = t.profile_id))
      )
    order by t.profile_id, t.score desc, t.created_at asc
  )
  select rank() over (order by b.score desc) as rank, p.display_name, b.score, b.wiraga, b.wirama, b.created_at as achieved_at
  from best b
  join public.profiles p on p.id = b.profile_id
  order by b.score desc, b.created_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

create or replace function public.get_my_rank(p_dance text)
returns table (rank bigint, score int)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (t.profile_id) t.profile_id, t.score
    from public.test_runs t
    where t.dance_id = p_dance and t.eligible
    order by t.profile_id, t.score desc, t.created_at asc
  ), ranked as (
    select profile_id, score, rank() over (order by score desc) as rank from best
  )
  select rank, score from ranked where profile_id = auth.uid();
$$;

-- Onboarding sekali: memilih peran (bukan admin) dan nama sekolah.
create or replace function public.complete_onboarding(p_role public.user_role, p_school_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Profil tidak ditemukan'; end if;
  if p_role = 'admin' then raise exception 'Peran tidak valid' using errcode = 'insufficient_privilege'; end if;
  if p_role = 'maestro' and me.is_minor then raise exception 'Peran maestro hanya untuk usia 17 tahun ke atas'; end if;
  perform set_config('oa.bypass', 'on', true);
  update public.profiles
     set role = case when me.onboarded or me.role = 'admin' then me.role else p_role end,
         school_name = nullif(trim(coalesce(p_school_name, '')), ''),
         onboarded = true
   where id = auth.uid();
  perform set_config('oa.bypass', '', true);
end $$;

-- Daftar anggota sanggar (hanya untuk sesama anggota).
create or replace function public.get_sanggar_members(p_sanggar uuid)
returns table (profile_id uuid, role public.member_role, joined_at timestamptz, display_name text)
language sql stable security definer set search_path = public as $$
  select m.profile_id, m.role, m.joined_at, p.display_name
  from public.sanggar_members m join public.profiles p on p.id = m.profile_id
  where m.sanggar_id = p_sanggar and (public.is_sanggar_member(p_sanggar) or public.is_admin())
  order by m.role, m.joined_at;
$$;

-- Moderasi: admin mengganti nama yang melanggar menjadi nama netral.
create or replace function public.admin_reset_display_name(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Khusus admin' using errcode = 'insufficient_privilege'; end if;
  update public.profiles set display_name = 'Penari_' || substr(replace(p_profile::text, '-', ''), 1, 6) where id = p_profile;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (auth.uid(), 'reset_nama', 'profile', p_profile::text);
end $$;

-- Hak eksekusi: cabut dari publik, berikan seperlunya.
revoke execute on function public.get_leaderboard(text, text, uuid, int) from public;
revoke execute on function public.get_my_rank(text) from public;
revoke execute on function public.complete_onboarding(public.user_role, text) from public;
revoke execute on function public.get_sanggar_members(uuid) from public;
revoke execute on function public.admin_reset_display_name(uuid) from public;
grant execute on function public.get_leaderboard(text, text, uuid, int) to anon, authenticated;
grant execute on function public.get_my_rank(text) to authenticated;
grant execute on function public.complete_onboarding(public.user_role, text) to authenticated;
grant execute on function public.get_sanggar_members(uuid) to authenticated;
grant execute on function public.admin_reset_display_name(uuid) to authenticated;
