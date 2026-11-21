import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { EmptyState, SkeletonList, StatusChip } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/authStore';

interface Member { profile_id: string; role: string; joined_at: string; display_name: string }

/** Dasbor sanggar (tahap berikut): tampilan disiapkan, sebagian data menunggu view kemajuan murid. */
export function SanggarPage() {
  const { sanggar, demo } = useAuth();
  const [copied, setCopied] = useState(false);
  const members = useQuery({
    queryKey: ['sanggar-members', sanggar?.id],
    enabled: Boolean(supabase && sanggar && !demo),
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase!.rpc('get_sanggar_members', { p_sanggar: sanggar!.id });
      if (error) throw error;
      return data as Member[];
    },
  });
  const steps = useQuery({
    queryKey: ['sanggar-steps', sanggar?.id],
    enabled: Boolean(supabase && sanggar && !demo),
    queryFn: async () => {
      const { data, error } = await supabase!.from('steps').select('id, name, status, dance_id').eq('sanggar_id', sanggar!.id).order('dance_id');
      if (error) throw error;
      return data as { id: string; name: string; status: string; dance_id: string }[];
    },
  });
  if (!sanggar) return null;
  const isOwner = sanggar.role === 'pemilik';
  const copy = async () => { if (sanggar.invite_code) { await navigator.clipboard.writeText(sanggar.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const danceGroups = (steps.data ?? []).reduce<Record<string, number>>((m, s) => ({ ...m, [s.dance_id]: (m[s.dance_id] ?? 0) + 1 }), {});

  return (
    <main className="wadah py-10">
      <div className="overflow-hidden rounded-kartu bg-nila p-7 text-mori motif-kawung sm:p-9" style={{ ['--kawung-opasitas' as string]: 0.1 }}>
        <span className="label-kecil text-prada">Dasbor sanggar</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[32px] sm:text-[40px]">{sanggar.name}</h1>
          <StatusChip tone={sanggar.verified ? 'tepat' : 'hampir'} dark>{sanggar.verified ? 'Terverifikasi' : 'Menunggu verifikasi admin'}</StatusChip>
        </div>
        <p className="mt-2 text-muted-gelap">Peranmu: {sanggar.role === 'pemilik' ? 'Pemilik' : sanggar.role === 'maestro' ? 'Maestro' : 'Murid'}</p>
        {sanggar.verified && sanggar.role !== 'murid' && <Link to="/maestro" className="tombol-utama mt-5"><Icon name="camera" size={18} />Buka Mode Maestro</Link>}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="kartu p-6">
          <h2 className="text-[20px]">Anggota & kode undangan</h2>
          {isOwner && sanggar.invite_code && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] bg-nila/5 p-4">
              <div><div className="label-kecil text-soga">Kode undangan</div><div className="angka text-[26px] tracking-[0.2em]">{sanggar.invite_code}</div></div>
              <button type="button" className="tombol-garis ml-auto" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Tersalin' : 'Salin'}</button>
            </div>
          )}
          <div className="mt-4">
            {demo ? <p className="text-[14px] text-muted">Mode demo: daftar anggota tampil setelah server terhubung.</p> : members.isLoading ? <SkeletonList rows={3} className="h-12" /> : !members.data?.length ? (
              <EmptyState icon="users" title="Belum ada anggota lain">Bagikan kode undangan ke maestro dan murid sanggarmu.</EmptyState>
            ) : (
              <ul className="divide-y divide-mori-tua">
                {members.data.map((m) => (
                  <li key={m.profile_id} className="flex items-center justify-between py-3"><span className="font-semibold">{m.display_name}</span><span className="text-[14px] text-muted">{m.role}</span></li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="kartu p-6">
          <h2 className="text-[20px]">Tarian milik sanggar</h2>
          <div className="mt-4">
            {Object.keys(danceGroups).length === 0 ? <EmptyState icon="camera" title="Belum ada gerak terekam" action={sanggar.verified && sanggar.role !== 'murid' ? <Link to="/maestro" className="tombol-utama">Rekam gerak</Link> : undefined} /> : (
              <ul className="space-y-2">{Object.entries(danceGroups).map(([d, n]) => <li key={d} className="flex justify-between rounded-[10px] border border-mori-tua bg-mori p-3"><span className="font-bold capitalize">{d.replace('-', ' ')}</span><span className="text-[14px] text-muted">{n} gerak</span></li>)}</ul>
            )}
          </div>
        </section>

        <section className="kartu p-6">
          <h2 className="text-[20px]">Kemajuan murid per bab</h2>
          <p className="mt-2 text-[14px] text-muted">Tahap berikut. Akan menampilkan bab yang sudah lulus setiap murid sanggar (dibaca lewat view khusus pemilik/maestro, sesuai RLS).</p>
          <div className="mt-4 grid grid-cols-4 gap-2 opacity-60" aria-hidden>{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-8 rounded-[8px] bg-mori-tua/70" />)}</div>
        </section>
        <section className="rounded-kartu border-2 border-dashed border-mori-tua p-6">
          <h2 className="text-[20px]">Kelas daring</h2>
          <p className="mt-2 text-[14px] text-muted">Nanti: kelas berbayar dan penilaian wirasa oleh pelatih. Harga: [HARGA].</p>
        </section>
      </div>
    </main>
  );
}
