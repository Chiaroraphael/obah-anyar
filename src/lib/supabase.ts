import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** false = mode lokal: data contoh dari src/lib/localData.ts, tanpa login online. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null;

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
export const POSE_MODEL = ((import.meta.env.VITE_POSE_MODEL as string | undefined) ?? 'lite') === 'full' ? 'full' : 'lite';

export function storagePublicUrl(bucket: string, path: string): string | null {
  if (!supabase) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Galat standar dari Edge Functions: { error: { code, message } } */
export class ApiError extends Error {
  constructor(public code: string, message: string, public status?: number) { super(message); }
}

export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  if (!supabase) throw new ApiError('offline_mode', 'Server belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any).context as Response | undefined;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json();
        if (j?.error) throw new ApiError(j.error.code, j.error.message, ctx.status);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    throw new ApiError('network', 'Tidak bisa menghubungi server. Periksa koneksimu lalu coba lagi.');
  }
  return data as T;
}
