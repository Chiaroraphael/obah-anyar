import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { CameraStage } from '../../components/CameraStage';
import { EmptyState, Modal, SkeletonList, StatusChip } from '../../components/ui';
import { useDances, useParts, useRegions } from '../../lib/queries';
import { TingkatBadge } from '../../components/Tingkat';
import { supabase } from '../../lib/supabase';
import { loadLandmarker } from '../../pose/landmarker';
import { RecordingBuffer } from '../../pose/session';
import { readiness } from '../../pose/tracker';
import type { StepKeypoints } from '../../pose/types';
import type { PropKind, Step } from '../../types/database.types';
import { useAuth } from '../auth/authStore';
import { usePoseCamera } from '../practice/usePoseCamera';
import { POSE_MODEL } from '../../lib/supabase';
import {
  CONSENT_TEXT_VERSION, publishStep, saveStep, setStepStatus, swapOrder, validateConsentFile, validateVideoFile, VIDEO_MAX_SECONDS, type DancePackage,
} from './maestroApi';

const STATUS_LABEL: Record<string, string> = { draf: 'Draf', ditinjau: 'Menunggu tinjauan', terbit: 'Terbit', ditolak: 'Ditolak' };

export function MaestroPage() {
  const { sanggar, profile, demo } = useAuth();
  const dances = useDances();
  const regions = useRegions();
  const [danceId, setDanceId] = useState<string>('jaipong');
  const [creating, setCreating] = useState(false);
  const [localSteps, setLocalSteps] = useState<Step[]>([]); // mode demo
  const qc = useQueryClient();
  const sanggarId = sanggar?.id ?? null;
  const isOwner = sanggar?.role === 'pemilik' || profile?.role === 'admin';

  const steps = useQuery({
    queryKey: ['maestro-steps', sanggarId, danceId],
    enabled: Boolean(supabase && sanggarId && !demo),
    queryFn: async (): Promise<Step[]> => {
      const { data, error } = await supabase!.from('steps').select('*').eq('sanggar_id', sanggarId!).eq('dance_id', danceId).order('order_index');
      if (error) throw error;
      return data as Step[];
    },
  });
  const list = demo ? localSteps.filter((s) => s.dance_id === danceId) : steps.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['maestro-steps', sanggarId, danceId] });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id); setActionError(null);
    try { await fn(); await refresh(); } catch (e) { setActionError(e instanceof Error ? e.message : 'Gagal.'); } finally { setBusyId(null); }
  };
  const move = (i: number, dir: -1 | 1) => {
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    if (demo) { setLocalSteps((s) => s.map((x) => (x.id === a.id ? { ...x, order_index: b.order_index } : x.id === b.id ? { ...x, order_index: a.order_index } : x)).sort((p, q) => p.order_index - q.order_index)); return; }
    void act(a.id, () => swapOrder(a, b));
  };

  const exportPackage = async () => {
    const pkg: DancePackage = { format: 'obah-anyar-paket', version: 1, dance_id: danceId, exported_at: new Date().toISOString(), steps: [] };
    for (const s of list) {
      let keypoints: StepKeypoints | null = null;
      if (supabase && s.keypoints_path) {
        const { data } = await supabase.storage.from('step-keypoints').download(s.keypoints_path);
        if (data) keypoints = JSON.parse(await data.text());
      }
      const { id: _i, sanggar_id: _s, keypoints_path: _k, video_path: _v, status: _st, ...meta } = s;
      void _i; void _s; void _k; void _v; void _st;
      pkg.steps.push({ ...meta, keypoints });
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `paket-${danceId}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importPackage = async (f: File) => {
    try {
      const pkg = JSON.parse(await f.text()) as DancePackage;
      if (pkg.format !== 'obah-anyar-paket') throw new Error();
      setImportMsg(`Paket berisi ${pkg.steps.length} gerak untuk "${pkg.dance_id}". Gerak hasil impor tetap butuh persetujuan penari dan rekaman video sebelum diterbitkan. Buat ulang lewat "Gerak baru" memakai data paket ini.`);
    } catch { setImportMsg('Berkas bukan paket tarian Obah Anyar yang valid.'); }
  };

  return (
    <main className="wadah py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-kecil text-soga">Mode Maestro, {sanggar?.name ?? 'Admin'}</span>
          <h1 className="mt-2 text-[34px] sm:text-[40px]">Studio rekam</h1>
          <p className="mt-2 max-w-xl text-muted">Rekam gerak acuan untuk murid. Setiap gerak butuh persetujuan penari sebelum disimpan, lalu ditinjau sebelum terbit.</p>
        </div>
        <button type="button" className="tombol-utama" onClick={() => setCreating(true)}><Icon name="plus" size={18} />Gerak baru</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <label htmlFor="pilih-tarian" className="label-kecil text-soga">Tarian (per daerah)</label>
          <select id="pilih-tarian" className="input mt-2" value={danceId} onChange={(e) => setDanceId(e.target.value)}>
            {regions.data?.map((r) => (
              <optgroup key={r.id} label={r.name}>
                {dances.data?.filter((d) => d.region_id === r.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </optgroup>
            ))}
            <optgroup label="Lainnya">
              {dances.data?.filter((d) => !d.region_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </optgroup>
          </select>
          {(() => { const cur = dances.data?.find((d) => d.id === danceId); return cur ? <div className="mt-3"><TingkatBadge level={cur.difficulty} parts={cur.part_count} size="sm" /></div> : null; })()}
          <p className="mt-3 text-[14px] text-muted">Setiap gerak yang direkam mengisi satu bagian kurikulum tarian.</p>
        </div>
        <section className="kartu p-5 sm:p-6" aria-labelledby="judul-gerak">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="judul-gerak" className="text-[22px]">Gerak sanggarmu</h2>
            <div className="ml-auto flex gap-2">
              <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" onClick={exportPackage} disabled={!list.length}><Icon name="download" size={16} />Ekspor paket</button>
              <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" onClick={() => importRef.current?.click()}><Icon name="upload" size={16} />Impor paket</button>
              <input ref={importRef} type="file" accept="application/json" className="sr-only" aria-label="Pilih berkas paket tarian" onChange={(e) => e.target.files?.[0] && importPackage(e.target.files[0])} />
            </div>
          </div>
          {importMsg && <p className="mt-3 rounded-[10px] bg-nila/5 p-3 text-[14px]" role="status">{importMsg}</p>}
          {actionError && <p className="galat-form" role="alert">{actionError}</p>}
          <div className="mt-5">
            {steps.isLoading && !demo ? <SkeletonList rows={3} /> : list.length === 0 ? (
              <EmptyState icon="camera" title="Belum ada gerak sanggarmu untuk tarian ini" action={<button type="button" className="tombol-utama" onClick={() => setCreating(true)}><Icon name="camera" size={18} />Rekam gerak pertama</button>}>
                Mulai dari bagian 1. Durasi 4–20 detik per bagian paling mudah dipelajari.
              </EmptyState>
            ) : (
              <ol className="space-y-2.5">
                {list.map((s, i) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-mori-tua bg-mori p-3.5">
                    <div className="flex flex-col">
                      <button type="button" className="grid h-8 w-11 place-items-center rounded-[8px] hover:bg-nila/5 disabled:opacity-30" disabled={i === 0 || busyId !== null} onClick={() => move(i, -1)} aria-label={`Naikkan ${s.name}`}><Icon name="chevron" size={16} className="rotate-180" /></button>
                      <button type="button" className="grid h-8 w-11 place-items-center rounded-[8px] hover:bg-nila/5 disabled:opacity-30" disabled={i === list.length - 1 || busyId !== null} onClick={() => move(i, 1)} aria-label={`Turunkan ${s.name}`}><Icon name="chevron" size={16} /></button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="label-kecil text-soga">Bagian {i + 1}, {s.counts} hitungan, {(s.duration_ms / 1000).toFixed(1)} detik</div>
                      <div className="truncate text-[17px] font-bold">{s.name}</div>
                      <div className="text-[14px] text-muted">Oleh {s.recorded_by_label}</div>
                    </div>
                    <StatusChip tone={s.status}>{STATUS_LABEL[s.status]}</StatusChip>
                    <div className="flex gap-2">
                      {s.status === 'draf' && <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" disabled={busyId === s.id} onClick={() => demo ? setLocalSteps((x) => x.map((y) => (y.id === s.id ? { ...y, status: 'ditinjau' } : y))) : act(s.id, () => setStepStatus(s.id, 'ditinjau'))}>Minta tinjauan</button>}
                      {s.status === 'ditinjau' && isOwner && <button type="button" className="tombol-utama min-h-[44px] px-3 text-[14px]" disabled={busyId === s.id} onClick={() => demo ? setLocalSteps((x) => x.map((y) => (y.id === s.id ? { ...y, status: 'terbit' } : y))) : act(s.id, () => publishStep(s.id))}>Terbitkan</button>}
                      {s.status === 'ditolak' && <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" onClick={() => act(s.id, () => setStepStatus(s.id, 'draf'))}>Kembalikan ke draf</button>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="mt-5 text-[14px] text-muted">Alur status: Draf → Menunggu tinjauan → Terbit. Penerbitan hanya oleh pemilik sanggar atau admin, dan diperiksa server (persetujuan, video, kerangka, durasi).</p>
        </section>
      </div>

      {creating && sanggarId && (
        <NewStepStudio
          danceId={danceId}
          danceName={dances.data?.find((d) => d.id === danceId)?.name ?? ''}
          sanggarId={sanggarId}
          defaultRecorder={profile?.display_name ?? ''}
          taken={list.map((s) => s.part_id).filter((x): x is string => Boolean(x))}
          demo={demo}
          onClose={() => setCreating(false)}
          onSaved={(s) => { setCreating(false); if (demo) setLocalSteps((x) => [...x, s]); else void refresh(); }}
        />
      )}
      {creating && !sanggarId && (
        <Modal open onClose={() => setCreating(false)} title="Butuh sanggar">
          <p className="text-muted">Akun admin perlu memilih sanggar lewat dasbor admin sebelum merekam.</p>
          <Link to="/admin" className="tombol-utama mt-4">Ke Admin</Link>
        </Modal>
      )}
    </main>
  );
}

type Source = 'kamera' | 'unggah';

function NewStepStudio({ danceId, danceName, sanggarId, defaultRecorder, taken, demo, onClose, onSaved }: {
  danceId: string; danceName: string; sanggarId: string; defaultRecorder: string; taken: string[]; demo: boolean; onClose: () => void; onSaved: (s: Step) => void;
}) {
  const parts = useParts(danceId);
  const [partId, setPartId] = useState<string>('');
  const part = parts.data?.find((p) => p.id === partId);
  useEffect(() => {
    if (partId || !parts.data?.length) return;
    const first = parts.data.find((p) => !taken.includes(p.id)) ?? parts.data[0];
    setPartId(first.id); setName(first.name); setCounts(first.counts);
  }, [parts.data, partId, taken]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [counts, setCounts] = useState(8);
  const [prop, setProp] = useState<PropKind | ''>('');
  const [recorder, setRecorder] = useState(defaultRecorder);
  const [source, setSource] = useState<Source>('kamera');
  const [kp, setKp] = useState<StepKeypoints | null>(null);
  const [video, setVideo] = useState<Blob | null>(null);
  const [dancer, setDancer] = useState('');
  const [agree, setAgree] = useState(false);
  const [doc, setDoc] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!part) e.part = 'Pilih bagian yang direkam';
    if (name.trim().length < 2) e.name = 'Nama gerak wajib diisi';
    if (description.trim().length < 10) e.description = 'Tulis penjelasan minimal 10 karakter';
    if (counts < 1 || counts > 64) e.counts = 'Jumlah hitungan 1–64';
    if (recorder.trim().length < 2) e.recorder = 'Nama perekam wajib untuk atribusi';
    if (!kp) e.kp = 'Rekam atau unggah gerak dulu';
    else if (kp.durationMs < 1000 || kp.durationMs > 60000) e.kp = 'Durasi gerak harus 1–60 detik';
    if (dancer.trim().length < 2) e.dancer = 'Nama penari wajib diisi';
    if (!agree) e.agree = 'Persetujuan penari wajib dicentang';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true); setSaveError(null);
    try {
      const keypoints = { ...kp!, counts };
      if (demo) {
        onSaved({ id: crypto.randomUUID(), dance_id: danceId, sanggar_id: sanggarId, order_index: part!.order_index, part_id: part!.id, name, description, counts, duration_ms: Math.round(kp!.durationMs), aspect: kp!.aspect, prop: prop || null, keypoints_path: null, video_path: null, recorded_by_label: recorder, status: 'draf' });
        return;
      }
      const s = await saveStep({ danceId, sanggarId, name: name.trim(), description: description.trim(), counts, prop: prop || null, recordedByLabel: recorder.trim(), keypoints, video, consent: { dancerName: dancer.trim(), document: doc }, orderIndex: part!.order_index, partId: part!.id });
      onSaved(s);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nila-malam/70 p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="judul-studio">
      <div className="mx-auto max-w-6xl rounded-none bg-mori sm:rounded-kartu">
        <div className="flex items-center justify-between gap-3 border-b border-mori-tua p-5">
          <div>
            <div className="label-kecil text-soga">{danceName}</div>
            <h2 id="judul-studio" className="text-[24px]">Gerak baru</h2>
          </div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-nila/5" onClick={onClose} aria-label="Tutup studio"><Icon name="x" /></button>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <div className="flex gap-1 rounded-[10px] bg-nila/5 p-1" role="tablist" aria-label="Sumber gerak">
              {([['kamera', 'Rekam kamera', 'camera'], ['unggah', 'Unggah video', 'upload']] as const).map(([v, t, i]) => (
                <button key={v} type="button" role="tab" aria-selected={source === v} onClick={() => { setSource(v); setKp(null); setVideo(null); }} className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[10px] text-[14px] font-bold ${source === v ? 'bg-mori shadow-sm' : 'text-muted'}`}><Icon name={i} size={16} />{t}</button>
              ))}
            </div>
            <div className="mt-4">
              {source === 'kamera' ? <CameraRecorder onDone={(k, v) => { setKp(k); setVideo(v); }} counts={counts} /> : <UploadExtractor onDone={(k, v) => { setKp(k); setVideo(v); }} counts={counts} />}
            </div>
            {kp && <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-pendar-teks" role="status"><Icon name="check" size={18} />Gerak tersimpan sementara: {(kp.durationMs / 1000).toFixed(1)} dtk, {kp.frames.length} cuplikan kerangka{video ? ', dengan video' : ''}.</p>}
            {errors.kp && <p className="galat-form" role="alert">{errors.kp}</p>}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="pilih-bagian" className="mb-1.5 block text-[14px] font-bold">Bagian yang direkam</label>
              <select id="pilih-bagian" className="input" value={partId} aria-invalid={Boolean(errors.part)}
                onChange={(e) => { const p = parts.data?.find((x) => x.id === e.target.value); setPartId(e.target.value); if (p) { setName(p.name); setCounts(p.counts); } }}>
                {parts.data?.map((p) => <option key={p.id} value={p.id}>Bagian {p.order_index}: {p.name}{taken.includes(p.id) ? ' (sudah ada rekaman)' : ''}</option>)}
              </select>
              {part && <p className="mt-1 text-[14px] text-muted">{part.focus}</p>}
              <p className="galat-form" role="alert">{errors.part}</p>
            </div>
            <TextField label="Nama gerak" value={name} onChange={setName} error={errors.name} placeholder="mis. Pencugan" />
            <div>
              <label htmlFor="penjelasan" className="mb-1.5 block text-[14px] font-bold">Penjelasan gerak</label>
              <textarea id="penjelasan" rows={3} className="input py-3" value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby="penjelasan-galat" />
              <p id="penjelasan-galat" className="galat-form" role="alert">{errors.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="hitungan" className="mb-1.5 block text-[14px] font-bold">Jumlah hitungan</label>
                <input id="hitungan" type="number" min={1} max={64} className="input" value={counts} onChange={(e) => setCounts(Number(e.target.value))} aria-invalid={Boolean(errors.counts)} />
                <p className="galat-form" role="alert">{errors.counts}</p>
              </div>
              <div>
                <label htmlFor="properti" className="mb-1.5 block text-[14px] font-bold">Properti</label>
                <select id="properti" className="input" value={prop} onChange={(e) => setProp(e.target.value as PropKind | '')}>
                  <option value="">Tanpa properti</option>
                  <option value="piring">Piring</option>
                  <option value="topeng_reog">Topeng reog</option>
                </select>
              </div>
            </div>
            <TextField label="Nama perekam (atribusi)" value={recorder} onChange={setRecorder} error={errors.recorder} hint="Tampil sebagai 'Contoh gerak oleh …'" />

            <fieldset className="rounded-kartu border-2 border-dashed border-mori-tua p-4">
              <legend className="px-1 text-[15px] font-extrabold">Persetujuan penari <span className="text-perbaiki-teks">*</span></legend>
              <p className="text-[14px] text-muted">Wajib sebelum menyimpan. Versi teks persetujuan: {CONSENT_TEXT_VERSION}.</p>
              <div className="mt-3"><TextField label="Nama penari" value={dancer} onChange={setDancer} error={errors.dancer} /></div>
              <label className="mt-3 flex items-start gap-3 text-[14px]">
                <input type="checkbox" className="mt-0.5 h-5 w-5 accent-nila" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={Boolean(errors.agree)} />
                <span>Penari menyetujui rekaman gerak ini dipakai sebagai contoh di Obah Anyar, dengan nama sanggar dan perekam tercantum. Penari dapat menarik persetujuan kapan saja.</span>
              </label>
              <p className="galat-form" role="alert">{errors.agree}</p>
              <label className="mt-2 block text-[14px] font-bold" htmlFor="scan">Scan surat persetujuan <span className="font-normal text-muted">(opsional, PDF/JPG/PNG, maks. 10 MB)</span></label>
              <input id="scan" type="file" accept="application/pdf,image/jpeg,image/png" className="mt-1.5 block w-full text-[14px] file:mr-3 file:min-h-[44px] file:rounded-[10px] file:border-0 file:bg-nila file:px-3 file:font-bold file:text-mori"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; const err = f ? validateConsentFile(f) : null; setErrors((x) => ({ ...x, doc: err ?? '' })); setDoc(err ? null : f); }} />
              <p className="galat-form" role="alert">{errors.doc}</p>
            </fieldset>

            {saveError && <p className="galat-form" role="alert">{saveError}</p>}
            <div className="flex gap-2">
              <button type="button" className="tombol-utama flex-1 min-h-[50px]" onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan sebagai draf'}</button>
              <button type="button" className="tombol-garis min-h-[50px]" onClick={onClose}>Batal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, error, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; placeholder?: string }) {
  const id = useMemo(() => 'f-' + label.replace(/\W+/g, '-').toLowerCase(), [label]);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-bold">{label}</label>
      <input id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-g`} />
      {hint && <p className="mt-1 text-[14px] text-muted">{hint}</p>}
      <p id={`${id}-g`} className="galat-form" role="alert">{error}</p>
    </div>
  );
}

function fmtRec(ms: number) {
  const s = ms / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`;
}

function CameraRecorder({ onDone, counts }: { onDone: (k: StepKeypoints, v: Blob | null) => void; counts: number }) {
  const cam = usePoseCamera('berdiri');
  const [rec, setRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [detected, setDetected] = useState<number | null>(null);
  const bufRef = useRef(new RecordingBuffer());
  const statsRef = useRef({ total: 0, ok: 0 });
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);

  useEffect(() => {
    cam.onFrameRef.current = ({ now, poses }) => {
      const st = statsRef.current;
      st.total++;
      if (readiness(poses[0]) === 'siap') st.ok++;
      if (st.total % 10 === 0) setDetected(Math.round((st.ok / st.total) * 100));
      if (st.total > 300) { st.total = Math.round(st.total / 2); st.ok = Math.round(st.ok / 2); }
      if (rec && poses[0]) bufRef.current.push(now, poses[0]);
    };
  }, [cam.onFrameRef, rec]);

  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => {
      const ms = performance.now() - startRef.current;
      setElapsed(ms);
      if (ms >= VIDEO_MAX_SECONDS * 1000) stop();
    }, 100);
    return () => clearInterval(id);
  });

  const start = () => {
    bufRef.current.begin(performance.now());
    startRef.current = performance.now();
    chunksRef.current = [];
    const stream = cam.videoRef.current?.srcObject as MediaStream | null;
    if (stream && 'MediaRecorder' in window) {
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.start(500);
      mrRef.current = mr;
    }
    setRec(true);
  };
  const stop = () => {
    setRec(false);
    const finish = () => {
      const v = chunksRef.current.length ? new Blob(chunksRef.current, { type: mrRef.current?.mimeType.split(';')[0] ?? 'video/webm' }) : null;
      const vEl = cam.videoRef.current;
      const aspect = vEl && vEl.videoHeight ? vEl.videoWidth / vEl.videoHeight : 4 / 3;
      onDone(bufRef.current.toKeypoints(counts, aspect), v);
    };
    const mr = mrRef.current;
    if (mr && mr.state !== 'inactive') { mr.onstop = finish; mr.stop(); } else finish();
  };

  return (
    <div className="tema-gelap rounded-kartu bg-nila-malam p-3">
      <CameraStage videoRef={cam.videoRef} canvasRef={cam.canvasRef} phase={cam.phase} ready={cam.ready} onStart={cam.start} errorText={cam.errorText} className="aspect-[4/3]" label="Kamera rekam"
        overlay={
          <>
            {detected != null && <span className={`absolute right-3 top-3 chip ${detected >= 80 ? 'bg-tepat/20 text-tepat' : 'bg-hampir/20 text-hampir'}`}>Badan terdeteksi {detected}%</span>}
            {rec && <span className="absolute left-3 top-12 chip bg-perbaiki text-mori text-[14px]"><Icon name="rec" size={10} className="denyut" />REC {fmtRec(elapsed)}</span>}
          </>
        } />
      <div className="mt-3 flex items-center gap-3">
        <p className="text-[14px] text-muted-gelap">Maks. {VIDEO_MAX_SECONDS} detik. Penari terlihat penuh, satu orang saja.</p>
        {cam.phase === 'ready' && (rec ? (
          <button type="button" className="tombol ml-auto bg-perbaiki text-mori" onClick={stop}><Icon name="x" size={18} />Berhenti</button>
        ) : (
          <button type="button" className="tombol-utama ml-auto" onClick={start}><Icon name="rec" size={14} />Mulai rekam</button>
        ))}
      </div>
    </div>
  );
}

function UploadExtractor({ onDone, counts }: { onDone: (k: StepKeypoints, v: Blob | null) => void; counts: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const pick = (f: File | undefined) => {
    setErr(null); setProgress(null);
    if (!f) return;
    const e = validateVideoFile(f);
    if (e) { setErr(e); return; }
    setFile(f);
  };

  const extract = async () => {
    const v = videoRef.current;
    if (!v || !file) return;
    if (v.duration > VIDEO_MAX_SECONDS + 0.5) { setErr(`Durasi video maksimal ${VIDEO_MAX_SECONDS} detik.`); return; }
    setProgress(0);
    try {
      const det = await loadLandmarker(POSE_MODEL);
      const buf = new RecordingBuffer();
      v.currentTime = 0;
      v.muted = true;
      await v.play();
      const t0 = performance.now();
      buf.begin(t0);
      await new Promise<void>((resolve) => {
        const step = () => {
          if (v.ended || v.paused) return resolve();
          const poses = det.detect(v, performance.now());
          if (poses[0]) buf.frames.push({ t: v.currentTime * 1000, lm: poses[0] });
          setProgress(Math.round((v.currentTime / v.duration) * 100));
          requestAnimationFrame(step);
        };
        v.onended = () => resolve();
        step();
      });
      setProgress(100);
      onDone(buf.toKeypoints(counts, v.videoWidth / v.videoHeight || 4 / 3), file);
    } catch {
      setErr('Gagal membaca pose dari video. Coba video lain dengan penari terlihat penuh.');
      setProgress(null);
    }
  };

  return (
    <div className="rounded-kartu border-2 border-dashed border-mori-tua p-4">
      {!file ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-mori-tua/60 text-soga"><Icon name="upload" /></span>
          <span className="font-bold">Pilih video MP4/WebM</span>
          <span className="text-[14px] text-muted">Maks. 60 detik, 50 MB. Kerangka diekstrak di browser.</span>
          <input type="file" accept="video/mp4,video/webm" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      ) : (
        <>
          <video ref={videoRef} src={url ?? undefined} controls playsInline className="aspect-[4/3] w-full rounded-[16px] bg-black" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="truncate text-[14px] font-semibold">{file.name}, {(file.size / 1048576).toFixed(1)}{" "}MB</span>
            <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" onClick={() => setFile(null)}>Ganti</button>
            <button type="button" className="tombol-utama ml-auto min-h-[44px] px-4 text-[14px]" disabled={progress != null && progress < 100} onClick={extract}>
              {progress == null ? 'Ekstrak kerangka' : progress < 100 ? `Membaca pose… ${progress}%` : 'Ekstrak ulang'}
            </button>
          </div>
          {progress != null && progress < 100 && <div className="mt-2 h-2 overflow-hidden rounded-full bg-mori-tua" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-pendar" style={{ width: `${progress}%` }} /></div>}
        </>
      )}
      {err && <p className="galat-form" role="alert">{err}</p>}
    </div>
  );
}
