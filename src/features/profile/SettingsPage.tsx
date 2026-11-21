import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/Navbar';
import { Modal } from '../../components/ui';
import { useProgress } from '../../lib/progress';
import { ApiError, callFunction, supabase } from '../../lib/supabase';
import { useAuth } from '../auth/authStore';
import { displayNameSchema, newPasswordSchema } from '../auth/schemas';

function Section({ title, desc, children, danger }: { title: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-kartu border p-6 ${danger ? 'border-perbaiki/40 bg-perbaiki/[0.04]' : 'border-mori-tua bg-white/70'}`}>
      <h2 className={`text-[20px] ${danger ? 'text-perbaiki-teks' : ''}`}>{title}</h2>
      {desc && <p className="mt-1 text-[14px] text-muted">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) => (
  <p className={`mt-2 text-[14px] font-semibold ${m?.ok ? 'text-pendar-teks' : 'text-perbaiki-teks'}`} role="status" aria-live="polite">{m?.text}</p>
);

export function SettingsPage() {
  const { profile, userId, demo, setProfileLocal, refreshProfile, signOut } = useAuth();
  const clearLocal = useProgress((s) => s.clear);
  const nav = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState('');
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  if (!profile) return null;

  const saveName = async () => {
    const r = displayNameSchema.safeParse(name);
    if (!r.success) { setNameMsg({ ok: false, text: r.error.issues[0].message }); return; }
    try {
      if (demo) setProfileLocal({ display_name: r.data });
      else { await callFunction('moderate-name', { display_name: r.data }); await refreshProfile(); }
      setNameMsg({ ok: true, text: 'Nama panggilan disimpan.' });
    } catch (e) { setNameMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Gagal menyimpan.' }); }
  };

  const uploadAvatar = async (f: File | undefined) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setAvatarMsg({ ok: false, text: 'Format foto harus JPG, PNG, atau WebP.' }); return; }
    if (f.size > 2 * 1024 * 1024) { setAvatarMsg({ ok: false, text: 'Ukuran foto maksimal 2 MB.' }); return; }
    if (demo || !supabase || !userId) { setProfileLocal({ avatar_url: URL.createObjectURL(f) }); setAvatarMsg({ ok: true, text: 'Foto diperbarui (demo).' }); return; }
    const path = `${userId}/avatar-${Date.now()}.${f.type.split('/')[1]}`;
    const up = await supabase.storage.from('avatars').upload(path, f, { contentType: f.type, upsert: true });
    if (up.error) { setAvatarMsg({ ok: false, text: 'Foto gagal diunggah.' }); return; }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    if (error) { setAvatarMsg({ ok: false, text: 'Foto gagal disimpan.' }); return; }
    await refreshProfile();
    setAvatarMsg({ ok: true, text: 'Foto profil diperbarui.' });
  };

  const changePassword = async () => {
    const r = newPasswordSchema.safeParse(pw);
    if (!r.success) { setPwMsg({ ok: false, text: r.error.issues[0].message }); return; }
    if (!supabase || demo) { setPwMsg({ ok: false, text: 'Tidak tersedia di mode demo.' }); return; }
    const { error } = await supabase.auth.updateUser({ password: r.data.password });
    setPwMsg(error ? { ok: false, text: 'Kata sandi gagal diubah. Coba masuk ulang lalu ulangi.' } : { ok: true, text: 'Kata sandi diubah.' });
    if (!error) setPw({ password: '', confirm: '' });
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const data = demo ? { profil: profile, kemajuan_perangkat: useProgress.getState() } : await callFunction<unknown>('export-my-data', {});
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = `data-obah-anyar-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal mengunduh data.'); } finally { setExporting(false); }
  };

  const deleteAccount = async () => {
    if (delText !== 'HAPUS') { setDelMsg('Ketik HAPUS dengan huruf kapital untuk konfirmasi.'); return; }
    setDeleting(true); setDelMsg(null);
    try {
      if (!demo) await callFunction('delete-account', { confirm: 'HAPUS' });
      clearLocal();
      await signOut();
      nav('/', { replace: true });
    } catch (e) { setDelMsg(e instanceof ApiError ? e.message : 'Akun gagal dihapus.'); } finally { setDeleting(false); }
  };

  return (
    <main className="wadah max-w-3xl py-10">
      <h1 className="text-[34px]">Pengaturan akun</h1>
      <div className="mt-8 space-y-5">
        <Section title="Profil" desc="Nama panggilan tampil di papan skor.">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={profile.display_name} url={profile.avatar_url} size={64} />
            <label className="tombol-garis cursor-pointer"><Icon name="upload" size={18} />Ganti foto<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => uploadAvatar(e.target.files?.[0])} /></label>
            <span className="text-[14px] text-muted">JPG/PNG/WebP, maks. 2 MB</span>
          </div>
          <Msg m={avatarMsg} />
          <label htmlFor="nama" className="mt-4 block text-[14px] font-bold">Nama panggilan</label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input id="nama" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-describedby="nama-pesan" />
            <button type="button" className="tombol-sekunder" onClick={saveName}>Simpan</button>
          </div>
          <div id="nama-pesan"><Msg m={nameMsg} /></div>
        </Section>

        <Section title="Kata sandi & sesi">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="pw1" className="block text-[14px] font-bold">Kata sandi baru</label><input id="pw1" type="password" autoComplete="new-password" className="input mt-1.5" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></div>
            <div><label htmlFor="pw2" className="block text-[14px] font-bold">Ulangi</label><input id="pw2" type="password" autoComplete="new-password" className="input mt-1.5" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          </div>
          <button type="button" className="tombol-sekunder mt-3" onClick={changePassword}>Ubah kata sandi</button>
          <Msg m={pwMsg} />
          <div className="mt-5 border-t border-mori-tua pt-5">
            <button type="button" className="tombol-garis" onClick={async () => { await signOut(true); nav('/'); }}><Icon name="logout" size={18} />Keluar di semua perangkat</button>
          </div>
        </Section>

        <Section title="Unduh data saya" desc="Semua data milikmu dalam satu berkas JSON: profil, percobaan, tes akhir, keanggotaan sanggar.">
          <button type="button" className="tombol-garis" onClick={exportData} disabled={exporting}><Icon name="download" size={18} />{exporting ? 'Menyiapkan…' : 'Unduh data (JSON)'}</button>
        </Section>

        <Section title="Hapus akun" desc="Menghapus profil, semua percobaan, tes akhir, dan berkas milikmu. Tidak bisa dibatalkan." danger>
          <button type="button" className="tombol bg-perbaiki text-mori hover:bg-perbaiki-teks" onClick={() => setDelOpen(true)}><Icon name="trash" size={18} />Hapus akun saya</button>
        </Section>
      </div>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus akun secara permanen?">
        <p className="text-[15px] text-muted">Skor papan skor, kemajuan, dan profilmu akan dihapus. Gerak yang kamu rekam untuk sanggar tetap milik sanggar.</p>
        <label htmlFor="konfirmasi" className="mt-4 block text-[14px] font-bold">Ketik <b>HAPUS</b> untuk konfirmasi</label>
        <input id="konfirmasi" className="input mt-1.5" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" aria-describedby="hapus-galat" />
        <p id="hapus-galat" className="galat-form" role="alert">{delMsg}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="tombol flex-1 bg-perbaiki text-mori" onClick={deleteAccount} disabled={deleting || delText !== 'HAPUS'}>{deleting ? 'Menghapus…' : 'Hapus permanen'}</button>
          <button type="button" className="tombol-garis" onClick={() => setDelOpen(false)}>Batal</button>
        </div>
      </Modal>
    </main>
  );
}
