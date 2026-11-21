/**
 * Aset media bawaan (folder public/) dan preferensi musik iringan.
 * Path "static:/tarian/pendet/bab-01.mp4" → URL "/tarian/pendet/bab-01.mp4".
 */
import { useCallback, useState } from 'react';

export const STATIC_PREFIX = 'static:';

export function isStaticPath(path: string | null | undefined): path is string {
  return Boolean(path && path.startsWith(STATIC_PREFIX));
}

/** URL aset bawaan, atau null bila path bukan aset bawaan. */
export function staticUrl(path: string | null | undefined): string | null {
  if (!isStaticPath(path)) return null;
  const rel = path.slice(STATIC_PREFIX.length).replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}${rel}`;
}

const KEY_MUSIK = 'obah:musik';

function bacaMusik(): boolean {
  try {
    return localStorage.getItem(KEY_MUSIK) !== 'mati';
  } catch {
    return true;
  }
}

/** Musik iringan nyala/mati, diingat di perangkat ini. */
export function useMusikIringan() {
  const [nyala, setNyala] = useState<boolean>(bacaMusik);
  const ubah = useCallback((v: boolean) => {
    setNyala(v);
    try { localStorage.setItem(KEY_MUSIK, v ? 'nyala' : 'mati'); } catch { /* penyimpanan tidak tersedia */ }
  }, []);
  return [nyala, ubah] as const;
}
