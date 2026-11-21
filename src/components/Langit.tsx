import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Ground malam dengan aurora warna kain + kisi kawung bercahaya.
 * Aurora bergerak lambat (siklus 28–34 dtk) → wajib ada tombol jeda; diam total saat reduced-motion.
 */
export function Langit({ children, className = '', style, as: Tag = 'section', pause = true, ...rest }: {
  children: ReactNode; className?: string; style?: CSSProperties; as?: 'section' | 'div'; pause?: boolean; [k: string]: unknown;
}) {
  const [diam, setDiam] = useState(false);
  return (
    <Tag className={`langit ${className}`} style={style} data-diam={diam ? 'true' : undefined} {...rest}>
      <div className="aurora" aria-hidden />
      <div className="kisi" aria-hidden />
      {children}
      {pause && (
        <button type="button" onClick={() => setDiam((d) => !d)} aria-pressed={diam}
          aria-label={diam ? 'Jalankan latar bergerak' : 'Jeda latar bergerak'}
          className="absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-mori/90 text-nila opacity-70 transition-opacity duration-[150ms] hover:opacity-100 focus-visible:opacity-100 motion-reduce:hidden">
          <Icon name={diam ? 'play' : 'pause'} size={12} />
        </button>
      )}
    </Tag>
  );
}
