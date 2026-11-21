import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Profile, UserRole } from '../../types/database.types';

export interface MySanggar { id: string; name: string; verified: boolean; role: 'pemilik' | 'maestro' | 'murid'; invite_code?: string }

interface AuthState {
  status: 'loading' | 'guest' | 'authed';
  userId: string | null;
  email: string | null;
  emailConfirmed: boolean;
  profile: Profile | null;
  sanggar: MySanggar | null;
  demo: boolean;
  sessionExpired: boolean;
  init: () => void;
  refreshProfile: () => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
  /** Mode demo lokal (hanya bila Supabase belum dikonfigurasi). */
  enterDemo: (role: UserRole) => void;
  setProfileLocal: (p: Partial<Profile>) => void;
  setSanggarLocal: (s: MySanggar | null) => void;
}

const DEMO_KEY = 'oa-demo-akun';

function demoProfile(role: UserRole): Profile {
  return { id: 'demo-' + role, display_name: role === 'admin' ? 'Admin Demo' : role === 'maestro' ? 'Maestro Demo' : 'Penari Demo', avatar_url: null, role, school_name: null, is_minor: false, guardian_consent_at: null, onboarded: true };
}

let started = false;

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  userId: null,
  email: null,
  emailConfirmed: false,
  profile: null,
  sanggar: null,
  demo: false,
  sessionExpired: false,

  init() {
    if (started) return;
    started = true;
    if (!isSupabaseConfigured || !supabase) {
      try {
        const raw = sessionStorage.getItem(DEMO_KEY);
        if (raw) {
          const d = JSON.parse(raw) as { profile: Profile; sanggar: MySanggar | null };
          set({ status: 'authed', demo: true, userId: d.profile.id, email: 'demo@lokal', emailConfirmed: true, profile: d.profile, sanggar: d.sanggar });
          return;
        }
      } catch { /* abaikan */ }
      set({ status: 'guest' });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (!s) return set({ status: 'guest' });
      set({ status: 'authed', userId: s.user.id, email: s.user.email ?? null, emailConfirmed: Boolean(s.user.email_confirmed_at) });
      get().refreshProfile();
    });
    supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        const wasAuthed = get().status === 'authed';
        set({ status: 'guest', userId: null, email: null, profile: null, sanggar: null, sessionExpired: wasAuthed && !signingOut });
        signingOut = false;
        return;
      }
      if (s && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        const changed = get().userId !== s.user.id;
        set({ status: 'authed', userId: s.user.id, email: s.user.email ?? null, emailConfirmed: Boolean(s.user.email_confirmed_at), sessionExpired: false });
        if (changed || event === 'USER_UPDATED') get().refreshProfile();
      }
    });
  },

  async refreshProfile() {
    const { userId } = get();
    if (!supabase || !userId) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const { data: mem } = await supabase
      .from('sanggar_members')
      .select('role, sanggar:sanggar_id (id, name, verified_at, invite_code)')
      .eq('profile_id', userId)
      .limit(1)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sg = (mem as any)?.sanggar;
    set({
      profile: (profile as Profile) ?? null,
      sanggar: sg ? { id: sg.id, name: sg.name, verified: Boolean(sg.verified_at), role: mem!.role, invite_code: sg.invite_code } : null,
    });
  },

  async signOut(everywhere = false) {
    if (get().demo) {
      try { sessionStorage.removeItem(DEMO_KEY); } catch { /* abaikan */ }
      set({ status: 'guest', demo: false, userId: null, profile: null, sanggar: null, email: null });
      return;
    }
    signingOut = true;
    await supabase?.auth.signOut({ scope: everywhere ? 'global' : 'local' });
  },

  enterDemo(role) {
    const profile = demoProfile(role);
    const sanggar: MySanggar | null = role === 'maestro' ? { id: 'demo-sanggar', name: '[Nama sanggar]', verified: true, role: 'pemilik', invite_code: 'DEMO1234' } : null;
    try { sessionStorage.setItem(DEMO_KEY, JSON.stringify({ profile, sanggar })); } catch { /* abaikan */ }
    set({ status: 'authed', demo: true, userId: profile.id, email: 'demo@lokal', emailConfirmed: true, profile, sanggar });
  },

  setProfileLocal(p) {
    const cur = get().profile;
    if (!cur) return;
    const profile = { ...cur, ...p };
    set({ profile });
    if (get().demo) try { sessionStorage.setItem(DEMO_KEY, JSON.stringify({ profile, sanggar: get().sanggar })); } catch { /* abaikan */ }
  },
  setSanggarLocal(s) {
    set({ sanggar: s });
    if (get().demo) try { sessionStorage.setItem(DEMO_KEY, JSON.stringify({ profile: get().profile, sanggar: s })); } catch { /* abaikan */ }
  },
}));

let signingOut = false;

export const isMaestroVerified = (s: AuthState) =>
  (s.profile?.role === 'maestro' || s.profile?.role === 'admin') && (s.profile?.role === 'admin' || Boolean(s.sanggar?.verified && s.sanggar.role !== 'murid'));
