-- Properti tambahan untuk katalog per daerah (ADD VALUE harus di migrasi terpisah).
alter type public.prop_kind add value if not exists 'kipas';
alter type public.prop_kind add value if not exists 'selendang';
alter type public.prop_kind add value if not exists 'payung';
alter type public.prop_kind add value if not exists 'topeng';
alter type public.prop_kind add value if not exists 'bokor';
alter type public.prop_kind add value if not exists 'kuda_kepang';
