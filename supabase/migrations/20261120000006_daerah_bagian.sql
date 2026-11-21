-- =====================================================================
-- Klasifikasi per daerah, tingkat kesulitan, dan kerangka bagian (kurikulum)
-- Bagian = urutan materi yang wajib lulus sebelum tes akhir.
-- Gerak acuan (steps) mengisi bagian lewat steps.part_id.
-- =====================================================================

create table public.regions (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  province text not null,
  kain text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.regions enable row level security;
create policy "daerah: publik baca" on public.regions for select to anon, authenticated using (true);
create policy "daerah: admin tulis" on public.regions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.regions to anon, authenticated;

alter table public.dances
  add column region_id text references public.regions (id) on delete set null,
  add column difficulty smallint not null default 1 check (difficulty between 1 and 4);
create index dances_region_idx on public.dances (region_id, difficulty);

create table public.dance_parts (
  id uuid primary key default gen_random_uuid(),
  dance_id text not null references public.dances (id) on delete cascade,
  order_index int not null check (order_index between 1 and 30),
  name text not null check (char_length(name) between 2 and 80),
  focus text not null default '',
  counts int not null default 8 check (counts between 1 and 32),
  created_at timestamptz not null default now(),
  unique (dance_id, order_index)
);
alter table public.dance_parts enable row level security;
create policy "bagian: ikut tarian" on public.dance_parts for select to anon, authenticated
  using (exists (select 1 from public.dances d where d.id = dance_id
                 and (d.status = 'terbit' or (d.sanggar_id is not null and public.is_sanggar_member(d.sanggar_id)) or public.is_admin())));
create policy "bagian: admin/staf tulis" on public.dance_parts for all to authenticated
  using (public.is_admin() or exists (select 1 from public.dances d where d.id = dance_id and d.sanggar_id is not null and public.is_sanggar_staff(d.sanggar_id)))
  with check (public.is_admin() or exists (select 1 from public.dances d where d.id = dance_id and d.sanggar_id is not null and public.is_sanggar_staff(d.sanggar_id)));
grant select on public.dance_parts to anon, authenticated;
grant insert, update, delete on public.dance_parts to authenticated;

alter table public.steps add column part_id uuid references public.dance_parts (id) on delete set null;
create index steps_part_idx on public.steps (part_id);
-- Satu gerak terbit per bagian.
create unique index steps_one_published_per_part on public.steps (part_id) where status = 'terbit' and part_id is not null;
