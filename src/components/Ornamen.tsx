/** Potongan kain daerah: cap identitas tiap daerah/tarian (pola CSS dari src/index.css). */
import { wastraOf, wastraVars } from '../lib/wastra';

export function Kain({ id, className = '', children, style }: { id: string | undefined; className?: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  const w = wastraOf(id);
  return (
    <div className={`pola-${w.pola} ${className}`} style={{ ...wastraVars(w), ...style }} aria-hidden={children ? undefined : true}>
      {children}
    </div>
  );
}
