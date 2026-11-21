// Utilitas bersama Edge Functions Obah Anyar (Deno).
// Kunci service_role HANYA ada di sini (env Supabase), tidak pernah di frontend.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.47.10';
import { z } from 'npm:zod@3.24.1';

export { z };

const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') ?? '';
  const allow = ALLOWED.length === 0 ? '*' : ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8' } });
}

/** Format galat standar: { error: { code, message } } dengan pesan Bahasa Indonesia. */
export function errorResponse(req: Request, e: unknown): Response {
  if (e instanceof HttpError) return json(req, { error: { code: e.code, message: e.message } }, e.status);
  if (e instanceof z.ZodError) {
    return json(req, { error: { code: 'validasi', message: e.issues[0]?.message ?? 'Data tidak valid.' } }, 400);
  }
  // Log tanpa data pribadi.
  console.error('galat_tak_terduga', e instanceof Error ? e.name + ': ' + e.message.slice(0, 200) : 'unknown');
  return json(req, { error: { code: 'galat_server', message: 'Terjadi kesalahan di server. Coba lagi.' } }, 500);
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

/** Klien atas nama pengguna (RLS berlaku) + data pengguna dari token. */
export async function requireUser(req: Request): Promise<{ user: User; userClient: SupabaseClient }> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new HttpError(401, 'belum_masuk', 'Masuk dulu untuk melakukan ini.');
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'sesi_kedaluwarsa', 'Sesi berakhir. Silakan masuk lagi.');
  return { user: data.user, userClient };
}

export async function getProfile(admin: SupabaseClient, id: string) {
  const { data } = await admin.from('profiles').select('id, display_name, role, is_minor').eq('id', id).maybeSingle();
  if (!data) throw new HttpError(404, 'profil_tidak_ada', 'Profil tidak ditemukan.');
  return data as { id: string; display_name: string; role: 'pelajar' | 'maestro' | 'guru' | 'admin'; is_minor: boolean };
}

/** Batasi laju: maksimal `max` aksi per `windowSec` detik per pengguna. */
export async function rateLimit(admin: SupabaseClient, profileId: string, action: string, max: number, windowSec: number) {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { count } = await admin.from('rate_events').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).eq('action', action).gte('created_at', since);
  if ((count ?? 0) >= max) throw new HttpError(429, 'terlalu_sering', 'Terlalu banyak permintaan. Coba lagi nanti.');
  await admin.from('rate_events').insert({ profile_id: profileId, action });
}

export async function audit(admin: SupabaseClient, actorId: string | null, action: string, entity: string, entityId: string | null, meta: Record<string, unknown> = {}) {
  await admin.from('audit_log').insert({ actor_id: actorId, action, entity, entity_id: entityId, meta });
}

/** Pembungkus handler: CORS, hanya POST, galat terformat. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
    if (req.method !== 'POST') return json(req, { error: { code: 'metode', message: 'Gunakan metode POST.' } }, 405);
    try { return await handler(req); } catch (e) { return errorResponse(req, e); }
  });
}

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { throw new HttpError(400, 'json', 'Isi permintaan bukan JSON yang valid.'); }
}

/** Kirim email pemberitahuan lewat Resend bila RESEND_API_KEY diisi; bila tidak, dilewati. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'Obah Anyar <noreply@[domain-anda]>';
  if (!key) { console.warn('RESEND_API_KEY belum diisi; email dilewati.'); return; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

export const displayNameSchema = z.string().trim().min(3, 'Nama panggilan minimal 3 karakter').max(24, 'Nama panggilan maksimal 24 karakter')
  .regex(/^[\p{L}\p{N} ._]+$/u, 'Hanya huruf, angka, spasi, titik, dan garis bawah');
