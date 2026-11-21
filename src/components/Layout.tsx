import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Footer, Navbar } from './Navbar';
import { Icon } from './Icon';
import { useAuth } from '../features/auth/authStore';
import { useProgress } from '../lib/progress';
import { flushQueue, pendingCount } from '../lib/offlineQueue';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function Banner({ tone, icon, children }: { tone: 'info' | 'warn' | 'error'; icon: string; children: React.ReactNode }) {
  const cls = tone === 'error' ? 'bg-perbaiki text-mori' : tone === 'warn' ? 'bg-hampir text-nila' : 'bg-nila text-mori';
  return (
    <div className={`${cls} text-[14px] font-semibold`} role="status">
      <div className="wadah flex min-h-[44px] items-start gap-3 py-2.5"><Icon name={icon} size={18} className="mt-0.5 shrink-0" /><span className="min-w-0 flex-1 [&_button]:ml-2 [&_a]:ml-1">{children}</span></div>
    </div>
  );
}

export function Layout() {
  const online = useOnline();
  const loc = useLocation();
  const { status, emailConfirmed, sessionExpired, demo, email, userId } = useAuth();
  const [queued, setQueued] = useState(pendingCount());
  const { attempts, migrationOffered, setMigrationOffered, markSynced } = useProgress();
  const unsynced = attempts.filter((a) => !a.synced).length;
  const [migrating, setMigrating] = useState(false);
  const [resent, setResent] = useState(false);
  const practice = /\/(bab|tes)/.test(loc.pathname);

  useEffect(() => {
    const u = () => setQueued(pendingCount());
    window.addEventListener('oa-antrean', u);
    return () => window.removeEventListener('oa-antrean', u);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const migrate = async () => {
    if (!supabase || !userId) return;
    setMigrating(true);
    const rows = attempts.filter((a) => !a.synced).map((a) => ({ profile_id: userId, step_id: a.stepId, score: a.score, wiraga: a.wiraga, wirama: a.wirama, coverage: a.coverage, speed: a.speed, created_at: a.at }));
    const { error } = await supabase.from('attempts').insert(rows);
    setMigrating(false);
    if (!error) markSynced();
    setMigrationOffered(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 tombol-utama">Lewati ke isi</a>
      {!online && <Banner tone="warn" icon="wifi-off">Kamu sedang offline. Tarian yang pernah dibuka tetap bisa dilatih; kiriman skor diantrikan sampai online.</Banner>}
      {online && queued > 0 && <Banner tone="info" icon="refresh">{queued} kiriman skor menunggu dikirim. <button type="button" className="underline" onClick={() => flushQueue()}>Kirim sekarang</button></Banner>}
      {sessionExpired && <Banner tone="error" icon="lock">Sesi kedaluwarsa. <Link to={`/masuk?sesi=habis&lanjut=${encodeURIComponent(loc.pathname)}`} className="underline">Masuk lagi</Link></Banner>}
      {status === 'authed' && !demo && !emailConfirmed && (
        <Banner tone="warn" icon="mail">Email belum diverifikasi. Cek kotak masuk {email}.
          <button type="button" className="underline" disabled={resent} onClick={async () => { if (email) await supabase?.auth.resend({ type: 'signup', email }); setResent(true); }}>{resent ? 'Terkirim' : 'Kirim ulang'}</button>
        </Banner>
      )}
      {status === 'authed' && !demo && unsynced > 0 && !migrationOffered && (
        <Banner tone="info" icon="upload">Ada {unsynced} percobaan tersimpan di perangkat ini. Pindahkan ke akunmu?
          <button type="button" className="underline" onClick={migrate} disabled={migrating}>{migrating ? 'Memindahkan…' : 'Pindahkan'}</button>
          <button type="button" className="underline opacity-80" onClick={() => setMigrationOffered(true)}>Nanti saja</button>
        </Banner>
      )}
      {!isSupabaseConfigured && !practice && <Banner tone="info" icon="info">Mode lokal: memakai data contoh tanpa server. {demo && 'Kamu masuk dengan akun demo.'}</Banner>}
      <Navbar />
      <div id="isi" className="flex-1">
        <Suspense fallback={<main className="wadah py-10" aria-busy="true"><div className="skeleton h-10 w-64" /><div className="skeleton mt-6 h-72" /></main>}>
          <Outlet />
        </Suspense>
      </div>
      {!practice && <Footer />}
    </div>
  );
}
