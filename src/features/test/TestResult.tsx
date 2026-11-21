import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { MatchChart, Meter, Modal, scoreTone } from '../../components/ui';
import { submitTest, type SubmitTestResult } from '../../lib/queries';
import { useProgress } from '../../lib/progress';
import { ApiError } from '../../lib/supabase';
import type { Tip } from '../../pose/types';
import { useAuth } from '../auth/authStore';
import { LeaderboardTabs } from '../leaderboard/LeaderboardTabs';

export interface TestOutcome {
  danceId: string;
  danceName: string;
  score: number;
  wiraga: number;
  wirama: number;
  perStep: { id: string; name: string; score: number }[];
  curve: number[];
  tips: (Tip & { stepName: string })[];
  crowdRatio: number;
  exampleVisible: boolean;
}

export function TestResult({ outcome, onRetry }: { outcome: TestOutcome; onRetry: () => void }) {
  const { status, profile, emailConfirmed } = useAuth();
  const addTest = useProgress((s) => s.addTest);
  const qc = useQueryClient();
  const loc = useLocation();
  const [loginModal, setLoginModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<SubmitTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt] = useState(() => {
    const at = new Date().toISOString();
    addTest({ danceId: outcome.danceId, score: outcome.score, wiraga: outcome.wiraga, wirama: outcome.wirama, perStep: Object.fromEntries(outcome.perStep.map((s) => [s.id, s.score])), at, eligible: false, submitted: false });
    return at;
  });
  const markSubmitted = useProgress((s) => s.markTestSubmitted);
  const crowded = outcome.crowdRatio >= 0.15;
  const ineligibleReason = outcome.exampleVisible ? 'Contoh ditampilkan selama tes, jadi skor ini tidak masuk papan skor.' : crowded ? 'Terdeteksi lebih dari satu orang di kamera, jadi skor ini tidak masuk papan skor.' : null;

  const send = async () => {
    if (status !== 'authed') { setLoginModal(true); return; }
    setSending(true); setError(null);
    try {
      const res = await submitTest({
        dance_id: outcome.danceId,
        per_step: Object.fromEntries(outcome.perStep.map((s) => [s.id, s.score])),
        wiraga: outcome.wiraga, wirama: outcome.wirama,
        crowd_ratio: Number(outcome.crowdRatio.toFixed(3)),
        example_visible: outcome.exampleVisible,
      });
      setSent(res);
      markSubmitted(savedAt);
      void qc.invalidateQueries({ queryKey: ['leaderboard', outcome.danceId] });
      void qc.invalidateQueries({ queryKey: ['my-rank', outcome.danceId] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Skor gagal dikirim. Coba lagi.');
    } finally { setSending(false); }
  };

  const n = outcome.perStep.length;
  return (
    <main className="pb-10">
      <section className="wadah pt-8">
        <div className="grid gap-8 rounded-kartu bg-nila p-8 text-mori sm:p-12 md:grid-cols-[auto_1fr] md:items-center">
          <div className="text-center md:text-left">
            <p className="text-[15px] font-bold text-prada">Tes akhir {outcome.danceName}</p>
            <div className="angka mt-2 text-[96px] leading-none sm:text-[120px]" aria-label={`Skor ${outcome.score} dari 100`}>{outcome.score}</div>
            <span className="mt-1 block font-jawa text-[14px] text-prada/80" aria-hidden>ꦲꦺꦴꦧꦃꦲꦚꦂ</span>
          </div>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Meter dark label="Wiraga" value={outcome.wiraga} hint="Ketepatan gerak" />
              <Meter dark label="Wirama" value={outcome.wirama} hint="Ketepatan irama" />
            </div>
            <p className="text-[16px] text-muted-gelap" aria-live="polite">
              {sent?.rank ? <>Posisimu di papan skor: <b className="angka text-[22px] text-prada">#{sent.rank}</b></> :
                sent?.queued ? 'Kamu sedang offline. Skor diantrikan dan dikirim otomatis saat online.' :
                sent ? (sent.reason ?? (sent.eligible ? 'Skor terkirim.' : 'Skor tersimpan di riwayatmu, tapi tidak masuk papan skor.')) :
                'Kirim skor untuk melihat posisimu di papan skor.'}
            </p>
          </div>
        </div>
      </section>

      <div className="wadah mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-8 min-w-0">
          <section>
            <h2 className="text-[22px]">Skor per gerak</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {outcome.perStep.map((s, i) => {
                const tone = scoreTone(s.score);
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-[16px] border border-mori-tua bg-white/70 p-3.5">
                    <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-nila text-mori angka">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
                    <span className={`angka text-[20px] ${tone === 'perbaiki' ? 'text-perbaiki-teks' : 'text-pendar-teks'}`}>{s.score}</span>
                  </li>
                );
              })}
            </ol>
          </section>
          <section>
            <h2 className="text-[22px]">Kecocokan sepanjang tes</h2>
            <div className="mt-4 kartu p-4"><MatchChart values={outcome.curve} markers={outcome.perStep.slice(1).map((_, i) => ({ at: (i + 1) / n, label: '' }))} /></div>
          </section>
          <section>
            <h2 className="text-[22px]">Koreksi utama</h2>
            {outcome.tips.length === 0 ? <p className="mt-3 text-muted">Tidak ada koreksi besar. Gerakmu sudah rapi.</p> : (
              <ul className="mt-4 space-y-2.5">
                {outcome.tips.map((t) => (
                  <li key={t.stepName + t.count + t.key} className="flex gap-3 rounded-[10px] border border-mori-tua bg-mori p-3.5">
                    <span className={`h-fit rounded-[8px] px-2 py-1 label-kecil ${t.severity === 'perbaiki' ? 'bg-perbaiki text-mori' : 'bg-hampir text-nila'}`}>{t.severity === 'perbaiki' ? 'Perbaiki' : 'Hampir'}</span>
                    <div>
                      <div className="label-kecil text-soga">{t.stepName}, hitungan {t.count}</div>
                      <p className="font-semibold">{t.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="kartu p-5">
            {ineligibleReason ? (
              <p className="flex gap-2 rounded-[10px] bg-hampir/15 p-3 text-[14px] font-semibold text-hampir-teks"><Icon name="info" size={18} className="shrink-0" />{ineligibleReason}</p>
            ) : null}
            {status === 'authed' && !emailConfirmed && <p className="mt-3 text-[14px] text-perbaiki-teks">Verifikasi emailmu dulu agar skor bisa dikirim.</p>}
            <button type="button" className="tombol-utama mt-3 w-full min-h-[52px]" onClick={send} disabled={sending || Boolean(sent) || (status === 'authed' && !emailConfirmed)}>
              <Icon name={sent ? 'check' : 'trophy'} size={18} />{sent ? 'Terkirim' : sending ? 'Mengirim…' : 'Kirim ke papan skor'}
            </button>
            <p className="mt-3 text-[14px] text-muted">
              {profile ? <>Nama yang tampil: <b className="text-nila">{profile.display_name}</b>. </> : null}
              Hanya nama dan skor yang disimpan, tanpa video.
            </p>
            {error && <p className="galat-form" role="alert">{error}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="tombol-garis" onClick={onRetry}><Icon name="refresh" size={18} />Ulangi tes</button>
              <Link to={`/tarian/${outcome.danceId}`} className="tombol-garis">Daftar bab</Link>
            </div>
          </div>
          <div className="kartu p-5">
            <h2 className="text-[18px]">Papan skor {outcome.danceName}</h2>
            <div className="mt-4"><LeaderboardTabs danceId={outcome.danceId} limit={10} /></div>
          </div>
        </aside>
      </div>

      <Modal open={loginModal} onClose={() => setLoginModal(false)} title="Masuk dulu untuk menyimpan skormu">
        <p className="text-[15px] text-muted">Latihan tetap bisa tanpa akun. Untuk masuk papan skor, skormu perlu dikaitkan dengan nama tampilan di akunmu. Hasil tes ini tersimpan di perangkat sementara kamu masuk.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link to={`/masuk?lanjut=${encodeURIComponent(loc.pathname)}`} className="tombol-utama flex-1">Masuk</Link>
          <Link to={`/daftar?lanjut=${encodeURIComponent(loc.pathname)}`} className="tombol-garis flex-1">Daftar gratis</Link>
        </div>
      </Modal>
    </main>
  );
}
