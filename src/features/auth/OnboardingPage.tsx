import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '../../components/Icon';
import { useDances } from '../../lib/queries';
import { useProgress } from '../../lib/progress';
import { ApiError, callFunction, supabase } from '../../lib/supabase';
import { useAuth } from './authStore';
import { Field } from './AuthPages';
import { inviteCodeSchema, sanggarSchema, type SanggarInput } from './schemas';
import type { UserRole } from '../../types/database.types';
import type { z } from 'zod';

export function OnboardingPage() {
  const { profile, sanggar, demo, setProfileLocal, setSanggarLocal, refreshProfile } = useAuth();
  const nav = useNavigate();
  const dances = useDances();
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>(profile?.role === 'admin' ? 'pelajar' : (profile?.role as 'pelajar') ?? 'pelajar');
  const [picked, setPicked] = useState<string[]>(useProgress.getState().wantToLearn);
  const [school, setSchool] = useState(profile?.school_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sanggarMode, setSanggarMode] = useState<'baru' | 'gabung'>('baru');
  const setWant = useProgress((s) => s.setWantToLearn);

  const finish = async () => {
    setSaving(true); setError(null);
    try {
      if (!demo && supabase) {
        const { error: e } = await supabase.rpc('complete_onboarding', { p_role: role, p_school_name: role === 'guru' ? school.trim() || null : null });
        if (e) throw new ApiError('onboarding', 'Gagal menyimpan. Coba lagi.');
        await refreshProfile();
      } else setProfileLocal({ role, school_name: role === 'guru' ? school : null, onboarded: true });
      setWant(picked);
      if (role === 'pelajar') nav(picked[0] ? `/tarian/${picked[0]}` : '/#daerah', { replace: true });
      else if (role === 'guru') nav('/#daerah', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan. Coba lagi.');
    } finally { setSaving(false); }
  };

  return (
    <main className="wadah max-w-3xl py-12">
      <span className="label-kecil text-soga">Selamat datang{profile ? `, ${profile.display_name}` : ''}</span>
      <h1 className="mt-2 text-[34px]">Atur akunmu</h1>
      <p className="mt-2 text-muted">Sekali saja. Bisa diubah lagi lewat Pengaturan.</p>

      <fieldset className="mt-8">
        <legend className="text-[16px] font-bold">Kamu bergabung sebagai</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {([['pelajar', 'Pelajar', 'Belajar tari dari rumah'], ['maestro', 'Sanggar–Maestro', 'Merekam gerak acuan'], ['guru', 'Guru', 'Bahan ekskul tari']] as const).map(([v, t, d]) => (
            <label key={v} className="flex cursor-pointer flex-col rounded-[16px] border border-mori-tua bg-mori p-4 has-[:checked]:border-nila has-[:checked]:ring-2 has-[:checked]:ring-prada/50">
              <input type="radio" name="peran" className="sr-only" checked={role === v} onChange={() => setRole(v)} disabled={Boolean(profile?.onboarded) || (v === 'maestro' && profile?.is_minor)} />
              <span className="font-bold">{t}</span><span className="text-[14px] text-muted">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {role === 'pelajar' && (
        <section className="mt-8">
          <h2 className="text-[18px]">Tarian yang ingin kamu pelajari</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {dances.data?.map((d) => {
              const on = picked.includes(d.id);
              return (
                <button key={d.id} type="button" aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== d.id) : [...p, d.id]))}
                  className={`min-h-[44px] rounded-full px-4 text-[14px] font-bold ${on ? 'bg-nila text-mori' : 'border border-mori-tua bg-mori'}`}>
                  {on && <Icon name="check" size={14} className="mr-1 inline" />}{d.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {role === 'guru' && (
        <section className="mt-8 max-w-md">
          <label htmlFor="sekolah" className="block text-[14px] font-bold">Nama sekolah <span className="font-normal text-muted">(opsional)</span></label>
          <input id="sekolah" className="input mt-1.5" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={100} />
        </section>
      )}

      {role !== 'maestro' && (
        <div className="mt-8">
          {error && <p className="galat-form mb-3" role="alert">{error}</p>}
          <button type="button" className="tombol-utama min-h-[50px] px-8" onClick={finish} disabled={saving}>{saving ? 'Menyimpan…' : 'Selesai'}</button>
        </div>
      )}

      {role === 'maestro' && (
        <section className="mt-8">
          {sanggar ? (
            <div className="rounded-kartu border border-mori-tua bg-white/70 p-6">
              <span className={`chip ${sanggar.verified ? 'bg-pendar/12 text-pendar-teks' : 'bg-hampir/20 text-hampir-teks'}`}>{sanggar.verified ? 'Terverifikasi' : 'Menunggu verifikasi admin'}</span>
              <h2 className="mt-3 text-[22px]">{sanggar.name}</h2>
              <p className="mt-1 text-muted">{sanggar.verified ? 'Mode Maestro sudah terbuka.' : 'Kami kirim email begitu sanggarmu diverifikasi. Sementara itu kamu tetap bisa berlatih.'}</p>
              <button type="button" className="tombol-utama mt-5" onClick={async () => { await finish(); nav(sanggar.verified ? '/maestro' : '/sanggar'); }}>{sanggar.verified ? 'Buka Mode Maestro' : 'Lihat status sanggar'}</button>
            </div>
          ) : (
            <>
              <div className="flex gap-1 rounded-[10px] bg-nila/5 p-1" role="tablist">
                {([['baru', 'Daftarkan sanggar baru'], ['gabung', 'Gabung dengan kode undangan']] as const).map(([v, t]) => (
                  <button key={v} type="button" role="tab" aria-selected={sanggarMode === v} onClick={() => setSanggarMode(v)} className={`min-h-[44px] flex-1 rounded-[10px] px-3 text-[14px] font-bold ${sanggarMode === v ? 'bg-mori shadow-sm' : 'text-muted'}`}>{t}</button>
                ))}
              </div>
              <div className="mt-5">
                {sanggarMode === 'baru' ? <CreateSanggarForm onDone={async (s) => { setSanggarLocal(s); await finish(); }} demo={demo} /> : <JoinSanggarForm onDone={async (s) => { setSanggarLocal(s); await finish(); }} demo={demo} />}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

type Done = (s: { id: string; name: string; verified: boolean; role: 'pemilik' | 'maestro' | 'murid'; invite_code?: string }) => Promise<void>;

function CreateSanggarForm({ onDone, demo }: { onDone: Done; demo: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SanggarInput>({ resolver: zodResolver(sanggarSchema) });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      if (demo) { await onDone({ id: 'demo-sanggar', name: v.name, verified: false, role: 'pemilik', invite_code: 'DEMO1234' }); return; }
      const r = await callFunction<{ sanggar: { id: string; name: string; invite_code: string } }>('create-sanggar', v);
      await onDone({ id: r.sanggar.id, name: r.sanggar.name, verified: false, role: 'pemilik', invite_code: r.sanggar.invite_code });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal mendaftarkan sanggar.'); }
  });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Nama sanggar" error={errors.name?.message}>{(id, d) => <input id={id} className="input" aria-invalid={Boolean(errors.name)} aria-describedby={d} {...register('name')} />}</Field></div>
      <Field label="Kota" error={errors.city?.message}>{(id, d) => <input id={id} className="input" aria-invalid={Boolean(errors.city)} aria-describedby={d} {...register('city')} />}</Field>
      <Field label="Provinsi" error={errors.province?.message}>{(id, d) => <input id={id} className="input" aria-invalid={Boolean(errors.province)} aria-describedby={d} {...register('province')} />}</Field>
      <div className="sm:col-span-2"><Field label="Deskripsi singkat" error={errors.description?.message}>{(id, d) => <textarea id={id} rows={3} className="input py-3" aria-describedby={d} {...register('description')} />}</Field></div>
      <div className="sm:col-span-2"><Field label="Email kontak sanggar" error={errors.contact_email?.message}>{(id, d) => <input id={id} type="email" className="input" aria-invalid={Boolean(errors.contact_email)} aria-describedby={d} {...register('contact_email')} />}</Field></div>
      <div className="sm:col-span-2">
        {err && <p className="galat-form mb-3" role="alert">{err}</p>}
        <button type="submit" className="tombol-utama min-h-[50px]" disabled={isSubmitting}>{isSubmitting ? 'Mengirim…' : 'Ajukan verifikasi'}</button>
        <p className="mt-2 text-[14px] text-muted">Status setelah dikirim: Menunggu verifikasi admin.</p>
      </div>
    </form>
  );
}

function JoinSanggarForm({ onDone, demo }: { onDone: Done; demo: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof inviteCodeSchema>>({ resolver: zodResolver(inviteCodeSchema) });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      if (demo) { await onDone({ id: 'demo-sanggar', name: '[Nama sanggar]', verified: true, role: 'maestro' }); return; }
      const r = await callFunction<{ sanggar: { id: string; name: string; verified: boolean }; role: 'maestro' | 'murid' }>('join-sanggar', v);
      await onDone({ id: r.sanggar.id, name: r.sanggar.name, verified: r.sanggar.verified, role: r.role });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Kode tidak valid.'); }
  });
  return (
    <form onSubmit={submit} noValidate className="max-w-sm space-y-4">
      <Field label="Kode undangan" error={errors.invite_code?.message} hint="8 huruf/angka dari pemilik sanggar.">
        {(id, d) => <input id={id} className="input uppercase tracking-[0.2em]" autoComplete="off" maxLength={8} aria-invalid={Boolean(errors.invite_code)} aria-describedby={d} {...register('invite_code')} />}
      </Field>
      {err && <p className="galat-form" role="alert">{err}</p>}
      <button type="submit" className="tombol-utama min-h-[50px]" disabled={isSubmitting}>{isSubmitting ? 'Memeriksa…' : 'Gabung'}</button>
    </form>
  );
}
