import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { EmptyState, SkeletonList, StatusChip } from '../../components/ui';
import { ApiError, callFunction, supabase } from '../../lib/supabase';
import { useAuth } from '../auth/authStore';

type Tab = 'sanggar' | 'gerak' | 'nama' | 'laporan';

function useAdminList<T>(key: string, enabled: boolean, fn: () => PromiseLike<{ data: unknown; error: unknown }>) {
  return useQuery({ queryKey: ['admin', key], enabled: Boolean(supabase) && enabled, queryFn: async () => { const { data, error } = await fn(); if (error) throw error; return data as T[]; } });
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('sanggar');
  const demo = useAuth((s) => s.demo);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sanggar = useAdminList<{ id: string; name: string; city: string; province: string; contact_email: string; created_at: string }>('sanggar', tab === 'sanggar' && !demo, () => supabase!.from('sanggar').select('id,name,city,province,contact_email,created_at').is('verified_at', null).order('created_at'));
  const steps = useAdminList<{ id: string; name: string; dance_id: string; recorded_by_label: string; consent_id: string | null; duration_ms: number }>('gerak', tab === 'gerak' && !demo, () => supabase!.from('steps').select('id,name,dance_id,recorded_by_label,consent_id,duration_ms').eq('status', 'ditinjau').order('created_at'));
  const names = useAdminList<{ id: string; display_name: string; created_at: string }>('nama', tab === 'nama' && !demo, () => supabase!.from('profiles').select('id,display_name,created_at').order('created_at', { ascending: false }).limit(50));
  const reports = useAdminList<{ id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string }>('laporan', tab === 'laporan' && !demo, () => supabase!.from('reports').select('*').eq('status', 'baru').order('created_at'));

  const run = async (id: string, key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg(ok); await qc.invalidateQueries({ queryKey: ['admin', key] }); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Aksi gagal.'); }
    finally { setBusy(null); }
  };

  const tabs: [Tab, string, string][] = [['sanggar', 'Verifikasi sanggar', 'shield'], ['gerak', 'Tinjau gerak', 'camera'], ['nama', 'Moderasi nama', 'user'], ['laporan', 'Laporan konten', 'flag']];
  const loading = { sanggar: sanggar.isLoading, gerak: steps.isLoading, nama: names.isLoading, laporan: reports.isLoading }[tab];

  return (
    <main className="wadah py-10">
      <span className="label-kecil text-soga">Admin Obah Anyar</span>
      <h1 className="mt-2 text-[34px]">Moderasi</h1>
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-[10px] bg-nila/5 p-1" role="tablist">
        {tabs.map(([v, t, i]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-[10px] px-4 text-[14px] font-bold ${tab === v ? 'bg-mori shadow-sm' : 'text-muted'}`}><Icon name={i} size={16} />{t}</button>
        ))}
      </div>
      <p className="mt-3 min-h-[24px] text-[14px] font-semibold text-pendar-teks" role="status" aria-live="polite">{msg}</p>

      <section className="mt-2" role="tabpanel">
        {demo ? <EmptyState icon="info" title="Mode demo">Daftar moderasi tampil setelah Supabase terhubung dan akunmu diberi peran admin lewat SQL.</EmptyState> : loading ? <SkeletonList rows={4} /> : (
          <>
            {tab === 'sanggar' && (sanggar.data?.length ? (
              <ul className="space-y-3">{sanggar.data.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-mori-tua bg-mori p-4">
                  <div className="min-w-0 flex-1"><div className="font-bold">{s.name}</div><div className="text-[14px] text-muted">{s.city}, {s.province}. Kontak: {s.contact_email}</div></div>
                  <button type="button" className="tombol-utama min-h-[44px] px-3 text-[14px]" disabled={busy === s.id} onClick={() => run(s.id, 'sanggar', () => callFunction('verify-sanggar', { sanggar_id: s.id, decision: 'verifikasi' }), `${s.name} diverifikasi.`)}>Verifikasi</button>
                  <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" disabled={busy === s.id} onClick={() => run(s.id, 'sanggar', () => callFunction('verify-sanggar', { sanggar_id: s.id, decision: 'tolak' }), `${s.name} ditolak.`)}>Tolak</button>
                </li>))}</ul>
            ) : <EmptyState icon="shield" title="Tidak ada sanggar menunggu verifikasi" />)}

            {tab === 'gerak' && (steps.data?.length ? (
              <ul className="space-y-3">{steps.data.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-mori-tua bg-mori p-4">
                  <div className="min-w-0 flex-1"><div className="font-bold">{s.name}</div><div className="text-[14px] text-muted">{s.dance_id}, oleh {s.recorded_by_label}, {(s.duration_ms / 1000).toFixed(1)} detik</div></div>
                  <StatusChip tone={s.consent_id ? 'tepat' : 'perbaiki'}>{s.consent_id ? 'Ada persetujuan' : 'Tanpa persetujuan'}</StatusChip>
                  <button type="button" className="tombol-utama min-h-[44px] px-3 text-[14px]" disabled={busy === s.id} onClick={() => run(s.id, 'gerak', () => callFunction('publish-step', { step_id: s.id }), `${s.name} diterbitkan.`)}>Terbitkan</button>
                  <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" disabled={busy === s.id} onClick={() => run(s.id, 'gerak', async () => { const { error } = await supabase!.from('steps').update({ status: 'ditolak' }).eq('id', s.id); if (error) throw error; }, `${s.name} ditolak.`)}>Tolak</button>
                </li>))}</ul>
            ) : <EmptyState icon="camera" title="Tidak ada gerak menunggu tinjauan" />)}

            {tab === 'nama' && (names.data?.length ? (
              <ul className="divide-y divide-mori-tua rounded-[16px] border border-mori-tua bg-mori">{names.data.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3.5">
                  <span className="flex-1 font-semibold">{p.display_name}</span>
                  <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" disabled={busy === p.id} onClick={() => run(p.id, 'nama', async () => { const { error } = await supabase!.rpc('admin_reset_display_name', { p_profile: p.id }); if (error) throw error; }, 'Nama direset.')}>Reset nama</button>
                </li>))}</ul>
            ) : <EmptyState icon="user" title="Belum ada pengguna" />)}

            {tab === 'laporan' && (reports.data?.length ? (
              <ul className="space-y-3">{reports.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-mori-tua bg-mori p-4">
                  <div className="min-w-0 flex-1"><div className="label-kecil text-soga">{r.target_type} {r.target_id.slice(0, 8)}</div><p className="font-semibold">{r.reason}</p></div>
                  <button type="button" className="tombol-garis min-h-[44px] px-3 text-[14px]" disabled={busy === r.id} onClick={() => run(r.id, 'laporan', async () => { const { error } = await supabase!.from('reports').update({ status: 'selesai' }).eq('id', r.id); if (error) throw error; }, 'Laporan ditandai selesai.')}>Tandai selesai</button>
                </li>))}</ul>
            ) : <EmptyState icon="flag" title="Tidak ada laporan baru" />)}
          </>
        )}
      </section>
    </main>
  );
}
