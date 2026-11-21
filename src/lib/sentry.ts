/** Sentry dengan penyaringan data pribadi (Bagian J). Hanya aktif bila VITE_SENTRY_DSN diisi. */
export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  const TOKEN = /(eyJ[\w-]+\.[\w-]+\.[\w-]+|access_token=[^&\s]+|refresh_token=[^&\s]+)/g;
  const scrub = (s?: string) => s?.replace(EMAIL, '[email]').replace(TOKEN, '[token]');
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      if (event.message) event.message = scrub(event.message);
      if (event.request?.url) event.request.url = scrub(event.request.url);
      event.exception?.values?.forEach((v) => { v.value = scrub(v.value); });
      return event;
    },
    beforeBreadcrumb(b) {
      if (b.message) b.message = scrub(b.message);
      if (b.data?.url) b.data.url = scrub(String(b.data.url));
      return b;
    },
  });
}
