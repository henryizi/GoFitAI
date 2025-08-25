import type { PostHogEventProperties } from '@posthog/core';
import Constants from 'expo-constants';

let client: any | null = null;

function asProps(props?: Record<string, unknown>): PostHogEventProperties | undefined {
  if (!props) return undefined;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props)) out[k] = v as any;
  return out as PostHogEventProperties;
}

export function initAnalytics(): void {
  if (client) return;
  const apiKey = Constants?.expoConfig?.extra?.POSTHOG_API_KEY || process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = Constants?.expoConfig?.extra?.POSTHOG_HOST || process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
  if (!apiKey) {
    if (__DEV__) console.warn('[analytics] PostHog disabled: missing API key');
    return;
  }
  // Lazy import PostHog to avoid platform-specific resolution issues at module evaluation time
  import('posthog-react-native')
    .then(({ default: PostHog }) => {
      try {
        client = new PostHog(apiKey, { host, captureAppLifecycleEvents: true });
        if (__DEV__) console.log('[analytics] initialized', { host });
      } catch (error) {
        if (__DEV__) console.warn('[analytics] init error', error);
      }
    })
    .catch((error) => { if (__DEV__) console.warn('[analytics] import error', error); });
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  if (__DEV__) console.log('[analytics] identify', { userId, props });
  try { client?.identify(userId, asProps(props)); } catch (error) { if (__DEV__) console.warn('[analytics] identify error', error); }
}

export function setUserProperties(props: Record<string, unknown>): void {
  if (__DEV__) console.log('[analytics] setUserProperties', { props });
  try {
    // posthog-react-native identify API merges properties when no distinctId is provided after a prior identify
    client?.identify(undefined as any, asProps(props));
  } catch (error) { if (__DEV__) console.warn('[analytics] setUserProperties error', error); }
}

export function reset(): void {
  if (__DEV__) console.log('[analytics] reset');
  try { client?.reset(); } catch (error) { if (__DEV__) console.warn('[analytics] reset error', error); }
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (__DEV__) console.log('[analytics] track', { event, props });
  try { client?.capture(event, asProps(props)); } catch (error) { if (__DEV__) console.warn('[analytics] track error', error); }
} 