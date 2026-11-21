// Membuat supabase/seed_katalog.sql dari src/data/katalog.ts (sumber tunggal katalog).
// Jalankan: node scripts/gen-katalog-sql.ts
import { writeFileSync } from 'node:fs';
import { bagianOf, DAERAH, PEMANASAN, TARIAN } from '../src/data/katalog.ts';
import { asetBab, REKAMAN } from '../src/data/rekaman.ts';

const q = (s: string | null | undefined) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const draf = ' (Deskripsi draf — perlu ditinjau sanggar.)';
const out: string[] = [
  '-- DIBUAT OTOMATIS oleh scripts/gen-katalog-sql.ts — jangan diedit manual.',
  '-- Katalog per daerah + kerangka bagian (draf, wajib ditinjau maestro).',
  '',
  'insert into public.regions (id, name, province, kain, sort) values',
  DAERAH.map((d) => `  (${q(d.id)}, ${q(d.name)}, ${q(d.province)}, ${q(d.kain)}, ${d.sort})`).join(',\n'),
  'on conflict (id) do update set name = excluded.name, province = excluded.province, kain = excluded.kain, sort = excluded.sort;',
  '',
];
const all = [...TARIAN, PEMANASAN];
const prov = (id: string) => DAERAH.find((d) => d.id === id)?.province ?? 'Semua daerah';
out.push('insert into public.dances (id, name, region, province, summary, context, posture, accompaniment, status, verified_by_note, region_id, difficulty) values');
out.push(all.map((t) => `  (${q(t.id)}, ${q(t.name)}, ${q(t.suku)}, ${q(prov(t.region))}, ${q(t.summary + (t.id === 'pemanasan' ? '' : draf))}, ${q(t.summary + (t.id === 'pemanasan' ? '' : draf))}, ${q(t.posture)}, ${q(t.accompaniment)}, 'terbit', ${q(t.note ?? null)}, ${t.region ? q(t.region) : 'null'}, ${t.tingkat})`).join(',\n'));
out.push('on conflict (id) do update set name = excluded.name, region = excluded.region, province = excluded.province, summary = excluded.summary, posture = excluded.posture, accompaniment = excluded.accompaniment, verified_by_note = excluded.verified_by_note, region_id = excluded.region_id, difficulty = excluded.difficulty;');
out.push('');
const props = all.flatMap((t) => (t.props ?? []).map((p) => `  (${q(t.id)}, ${q(p.kind)}, ${q(p.label)}, ${q(p.note)})`));
if (props.length) {
  out.push('insert into public.dance_props (dance_id, kind, label, note) values');
  out.push(props.join(',\n'));
  out.push('on conflict (dance_id, kind) do update set label = excluded.label, note = excluded.note;');
  out.push('');
}
out.push('insert into public.dance_parts (id, dance_id, order_index, name, focus, counts) values');
out.push(all.flatMap((t) => bagianOf(t).map((p, i) => `  (md5(${q(`${t.id}-${i + 1}`)})::uuid, ${q(t.id)}, ${i + 1}, ${q(p.name)}, ${q(p.focus)}, ${p.counts})`)).join(',\n'));
out.push('on conflict (dance_id, order_index) do update set name = excluded.name, focus = excluded.focus, counts = excluded.counts;');
out.push('');
// Gerak dari rekaman acuan bawaan (aset di public/, path "static:"). Butuh migrasi 20261120000007_rekaman_audio.sql.
const rekamanRows = REKAMAN.flatMap((r) => {
  const t = all.find((x) => x.id === r.danceId);
  if (!t) return [];
  const parts = bagianOf(t);
  return r.bab.map((b, i) => `  (${q(b.id)}, ${q(r.danceId)}, ${i + 1}, ${q(parts[i].name)}, ${q(parts[i].focus)}, ${b.counts}, ${b.durationMs}, ${r.aspect}, ${r.prop ? q(r.prop) : 'null'}, ${q(asetBab(r, i + 1, 'json'))}, ${q(asetBab(r, i + 1, 'mp4'))}, ${q(asetBab(r, i + 1, 'm4a'))}, ${q(r.label)}, 'terbit', md5(${q(`${r.danceId}-${i + 1}`)})::uuid)`);
});
if (rekamanRows.length) {
  out.push('-- Gerak acuan dari rekaman bawaan aplikasi (video, lagu, dan kerangka di public/).');
  out.push('insert into public.steps (id, dance_id, order_index, name, description, counts, duration_ms, aspect, prop, keypoints_path, video_path, audio_path, recorded_by_label, status, part_id) values');
  out.push(rekamanRows.join(',\n'));
  out.push('on conflict (id) do update set name = excluded.name, description = excluded.description, counts = excluded.counts, duration_ms = excluded.duration_ms, aspect = excluded.aspect, prop = excluded.prop, keypoints_path = excluded.keypoints_path, video_path = excluded.video_path, audio_path = excluded.audio_path, recorded_by_label = excluded.recorded_by_label, status = excluded.status, part_id = excluded.part_id;');
  out.push('');
}
writeFileSync('supabase/seed_katalog.sql', out.join('\n') + '\n');
console.log(`seed_katalog.sql: ${DAERAH.length} daerah, ${all.length} tarian, ${all.reduce((s, t) => s + bagianOf(t).length, 0)} bagian`);
