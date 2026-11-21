/**
 * Antrean kiriman skor saat offline (PWA). Kiriman disimpan di localStorage
 * dan dikirim ulang otomatis saat perangkat kembali online.
 */
import { callFunction } from './supabase';

export interface QueuedSubmission { id: string; fn: 'submit-test'; body: unknown; createdAt: string }
const KEY = 'oa-antrean-kiriman';

function read(): QueuedSubmission[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function write(q: QueuedSubmission[]) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* penyimpanan penuh/diblokir */ }
}

export function enqueue(item: Omit<QueuedSubmission, 'id' | 'createdAt'>) {
  const q = read();
  q.push({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write(q);
  window.dispatchEvent(new Event('oa-antrean'));
}

export function pendingCount() { return read().length; }

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    const q = read();
    const remaining: QueuedSubmission[] = [];
    for (const item of q) {
      try { await callFunction(item.fn, item.body); sent++; }
      catch { remaining.push(item); }
    }
    write(remaining);
    window.dispatchEvent(new Event('oa-antrean'));
  } finally { flushing = false; }
  return sent;
}

export function startQueueSync() {
  window.addEventListener('online', () => { void flushQueue(); });
  void flushQueue();
}
