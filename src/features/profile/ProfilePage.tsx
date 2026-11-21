import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/Navbar';
import { EmptyState, SkeletonList } from '../../components/ui';
import { LOCAL_STEPS } from '../../lib/localData';
import { useProgress, type LocalTest } from '../../lib/progress';
import { submitTest, useDances, useMyAttempts, useMyRank, useMyTests } from '../../lib/queries';
import { ApiError } from '../../lib/supabase';
import { PASS_SCORE } from '../../pose/compare';
import { useAuth } from '../auth/authStore';

export function ProfilePage() {
  const { profile, sanggar, demo, status } = useAuth();
  const dances = useDances();
  const local = useProgress();
  const cloudAttempts = useMyAttempts();
  const cloudTests = useMyTests();

  const perDance = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const add = (danceId: string | undefined, stepId: string, score: number) => {
      if (!danceId) return;
      const m = map.get(danceId) ?? new Map<string, number>();
      m.set(stepId, Math.max(m.get(stepId) ?? 0, score));
      map.set(danceId, m);
    };
    local.attempts.forEach((a) => add(a.danceId, a.stepId, a.score));
    cloudAttempts.data?.forEach((a) => add(LOCAL_STEPS.find((s) => s.id === a.step_id)?.dance_id ?? local.attempts.find((x) => x.stepId === a.step_id)?.danceId, a.step_id, a.score));
    return map;
  }, [local.attempts, cloudAttempts.data]);

  const tests = useMemo(() => {
    const cloud = (cloudTests.data ?? []).map((t) => ({ key: t.id, danceId: t.dance_id, score: t.score, at: t.created_at, eligible: t.eligible, submitted: true, local: null as null | LocalTest }));
    const unsent = local.tests.filter((t) => !t.submitted).map((t) => ({ key: t.at, danceId: t.danceId, score: t.score, at: t.at, eligible: false, submitted: false, local: t }));
    return [...unsent, ...cloud].sort((a, b) => b.at.localeCompare(a.at));
  }, [cloudTests.data, local.tests]);

  if (!profile) return null;
  const danceName = (id: string) => dances.data?.find((d) => d.id === id)?.name ?? id;

  return (
    <main className="wadah py-10">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={72} />
        <div className="flex-1">
          <span className="label-kecil text-soga">{profile.role === 'maestro' ? 'Maestro' : profile.role === 'guru' ? 'Guru' : profile.role === 'admin' ? 'Admin' : 'Pelajar'}{sanggar ? `, ${sanggar.name}` : ''}</span>
          <h1 className="text-[34px]">{profile.display_name}</h1>
        </div>
        <Link to="/pengaturan" className="tombol-garis"><Icon name="settings" size={18} />Pengaturan</Link>
      </div>
      {demo && <p className="mt-4 text-[14px] text-muted">Akun demo: kemajuan dibaca dari perangkat ini.</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="judul-belajar">
          <h2 id="judul-belajar" className="text-[22px]">Tarian yang sedang dipelajari</h2>
          <div className="mt-4 space-y-4">
            {cloudAttempts.isLoading && status === 'authed' && !demo ? <SkeletonList rows={2} className="h-32" /> : perDance.size === 0 ? (
              <EmptyState icon="play" title="Belum ada latihan" action={<Link to="/#daerah" className="tombol-utama">Pilih tarian</Link>}>
                {local.wantToLearn.length ? `Kamu ingin belajar ${local.wantToLearn.map(danceName).join(', ')}.` : 'Mulai dari bab pertama tarian pilihanmu.'}
              </EmptyState>
            ) : [...perDance.entries()].map(([danceId, steps]) => <DanceProgressCard key={danceId} danceId={danceId} name={danceName(danceId)} best={steps} />)}
          </div>
        </section>
        <section aria-labelledby="judul-tes">
          <h2 id="judul-tes" className="text-[22px]">Riwayat tes akhir</h2>
          <div className="mt-4">
            {tests.length === 0 ? <EmptyState icon="trophy" title="Belum ada tes akhir">Luluskan semua bab sebuah tarian untuk membuka tes akhir.</EmptyState> : (
              <ol className="space-y-2.5">{tests.map((t) => <TestRow key={t.key} t={t} name={danceName(t.danceId)} />)}</ol>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function DanceProgressCard({ danceId, name, best }: { danceId: string; name: string; best: Map<string, number> }) {
  const rank = useMyRank(danceId);
  const steps = [...best.entries()];
  const passed = steps.filter(([, s]) => s >= PASS_SCORE).length;
  return (
    <article className="overflow-hidden rounded-kartu border border-mori-tua bg-white/70">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-[20px]">{name}</h3>
          <span className="chip bg-pendar/12 text-pendar-teks">{passed} bab lulus</span>
          {rank.data?.rank && <span className="chip bg-prada/20 text-prada-teks">Peringkat #{rank.data.rank}</span>}
          <Link to={`/tarian/${danceId}`} className="tombol-teks ml-auto">Lanjutkan<Icon name="arrow" size={16} /></Link>
        </div>
        <ul className="mt-3 space-y-1.5">
          {steps.map(([stepId, score]) => (
            <li key={stepId} className="flex items-center justify-between text-[14px]">
              <span className="truncate text-muted">{LOCAL_STEPS.find((s) => s.id === stepId)?.name ?? `Bab ${stepId.slice(0, 6)}`}</span>
              <span className="flex items-center gap-2"><span className={`text-[12px] font-bold ${score >= PASS_SCORE ? 'text-pendar-teks' : 'text-perbaiki-teks'}`}>{score >= PASS_SCORE ? 'Lulus' : 'Belum'}</span><b className="angka">{score}</b></span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function TestRow({ t, name }: { t: { score: number; at: string; eligible: boolean; submitted: boolean; local: null | { danceId: string; perStep: Record<string, number>; wiraga: number; wirama: number; at: string } }; name: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const mark = useProgress((s) => s.markTestSubmitted);
  const qc = useQueryClient();
  const send = async () => {
    if (!t.local) return;
    setState('sending');
    try {
      // Hasil tes yang belum terkirim tidak menyimpan rasio orang & status contoh; dianggap tidak eligible oleh server bila datanya tidak lengkap.
      const r = await submitTest({ dance_id: t.local.danceId, per_step: t.local.perStep, wiraga: t.local.wiraga, wirama: t.local.wirama, crowd_ratio: 0, example_visible: false });
      mark(t.local.at);
      setMsg(r.queued ? 'Diantrikan' : r.rank ? `Peringkat #${r.rank}` : 'Terkirim');
      setState('done');
      void qc.invalidateQueries({ queryKey: ['my-tests'] });
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Gagal'); setState('error'); }
  };
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-[16px] border border-mori-tua bg-mori p-3.5">
      <div className="min-w-0 flex-1">
        <div className="font-bold">{name}</div>
        <div className="text-[14px] text-muted">{new Date(t.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}. {t.submitted ? (t.eligible ? 'Masuk papan skor' : 'Tidak masuk papan skor') : 'Belum dikirim'}</div>
      </div>
      <span className="angka text-[22px]">{t.score}</span>
      {!t.submitted && state !== 'done' && <button type="button" className="tombol-utama min-h-[44px] px-3 text-[14px]" onClick={send} disabled={state === 'sending'}>{state === 'sending' ? 'Mengirim…' : 'Kirim'}</button>}
      {msg && <span className={`w-full text-[14px] ${state === 'error' ? 'text-perbaiki-teks' : 'text-pendar-teks'}`} role="status">{msg}</span>}
    </li>
  );
}
