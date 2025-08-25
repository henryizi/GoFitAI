import Constants from 'expo-constants';

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Get the API URL from Expo config (avoid process.env at runtime in RN)
const getApiUrl = (): string => {
  // Prefer Expo config extras which are stable in RN environments
  const configUrl = (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined) || undefined;

  if (configUrl) {
    console.log('[ENVIRONMENT] Using configured API URL from Expo config:', configUrl);
    return configUrl;
  }

  // Final fallback to production Railway URL
  const fallbackUrl = 'https://gofitai-production.up.railway.app';
  console.log('[ENVIRONMENT] No API URL found in Expo config, using fallback:', fallbackUrl);
  return fallbackUrl;
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
  apiTimeout: 45000,
  
  // Logging
  enableVerboseLogging: isDevelopment,
};

// Log current environment (only in development)
if (isDevelopment) {
  console.log('🌍 Environment:', {
    apiUrl: environment.apiUrl,
    isDevelopment: environment.isDevelopment,
    isProduction: environment.isProduction,
  });
}

export default environment;
