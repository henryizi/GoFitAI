import Constants from 'expo-constants';

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Get the API URL from Expo config (avoid process.env at runtime in RN)
const getApiUrl = (): string => {
  // Use Railway server for both development and production
  const railwayUrl = 'https://gofitai-production.up.railway.app';
  console.log('[ENVIRONMENT] Using Railway server:', railwayUrl);
  return railwayUrl;
};

// Environment configuration
export const environment = {
  // API Configuration
  apiUrl: getApiUrl(),
  
  // Environment flags
  isDevelopment,
  isProduction,
  
  // Feature flags
  enableLocalServer: isDevelopment,
  enableProductionServer: true,
  
  // Timeouts
  apiTimeout: 240000, // Increased to 240 seconds (4 minutes) for AI processing
  
  // Logging
  enableVerboseLogging: Boolean(Number((Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_AI_VERBOSE)) || isDevelopment,
};

// Log current environment (only in development)
if (isDevelopment) {
  console.log('🌍 Environment:', {
    apiUrl: environment.apiUrl,
    isDevelopment: environment.isDevelopment,
    isProduction: environment.isProduction,
    expoConfigExtra: Constants.expoConfig?.extra,
    expoConfigApiUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL,
  });
}

export default environment;
