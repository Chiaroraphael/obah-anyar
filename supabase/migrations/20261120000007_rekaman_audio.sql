-- Lagu iringan per gerak + gerak panjang dari rekaman acuan.
-- - steps.audio_path: path lagu di bucket step-videos, atau "static:/…" untuk aset bawaan aplikasi (public/).
--   keypoints_path & video_path juga boleh berawalan "static:" (dibaca langsung oleh klien, tidak lewat Storage).
-- - Batas hitungan dinaikkan dari 32 ke 64: bab dari rekaman utuh bisa 20–45 detik (±1 detik per hitungan).

alter table public.steps add column if not exists audio_path text;

alter table public.steps drop constraint if exists steps_counts_check;
alter table public.steps add constraint steps_counts_check check (counts between 1 and 64);

alter table public.dance_parts drop constraint if exists dance_parts_counts_check;
alter table public.dance_parts add constraint dance_parts_counts_check check (counts between 1 and 64);

-- Lagu boleh diunggah ke bucket yang sama dengan video contoh.
update storage.buckets
   set allowed_mime_types = array['video/mp4', 'video/webm', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/ogg']
 where id = 'step-videos';
