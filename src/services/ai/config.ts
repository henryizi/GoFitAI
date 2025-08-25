// Get environment variables
const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY?.trim();
const DEEPSEEK_API_URL = (process.env.EXPO_PUBLIC_DEEPSEEK_API_URL || 'https://openrouter.ai/api/v1/chat/completions').trim();
const DEEPSEEK_MODEL = (process.env.EXPO_PUBLIC_DEEPSEEK_MODEL || 'deepseek/deepseek-chat').trim();

// Client-side timeout for AI requests (ms)
const AI_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_AI_TIMEOUT_MS || 45000);

// Verbose logging toggle
const AI_VERBOSE_LOGGING = (process.env.EXPO_PUBLIC_AI_VERBOSE || '').toString().trim() === '1';

// No console warning here; backend manages AI provider/keys

export {
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  AI_TIMEOUT_MS,
  AI_VERBOSE_LOGGING,
}; 