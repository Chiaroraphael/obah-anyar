import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { ReferencePlayer } from './ReferencePlayer';
import { BeatBar } from './ui';
import { syntheticStep } from '../lib/synthetic';
import { countAt } from '../pose/session';

/**
 * Contoh gerak sungguhan untuk hero: data kerangka Pemanasan Dasar bagian 1,
 * diputar dengan komponen yang sama dengan halaman latihan. Bukan ilustrasi.
 * Berhenti saat di luar layar, bisa dijeda, dan diam (satu cuplikan) bila reduced-motion.
 */
export function HeroDemo() {
  const kp = useMemo(() => syntheticStep('angkat-lengan'), []);
  const timeRef = useRef(kp.durationMs * 0.35);
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [paused, setPaused] = useState(reduced);
  const [visible, setVisible] = useState(true);
  const [count, setCount] = useState(countAt(kp, timeRef.current));

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      timeRef.current = (timeRef.current + (now - last)) % kp.durationMs;
      last = now;
      const c = countAt(kp, timeRef.current);
      setCount((p) => (p === c ? p : c));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, visible, kp]);

  return (
    <figure className="min-w-0">
      <div ref={boxRef} className="tema-gelap relative overflow-hidden rounded-kartu bg-nila-malam">
        <ReferencePlayer keypoints={kp} timeRef={timeRef} label="Contoh gerak" className="aspect-[16/11] w-full rounded-none ring-0" playing={!paused} />
        <div className="flex items-end gap-3 border-t border-white/10 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-mori">Hitungan {count} dari {kp.counts}</p>
            <div className="mt-2"><BeatBar counts={kp.counts} active={count} compact /></div>
          </div>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused}
            aria-label={paused ? 'Putar contoh gerak' : 'Jeda contoh gerak'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mori text-nila hover:bg-prada">
            <Icon name={paused ? 'play' : 'pause'} size={18} />
          </button>
        </div>
      </div>
      <figcaption className="mt-3 max-w-[60ch] text-[14px] text-muted">
        Bagian 1 Pemanasan Dasar, diputar dari data kerangka. Saat latihan, kameramu tampil di sebelahnya dan dinilai per hitungan.
      </figcaption>
    </figure>
  );
}
