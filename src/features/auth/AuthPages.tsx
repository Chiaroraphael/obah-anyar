import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '../../components/Icon';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from './authStore';
import { captchaEnabled, Turnstile } from './Turnstile';
import { loginSchema, newPasswordSchema, passwordStrength, registerSchema, resetRequestSchema, type RegisterInput } from './schemas';
import type { z } from 'zod';

/** Terjemahan galat Supabase Auth ke Bahasa Indonesia. */
export function authErrorText(msg: string | undefined): string {
  const m = (msg ?? '').toLowerCase();
  if (m.includes('invalid login')) return 'Email atau kata sandi salah.';
  if (m.includes('email not confirmed')) return 'Email belum diverifikasi. Cek kotak masukmu untuk tautan konfirmasi.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (m.includes('captcha')) return 'Verifikasi CAPTCHA gagal. Coba lagi.';
  if (m.includes('pwned') || m.includes('leaked') || m.includes('weak')) return 'Kata sandi ini pernah bocor di internet. Pilih kata sandi lain.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Terlalu banyak percobaan. Tunggu beberapa menit.';
  if (m.includes('network') || m.includes('fetch')) return 'Tidak bisa terhubung ke server. Periksa koneksimu.';
  return 'Terjadi kesalahan. Coba lagi.';
}

export function safeNext(v: string | null): string {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : '/';
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-[calc(100dvh-64px)] lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="hidden border-r border-garis bg-sumur p-16 lg:flex lg:flex-col lg:justify-center">
        <p className="judul-display max-w-[14ch] text-[52px]">Latihan tetap bisa tanpa akun.</p>
        <dl className="mt-10 max-w-md divide-y divide-garis border-y border-garis">
          {[
            ['Papan skor', 'Skor tes akhir tercatat dengan nama tampilanmu.'],
            ['Kemajuan di cloud', 'Bagian yang sudah lulus ikut pindah ke perangkat lain.'],
            ['Mode Maestro', 'Untuk sanggar yang merekam gerak acuan.'],
          ].map(([t, d]) => (
            <div key={t} className="py-5">
              <dt className="text-[17px] font-extrabold">{t}</dt>
              <dd className="mt-1 text-[15px] text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <h1 className="judul-display text-[44px]">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] text-muted">{subtitle}</div>}
          {!isSupabaseConfigured && <LocalModeNotice />}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-[15px] text-muted">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

function LocalModeNotice() {
  const enterDemo = useAuth((s) => s.enterDemo);
  const nav = useNavigate();
  const [params] = useSearchParams();
  return (
    <div className="mt-5 rounded-[16px] border border-hampir/50 bg-hampir/10 p-4 text-[14px]">
      <p className="font-bold text-hampir-teks">Mode lokal: server belum dikonfigurasi</p>
      <p className="mt-1 text-hampir-teks">Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env agar login berfungsi. Untuk melihat tampilan, masuk sebagai akun demo (tersimpan di tab ini saja):</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(['pelajar', 'maestro', 'admin'] as const).map((r) => (
          <button key={r} type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" onClick={() => { enterDemo(r); nav(safeNext(params.get('lanjut'))); }}>
            Demo {r === 'pelajar' ? 'Pelajar' : r === 'maestro' ? 'Maestro' : 'Admin'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: ReactNode; children: (id: string, describedBy?: string) => ReactNode; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  const errId = `${fid}-galat`;
  const hintId = `${fid}-hint`;
  return (
    <div>
      <label htmlFor={fid} className="mb-1.5 block text-[14px] font-bold">{label}</label>
      {children(fid, [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined)}
      {hint && <div id={hintId} className="mt-1.5 text-[14px] text-muted">{hint}</div>}
      <p id={errId} className="galat-form" role="alert" aria-live="polite">{error}</p>
    </div>
  );
}

function PasswordInput({ reg, id, describedBy, invalid, autoComplete }: { reg: UseFormRegisterReturn; id: string; describedBy?: string; invalid: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className="input pr-12" aria-invalid={invalid} aria-describedby={describedBy} autoComplete={autoComplete} {...reg} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-[10px] text-muted hover:text-nila" aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={show}>
        <Icon name={show ? 'eye-off' : 'eye'} size={20} />
      </button>
    </div>
  );
}

export function GoogleButton({ label, next }: { label: string; next?: string }) {
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    if (!supabase) { setErr('Server belum dikonfigurasi.'); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback?lanjut=${encodeURIComponent(next ?? '/')}` } });
    if (error) setErr(authErrorText(error.message));
  };
  return (
    <>
      <button type="button" onClick={go} className="tombol-garis w-full min-h-[50px]">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {label}
      </button>
      {err && <p className="galat-form" role="alert">{err}</p>}
    </>
  );
}

const Divider = () => (
  <div className="my-5 flex items-center gap-3 text-[14px] text-muted"><span className="h-px flex-1 bg-mori-tua" />atau<span className="h-px flex-1 bg-mori-tua" /></div>
);

function FormError({ text }: { text: string | null }) {
  return <div aria-live="assertive">{text && <p className="mb-4 flex gap-2 rounded-[10px] bg-perbaiki/10 p-3 text-[14px] font-semibold text-perbaiki-teks" role="alert"><Icon name="alert" size={18} className="shrink-0" />{text}</p>}</div>;
}

export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('lanjut'));
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(params.get('sesi') === 'habis' ? 'Sesimu sudah berakhir. Silakan masuk lagi.' : null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (!supabase) { setFormError('Server belum dikonfigurasi. Pakai akun demo di atas.'); return; }
    if (captchaEnabled && !captcha) { setFormError('Selesaikan verifikasi CAPTCHA dulu.'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password, options: { captchaToken: captcha ?? undefined } });
    if (error) { setFormError(authErrorText(error.message)); setResetKey((k) => k + 1); return; }
    nav(next, { replace: true });
  });

  return (
    <AuthShell title="Masuk" subtitle="Lanjutkan latihan dan simpan skormu." footer={<>Belum punya akun? <Link to={`/daftar${next !== '/' ? `?lanjut=${encodeURIComponent(next)}` : ''}`} className="font-bold text-nila underline underline-offset-4">Daftar</Link></>}>
      <GoogleButton label="Masuk dengan Google" next={next} />
      <Divider />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError text={formError} />
        <Field label="Email" error={errors.email?.message}>{(id, d) => <input id={id} type="email" className="input" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby={d} {...register('email')} />}</Field>
        <Field label="Kata sandi" error={errors.password?.message}>{(id, d) => <PasswordInput id={id} describedBy={d} invalid={Boolean(errors.password)} reg={register('password')} autoComplete="current-password" />}</Field>
        <div className="flex justify-end"><Link to="/lupa-sandi" className="text-[14px] font-bold underline-offset-4 hover:underline min-h-[44px] inline-flex items-center">Lupa kata sandi?</Link></div>
        <Turnstile onToken={setCaptcha} resetKey={resetKey} />
        <button type="submit" className="tombol-utama w-full min-h-[50px]" disabled={isSubmitting}>{isSubmitting ? 'Memproses…' : 'Masuk'}</button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('lanjut'));
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const preRole = params.get('peran');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: preRole === 'maestro' || preRole === 'guru' ? preRole : 'pelajar', age: '17+' },
  });
  const pw = watch('password') ?? '';
  const age = watch('age');
  const strength = passwordStrength(pw);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (!supabase) { setFormError('Server belum dikonfigurasi. Pakai akun demo di halaman Masuk.'); return; }
    if (captchaEnabled && !captcha) { setFormError('Selesaikan verifikasi CAPTCHA dulu.'); return; }
    const minor = v.age === '<17';
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        captchaToken: captcha ?? undefined,
        emailRedirectTo: `${location.origin}/auth/callback?lanjut=${encodeURIComponent('/onboarding')}`,
        data: { display_name: v.display_name, role: v.role, is_minor: minor, guardian_email: minor ? v.guardian_email : null, guardian_consent: minor ? Boolean(v.guardian_consent) : false },
      },
    });
    if (error) { setFormError(authErrorText(error.message)); setResetKey((k) => k + 1); return; }
    nav(`/cek-email?email=${encodeURIComponent(v.email)}&jenis=daftar`);
  });

  const roles = [
    { v: 'pelajar', t: 'Pelajar', d: 'Belajar tari dari rumah' },
    { v: 'maestro', t: 'Sanggar–Maestro', d: 'Merekam gerak acuan' },
    { v: 'guru', t: 'Guru', d: 'Bahan ekskul tari' },
  ];

  return (
    <AuthShell title="Daftar" subtitle="Gratis. Latihan tetap bisa tanpa akun." footer={<>Sudah punya akun? <Link to="/masuk" className="font-bold text-nila underline underline-offset-4">Masuk</Link></>}>
      <GoogleButton label="Daftar dengan Google" next="/onboarding" />
      <Divider />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError text={formError} />
        <Field label="Nama panggilan" error={errors.display_name?.message} hint="Tampil di papan skor. 3–24 karakter.">
          {(id, d) => <input id={id} className="input" autoComplete="nickname" aria-invalid={Boolean(errors.display_name)} aria-describedby={d} {...register('display_name')} />}
        </Field>
        <Field label="Email" error={errors.email?.message}>{(id, d) => <input id={id} type="email" className="input" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={d} {...register('email')} />}</Field>
        <Field label="Kata sandi" error={errors.password?.message} hint={
          pw ? (
            <span className="flex items-center gap-2">
              <span className="flex flex-1 gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength.score ? (strength.score >= 3 ? 'bg-pendar' : strength.score === 2 ? 'bg-hampir' : 'bg-perbaiki') : 'bg-mori-tua'}`} />)}</span>
              <span className="font-bold">{strength.label}</span>
            </span>
          ) : 'Minimal 8 karakter, berisi huruf dan angka.'
        }>
          {(id, d) => <PasswordInput id={id} describedBy={d} invalid={Boolean(errors.password)} reg={register('password')} autoComplete="new-password" />}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[14px] font-bold">Peran</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {roles.map((r) => (
              <label key={r.v} className="relative flex cursor-pointer flex-col rounded-[10px] border border-mori-tua bg-mori p-3 has-[:checked]:border-nila has-[:checked]:ring-2 has-[:checked]:ring-prada/50">
                <input type="radio" value={r.v} className="sr-only" {...register('role')} />
                <span className="text-[14px] font-bold">{r.t}</span>
                <span className="text-[12px] text-muted">{r.d}</span>
              </label>
            ))}
          </div>
          <p className="galat-form" role="alert">{errors.role?.message}</p>
          {watch('role') === 'maestro' && <p className="text-[14px] text-muted">Mode Maestro terbuka setelah sanggarmu diverifikasi admin.</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-[14px] font-bold">Usia</legend>
          <div className="flex gap-2">
            {(['17+', '<17'] as const).map((a) => (
              <label key={a} className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-mori-tua bg-mori text-[14px] font-bold has-[:checked]:border-nila has-[:checked]:bg-nila has-[:checked]:text-mori">
                <input type="radio" value={a} className="sr-only" {...register('age')} />{a === '17+' ? '17 tahun ke atas' : 'Di bawah 17 tahun'}
              </label>
            ))}
          </div>
        </fieldset>
        {age === '<17' && (
          <div className="space-y-3 rounded-[16px] border border-mori-tua bg-white/70 p-4">
            <p className="text-[14px] text-muted">Sesuai UU PDP, akun pengguna di bawah 17 tahun butuh persetujuan orang tua/wali. Alternatif: minta guru membuatkan akun.</p>
            <Field label="Email orang tua/wali" error={errors.guardian_email?.message}>{(id, d) => <input id={id} type="email" className="input" aria-invalid={Boolean(errors.guardian_email)} aria-describedby={d} {...register('guardian_email')} />}</Field>
            <label className="flex items-start gap-3 text-[14px]">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-nila" {...register('guardian_consent')} />
              Orang tua/wali saya sudah menyetujui pendaftaran ini.
            </label>
            <p className="galat-form" role="alert">{errors.guardian_consent?.message}</p>
          </div>
        )}
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-nila" aria-invalid={Boolean(errors.agree)} {...register('agree')} />
          <span>Saya menyetujui <Link to="/syarat" target="_blank" className="font-bold underline">Syarat & Ketentuan</Link> dan <Link to="/privasi" target="_blank" className="font-bold underline">Kebijakan Privasi</Link>.</span>
        </label>
        <p className="galat-form -mt-2" role="alert">{errors.agree?.message}</p>
        <Turnstile onToken={setCaptcha} resetKey={resetKey} />
        <button type="submit" className="tombol-utama w-full min-h-[50px]" disabled={isSubmitting}>{isSubmitting ? 'Memproses…' : 'Daftar'}</button>
        {next !== '/' && <input type="hidden" value={next} readOnly />}
      </form>
    </AuthShell>
  );
}

export function CheckEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email');
  const jenis = params.get('jenis');
  const [sent, setSent] = useState(false);
  const resend = async () => {
    if (!supabase || !email) return;
    await supabase.auth.resend({ type: 'signup', email });
    setSent(true);
  };
  return (
    <AuthShell title="Cek emailmu" subtitle={<>Kami mengirim tautan {jenis === 'reset' ? 'setel ulang kata sandi' : 'konfirmasi'} ke <b className="text-nila">{email ?? 'emailmu'}</b>.</>}>
      <div className="rounded-kartu border border-mori-tua bg-white/70 p-5">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-prada/20 text-soga"><Icon name="mail" /></span>
        <ol className="mt-4 space-y-2 text-[15px]">
          <li>1. Buka kotak masuk email (cek juga folder Spam/Promosi).</li>
          <li>2. Klik tautan dari Obah Anyar.</li>
          <li>3. Kamu akan kembali ke aplikasi dan langsung masuk.</li>
        </ol>
      </div>
      {jenis !== 'reset' && email && (
        <button type="button" className="tombol-garis mt-4 w-full" onClick={resend} disabled={sent}>{sent ? 'Email terkirim ulang' : 'Kirim ulang email'}</button>
      )}
      <Link to="/masuk" className="tombol-teks mt-3">Kembali ke Masuk</Link>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const nav = useNavigate();
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetRequestSchema>>({ resolver: zodResolver(resetRequestSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (!supabase) { setFormError('Server belum dikonfigurasi.'); return; }
    if (captchaEnabled && !captcha) { setFormError('Selesaikan verifikasi CAPTCHA dulu.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: `${location.origin}/setel-ulang-sandi`, captchaToken: captcha ?? undefined });
    if (error) { setFormError(authErrorText(error.message)); return; }
    nav(`/cek-email?email=${encodeURIComponent(v.email)}&jenis=reset`);
  });
  return (
    <AuthShell title="Lupa kata sandi" subtitle="Masukkan email akunmu. Kami kirim tautan untuk membuat kata sandi baru." footer={<Link to="/masuk" className="font-bold text-nila underline underline-offset-4">Kembali ke Masuk</Link>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError text={formError} />
        <Field label="Email" error={errors.email?.message}>{(id, d) => <input id={id} type="email" className="input" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={d} {...register('email')} />}</Field>
        <Turnstile onToken={setCaptcha} />
        <button type="submit" className="tombol-utama w-full min-h-[50px]" disabled={isSubmitting}>{isSubmitting ? 'Mengirim…' : 'Kirim tautan'}</button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const nav = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password: v.password });
    if (error) { setFormError(error.message.toLowerCase().includes('session') ? 'Tautan sudah kedaluwarsa. Minta tautan baru dari halaman Lupa kata sandi.' : authErrorText(error.message)); return; }
    setDone(true);
    setTimeout(() => nav('/'), 1500);
  });
  return (
    <AuthShell title="Buat kata sandi baru">
      {done ? <p className="rounded-[10px] bg-pendar/12 p-4 font-semibold text-pendar-teks" role="status">Kata sandi diperbarui. Mengalihkan…</p> : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError text={formError} />
          <Field label="Kata sandi baru" error={errors.password?.message} hint="Minimal 8 karakter, berisi huruf dan angka.">{(id, d) => <PasswordInput id={id} describedBy={d} invalid={Boolean(errors.password)} reg={register('password')} autoComplete="new-password" />}</Field>
          <Field label="Ulangi kata sandi" error={errors.confirm?.message}>{(id, d) => <PasswordInput id={id} describedBy={d} invalid={Boolean(errors.confirm)} reg={register('confirm')} autoComplete="new-password" />}</Field>
          <button type="submit" className="tombol-utama w-full min-h-[50px]" disabled={isSubmitting}>Simpan kata sandi</button>
        </form>
      )}
    </AuthShell>
  );
}

/** Tujuan redirect OAuth & tautan email. supabase-js menukar kode PKCE otomatis. */
export function AuthCallbackPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { status, profile } = useAuth();
  const [err] = useState(() => params.get('error_description'));
  useEffect(() => {
    if (err) return;
    if (status === 'authed' && profile) nav(profile.onboarded ? safeNext(params.get('lanjut')) : '/onboarding', { replace: true });
  }, [status, profile, nav, params, err]);
  return (
    <main className="wadah grid min-h-[50vh] place-items-center">
      {err ? (
        <div className="text-center"><p className="font-bold text-perbaiki-teks" role="alert">Tautan tidak valid atau sudah kedaluwarsa.</p><Link to="/masuk" className="tombol-utama mt-4">Ke halaman Masuk</Link></div>
      ) : <p className="denyut font-semibold" role="status">Memproses masuk…</p>}
    </main>
  );
}
