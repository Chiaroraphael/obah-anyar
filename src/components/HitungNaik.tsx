import { useEffect, useRef, useState } from 'react';

/**
 * Momen "counter-rolls": angka naik sekali saat terlihat (1000ms, ease-out).
 * Tanpa JS / reduced-motion / sudah terlihat saat dimuat: langsung angka akhir.
 */
export function HitungNaik({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current || !value) { setShown(value); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { setShown(value); return; }
    if (el.getBoundingClientRect().top < window.innerHeight) { setShown(value); done.current = true; return; }
    setShown(0);
    let raf = 0;
    let fallback = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      done.current = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / 1000);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      // pengaman: bila frame tertahan (tab latar), angka akhir tetap muncul
      fallback = window.setTimeout(() => setShown(value), 1300);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.clearTimeout(fallback); };
  }, [value]);

  return <span ref={ref} className={className} aria-label={String(value)}><span aria-hidden>{shown}</span></span>;
}
