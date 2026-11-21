import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import type { PartView } from '../features/dances/useCourse';

/** Satu bagian kurikulum sebagai baris (dipisah garis rambut oleh daftar induk). */
export function ChapterRow({ view, danceId, total }: { view: PartView; danceId: string; total: number }) {
  const { part, index, state, best, step } = view;
  const locked = state === 'kunci' || state === 'menunggu';
  const badge = (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full angka text-[16px] ${
        state === 'lulus' ? 'bg-pendar/15 text-pendar-teks'
          : state === 'aktif' ? 'bg-nila text-mori'
          : 'border border-garis text-muted'
      }`}
      aria-hidden
    >
      {state === 'lulus' ? <Icon name="check" size={20} strokeWidth={2.4} /> : state === 'kunci' ? <Icon name="lock" size={18} /> : state === 'menunggu' ? <Icon name="camera" size={18} /> : index}
    </span>
  );
  const body = (
    <>
      {badge}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap gap-x-3 text-[14px] text-muted">
          <span>Bagian {index} dari {total}</span>
          <span>{part.counts} hitungan</span>
          {step && <span>{(step.duration_ms / 1000).toFixed(0)} detik</span>}
        </p>
        <p className={`mt-0.5 text-[18px] font-extrabold tracking-[-0.01em] ${locked ? 'text-nila/55' : ''}`}>{part.name}</p>
        <p className="mt-1 max-w-[62ch] text-[15px] text-muted">{part.focus}</p>
      </div>
      <div className="shrink-0 text-right">
        {state === 'lulus' && (
          <>
            <p className="angka text-[22px] text-pendar-teks">{best}</p>
            <p className="text-[14px] font-bold text-pendar-teks">Lulus</p>
          </>
        )}
        {state === 'aktif' && <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-prada px-4 text-[14px] font-bold text-nila">{best != null ? `Terbaik ${best}, ulangi` : 'Mulai'}<Icon name="arrow" size={16} /></span>}
        {state === 'kunci' && <span className="block max-w-[120px] text-[14px] text-muted">Lulus bagian {index - 1} dulu</span>}
        {state === 'menunggu' && <span className="block max-w-[130px] text-[14px] text-muted">Menunggu rekaman maestro</span>}
      </div>
    </>
  );
  const cls = `flex items-center gap-4 px-3 py-5 sm:gap-5 ${state === 'aktif' ? 'bg-sumur' : ''}`;
  if (locked) return <li className={cls} aria-disabled="true">{body}</li>;
  return (
    <li>
      <Link to={`/tarian/${danceId}/bab/${index}`} className={`${cls} transition-colors duration-[220ms] hover:bg-sumur`} aria-label={`Bagian ${index}: ${part.name}${best != null ? `, skor terbaik ${best}` : ''}`}>
        {body}
      </Link>
    </li>
  );
}
