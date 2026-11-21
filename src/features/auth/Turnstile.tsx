import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../../lib/supabase';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptP: Promise<void> | null = null;
function loadScript() {
  if (scriptP) return scriptP;
  scriptP = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptP = null; reject(new Error('Turnstile gagal dimuat')); };
    document.head.appendChild(s);
  });
  return scriptP;
}

export const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);

/** Widget CAPTCHA Cloudflare Turnstile. Tidak tampil bila VITE_TURNSTILE_SITE_KEY kosong. */
export function Turnstile({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      idRef.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: 'id',
        theme: 'light',
        callback: (t: string) => cb.current(t),
        'expired-callback': () => cb.current(null),
        'error-callback': () => cb.current(null),
      });
    }).catch(() => cb.current(null));
    return () => { cancelled = true; if (idRef.current) window.turnstile?.remove(idRef.current); };
  }, []);

  useEffect(() => { if (resetKey && idRef.current) { window.turnstile?.reset(idRef.current); cb.current(null); } }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" aria-label="Verifikasi bukan robot" />;
}
