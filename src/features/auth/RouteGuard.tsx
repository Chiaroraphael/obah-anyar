import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ForbiddenPage, PendingSanggarPage } from '../../components/PageStates';
import { Skeleton } from '../../components/ui';
import { isMaestroVerified, useAuth } from './authStore';

/**
 * Guard rute di frontend — HANYA untuk tampilan.
 * Keamanan sebenarnya ada di RLS PostgreSQL dan Edge Functions.
 */
export function RequireAuth({ children, need }: { children: ReactNode; need?: 'maestro' | 'admin' | 'sanggar' }) {
  const s = useAuth();
  const loc = useLocation();
  if (s.status === 'loading' || (s.status === 'authed' && !s.profile)) {
    return <main className="wadah py-10" aria-busy="true"><Skeleton className="h-10 w-64" /><Skeleton className="mt-6 h-64" /></main>;
  }
  if (s.status !== 'authed') return <Navigate to={`/masuk?lanjut=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  const role = s.profile!.role;
  if (need === 'admin' && role !== 'admin') return <ForbiddenPage reason="Halaman ini khusus admin Obah Anyar." />;
  if (need === 'maestro') {
    if (role !== 'maestro' && role !== 'admin') return <ForbiddenPage reason="Mode Maestro khusus maestro sanggar terverifikasi. Daftar dengan peran Sanggar–Maestro untuk mengajukan." />;
    if (!s.sanggar && role !== 'admin') return <Navigate to="/onboarding" replace />;
    if (!isMaestroVerified(s)) return <PendingSanggarPage />;
  }
  if (need === 'sanggar' && !s.sanggar && role !== 'admin') return <ForbiddenPage reason="Halaman ini untuk anggota sanggar. Gabung dengan kode undangan dari maestro sanggarmu." />;
  return <>{children}</>;
}
