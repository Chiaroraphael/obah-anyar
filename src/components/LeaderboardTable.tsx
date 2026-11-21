import type { LeaderboardRow as Row } from '../types/database.types';
import { EmptyState, SampleBadge, SkeletonList } from './ui';

const MEDAL = ['bg-prada text-nila', 'bg-perak text-nila', 'bg-perunggu text-mori'];

export function LeaderboardRow({ row, compact }: { row: Row; compact?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-[10px] px-3 ${compact ? 'py-2' : 'py-2.5'} ${row.is_me ? 'bg-prada/15 ring-1 ring-prada' : ''}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full angka text-[14px] ${row.rank <= 3 ? MEDAL[row.rank - 1] : 'bg-nila/5 text-nila'}`} aria-label={`Peringkat ${row.rank}`}>
        {row.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold">{row.display_name}{row.is_me && <span className="ml-2 text-[12px] font-bold text-soga">(kamu)</span>}</span>
      {!compact && (
        <span className="hidden sm:flex gap-4 text-[14px] text-muted">
          <span>Wiraga <b className="angka text-nila">{row.wiraga}</b></span>
          <span>Wirama <b className="angka text-nila">{row.wirama}</b></span>
        </span>
      )}
      <span className="angka w-10 text-right text-[18px]">{row.score}</span>
    </li>
  );
}

export function LeaderboardList({ rows, loading, sample, compact, emptyText, error }: { rows?: Row[]; loading?: boolean; sample?: boolean; compact?: boolean; emptyText?: string; error?: boolean }) {
  if (loading) return <SkeletonList rows={compact ? 3 : 5} className="h-12" />;
  if (error) return <EmptyState icon="alert" title="Papan skor gagal dimuat">Periksa koneksi lalu muat ulang halaman.</EmptyState>;
  if (!rows?.length) return <EmptyState icon="trophy" title="Papan skor masih kosong">{emptyText ?? 'Jadilah yang pertama: selesaikan tes akhir tarian ini lalu kirim skormu.'}</EmptyState>;
  return (
    <div>
      {sample && <div className="mb-2 flex justify-end"><SampleBadge /></div>}
      <ol className="space-y-1" aria-label="Papan skor">
        {rows.map((r) => <LeaderboardRow key={r.rank + r.display_name} row={r} compact={compact} />)}
      </ol>
    </div>
  );
}
