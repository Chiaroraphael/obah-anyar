import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardList } from '../../components/LeaderboardTable';
import { useLeaderboard, useMyRank, type LeaderboardPeriod } from '../../lib/queries';
import { useAuth } from '../auth/authStore';

const TABS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'minggu', label: 'Minggu ini' },
  { id: 'semua', label: 'Sepanjang masa' },
  { id: 'sanggarku', label: 'Sanggarku' },
];

export function LeaderboardTabs({ danceId, limit = 20, dark }: { danceId: string; limit?: number; dark?: boolean }) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('minggu');
  const q = useLeaderboard(danceId, period, limit);
  const rank = useMyRank(danceId);
  const { status, sanggar } = useAuth();
  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-[10px] bg-nila/5 p-1" role="tablist" aria-label="Periode papan skor">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={period === t.id} onClick={() => setPeriod(t.id)}
            className={`min-h-[44px] flex-1 rounded-[10px] px-3 text-[14px] font-bold ${period === t.id ? 'bg-mori text-nila shadow-sm' : 'text-muted hover:text-nila'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {status === 'authed' && rank.data?.rank && (
        <p className="mt-3 text-[14px] text-muted">Posisimu sepanjang masa: <b className="angka text-nila">#{rank.data.rank}</b> dengan skor <b className="angka text-nila">{rank.data.score}</b></p>
      )}
      <div className="mt-4" role="tabpanel">
        {period === 'sanggarku' && !sanggar ? (
          <div className={`rounded-kartu border border-dashed p-6 text-center text-[15px] ${dark ? 'border-white/15 text-muted-gelap' : 'border-mori-tua text-muted'}`}>
            {status === 'authed' ? 'Kamu belum bergabung dengan sanggar. Minta kode undangan ke maestro sanggarmu.' : <><Link to="/masuk" className="font-bold text-nila underline">Masuk</Link> lalu gabung sanggar untuk melihat papan skor sanggarmu.</>}
          </div>
        ) : (
          <LeaderboardList rows={q.data?.rows} sample={q.data?.sample} loading={q.isLoading} error={q.isError}
            emptyText={period === 'minggu' ? 'Belum ada skor minggu ini. Selesaikan tes akhir dan jadilah yang pertama.' : undefined} />
        )}
      </div>
    </div>
  );
}
