
import Constants from 'expo-constants';

const SENTRY_DSN = Constants?.expoConfig?.extra?.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let initialized = false;
let Sentry: any = null;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  try {
    // Use dynamic import instead of require to avoid TypeScript compilation issues
    const mod = await import('sentry-expo');
    Sentry = mod.default || mod;
    try {
      Sentry.init({
        dsn: SENTRY_DSN || undefined,
        enableInExpoDevelopment: true,
        debug: false,
        tracesSampleRate: 0.2,
      });
      initialized = true;
    } catch {}
  } catch (e) {
    // no-op to avoid UI impact
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  try {
    if (Sentry?.Native) {
      Sentry.Native.captureException(err, { extra: context });
    }
  } catch {}
}

export async function setUser(user: { id?: string | null; email?: string | null } | null): Promise<void> {
  try {
    if (Sentry?.Native) {
      Sentry.Native.setUser(user ? { id: user.id ?? undefined, email: user.email ?? undefined } : null);
    }
  } catch {}
} 