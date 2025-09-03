import Constants from 'expo-constants';

// Get environment variables
const DEEPSEEK_API_KEY = Constants?.expoConfig?.extra?.DEEPSEEK_API_KEY || process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY?.trim();
const DEEPSEEK_API_URL = (Constants?.expoConfig?.extra?.DEEPSEEK_API_URL || process.env.EXPO_PUBLIC_DEEPSEEK_API_URL || 'https://openrouter.ai/api/v1/chat/completions').trim();
// Auto-detect model format based on API URL
const apiUrl = (Constants?.expoConfig?.extra?.DEEPSEEK_API_URL || process.env.EXPO_PUBLIC_DEEPSEEK_API_URL || 'https://openrouter.ai/api/v1/chat/completions').trim();
const isDirectDeepSeek = apiUrl.includes('api.deepseek.com');
const defaultModel = isDirectDeepSeek ? 'deepseek-chat' : 'deepseek/deepseek-chat';
const DEEPSEEK_MODEL = (Constants?.expoConfig?.extra?.DEEPSEEK_MODEL || process.env.EXPO_PUBLIC_DEEPSEEK_MODEL || defaultModel).trim();



// Client-side timeout for AI requests (ms)
const AI_TIMEOUT_MS = Number(Constants?.expoConfig?.extra?.AI_TIMEOUT_MS || process.env.EXPO_PUBLIC_AI_TIMEOUT_MS || 45000);

// Verbose logging toggle
const AI_VERBOSE_LOGGING = (Constants?.expoConfig?.extra?.AI_VERBOSE || process.env.EXPO_PUBLIC_AI_VERBOSE || '').toString().trim() === '1';

// No console warning here; backend manages AI provider/keys

export {
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  AI_TIMEOUT_MS,
  AI_VERBOSE_LOGGING,
}; 