import 'dotenv/config';
import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
  ...config,
  name: 'GoFitAI',
  slug: 'GoFitAI',
  scheme: 'acme',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FF8A00',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: ['expo-router', 'sentry-expo', 'expo-font'],
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.anonymous.GoFitAI',
    infoPlist: {
      NSCameraUsageDescription: '此应用需要访问相机以拍摄食物照片用于营养分析。',
      NSMicrophoneUsageDescription: '此应用可能在录制带声音的视频时访问麦克风。',
    },
  },
  android: {
    package: 'com.anonymous.GoFitAI',
    permissions: ['CAMERA'],
  },
  extra: {
    // Monitoring / Analytics
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',

    // Supabase
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

    // AI / OpenRouter
    DEEPSEEK_API_KEY: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.EXPO_PUBLIC_DEEPSEEK_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    
    // Gemini AI
    GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,

    // Local API server
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : 'https://gofitai-production.up.railway.app'),
    NGROK_AUTHTOKEN: process.env.NGROK_AUTHTOKEN,

    // Storage
    SUPABASE_STORAGE_URL: process.env.EXPO_PUBLIC_SUPABASE_STORAGE_URL,

    // App metadata
    APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'GoFitAI',
    APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  },
  };
};
