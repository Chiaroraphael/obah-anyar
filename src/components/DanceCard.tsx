import { Link } from 'react-router-dom';
import { Kain } from './Ornamen';
import { TingkatBadge } from './Tingkat';
import type { Dance } from '../types/database.types';

/** Kartu tarian: sampul kain daerah (zoom halus saat hover), naik 2px, garis menggelap. */
export function DanceCard({ dance }: { dance: Dance; index?: number; featured?: boolean }) {
  const summary = dance.summary.replace(/ \(Deskripsi draf.*\)$/, '');
  const ready = dance.part_count > 0 && dance.step_count >= dance.part_count;
  const status = ready ? 'Siap dilatih sampai tes akhir' : dance.step_count > 0 ? `${dance.step_count} dari ${dance.part_count} bagian terekam` : 'Menunggu rekaman maestro';
  const asal = dance.region === dance.province ? dance.region : `${dance.region}, ${dance.province}`;
  return (
    <Link to={`/tarian/${dance.id}`} className="kartu angkat flex h-full flex-col overflow-hidden">
      <div className="relative overflow-hidden">
        <Kain id={dance.id} className="zoom-kain h-28" />
        {ready && <span className="absolute left-3 top-3 rounded-full bg-nila-malam/85 px-3 py-1 text-[13px] font-medium text-mori">Siap dilatih</span>}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="truncate text-[13px] text-muted">{asal}</p>
        <h3 className="mt-1">{dance.name}</h3>
        <p className="mt-2 line-clamp-2 text-[16px] leading-relaxed text-muted">{summary}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-garis pt-4">
          <TingkatBadge level={dance.difficulty} parts={dance.part_count} size="sm" />
          <span className={`text-[13px] ${ready ? 'font-medium text-pendar-teks' : 'text-muted'}`}>{status}</span>
        </div>
      </div>
    </Link>
  );
}
