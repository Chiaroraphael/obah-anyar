import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotFoundPage } from './components/PageStates';
import { Skeleton } from './components/ui';
import { HomePage } from './features/dances/HomePage';
import { RequireAuth } from './features/auth/RouteGuard';

// Halaman berat (kamera, AI, dasbor) dimuat belakangan agar bundle awal kecil.
const RegionPage = lazy(() => import('./features/dances/RegionPage').then((m) => ({ default: m.RegionPage })));
const DanceDetailPage = lazy(() => import('./features/dances/DanceDetailPage').then((m) => ({ default: m.DanceDetailPage })));
const PracticePage = lazy(() => import('./features/practice/PracticePage').then((m) => ({ default: m.PracticePage })));
const TestPage = lazy(() => import('./features/test/TestPage').then((m) => ({ default: m.TestPage })));
const LeaderboardPage = lazy(() => import('./features/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const auth = () => import('./features/auth/AuthPages');
const LoginPage = lazy(() => auth().then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => auth().then((m) => ({ default: m.RegisterPage })));
const CheckEmailPage = lazy(() => auth().then((m) => ({ default: m.CheckEmailPage })));
const ForgotPasswordPage = lazy(() => auth().then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => auth().then((m) => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazy(() => auth().then((m) => ({ default: m.AuthCallbackPage })));
const OnboardingPage = lazy(() => import('./features/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const MaestroPage = lazy(() => import('./features/maestro/MaestroPage').then((m) => ({ default: m.MaestroPage })));
const SanggarPage = lazy(() => import('./features/sanggar/SanggarPage').then((m) => ({ default: m.SanggarPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./features/profile/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AdminPage = lazy(() => import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const info = () => import('./features/info/InfoPages');
const HowItWorksPage = lazy(() => info().then((m) => ({ default: m.HowItWorksPage })));
const PrivacyPage = lazy(() => info().then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => info().then((m) => ({ default: m.TermsPage })));

const Fallback = () => (
  <main className="wadah py-10" aria-busy="true"><Skeleton className="h-10 w-64" /><Skeleton className="mt-6 h-72" /></main>
);

export function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/daerah/:regionId" element={<RegionPage />} />
          <Route path="/tarian/:danceId" element={<DanceDetailPage />} />
          <Route path="/tarian/:danceId/bab/:babNo" element={<PracticePage />} />
          <Route path="/tarian/:danceId/tes" element={<TestPage />} />
          <Route path="/papan-skor" element={<LeaderboardPage />} />
          <Route path="/masuk" element={<LoginPage />} />
          <Route path="/daftar" element={<RegisterPage />} />
          <Route path="/cek-email" element={<CheckEmailPage />} />
          <Route path="/lupa-sandi" element={<ForgotPasswordPage />} />
          <Route path="/setel-ulang-sandi" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
          <Route path="/maestro" element={<RequireAuth need="maestro"><MaestroPage /></RequireAuth>} />
          <Route path="/sanggar" element={<RequireAuth need="sanggar"><SanggarPage /></RequireAuth>} />
          <Route path="/profil" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/pengaturan" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth need="admin"><AdminPage /></RequireAuth>} />
          <Route path="/cara-kerja" element={<HowItWorksPage />} />
          <Route path="/privasi" element={<PrivacyPage />} />
          <Route path="/syarat" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
