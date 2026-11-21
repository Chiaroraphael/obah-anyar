import { TINGKAT } from '../data/katalog';
import type { Difficulty } from '../types/database.types';

/** Lencana tingkat kesulitan: empat ruas seperti tangga, teks selalu ikut (bukan warna saja). */
export function TingkatBadge({ level, parts, size = 'md', dark }: { level: Difficulty; parts?: number; size?: 'sm' | 'md'; dark?: boolean }) {
  const t = TINGKAT[level];
  return (
    <span className={`inline-flex items-center gap-2 font-bold ${size === 'sm' ? 'text-[12px]' : 'text-[14px]'}`} title={t.keterangan}>
      <span className="flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`w-[5px] rounded-[2px] ${i <= level ? (dark ? 'bg-prada' : 'bg-nila') : dark ? 'bg-white/20' : 'bg-nila/15'}`} style={{ height: 5 + i * 3 }} />
        ))}
      </span>
      <span>{t.label}{parts != null ? `, ${parts} bagian` : ''}</span>
    </span>
  );
}
