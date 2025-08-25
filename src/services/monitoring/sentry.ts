import Constants from 'expo-constants';

const SENTRY_DSN = Constants?.expoConfig?.extra?.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let initialized = false;
let Sentry: any = null;

export function initSentry(): void {
  if (initialized) return;
  try {
    import('sentry-expo')
      .then((mod) => {
        Sentry = mod;
        try {
          Sentry.init({
            dsn: SENTRY_DSN || undefined,
            enableInExpoDevelopment: true,
            debug: false,
            tracesSampleRate: 0.2,
          });
          initialized = true;
        } catch {}
      })
      .catch(() => {});
  } catch (e) {
    // no-op to avoid UI impact
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry?.Native?.captureException(err, { extra: context });
  } catch {}
}

export function setUser(user: { id?: string | null; email?: string | null } | null): void {
  try {
    Sentry?.Native?.setUser(user ? { id: user.id ?? undefined, email: user.email ?? undefined } : null);
  } catch {}
} 