import Constants from 'expo-constants';

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Get the API URL from Expo config (avoid process.env at runtime in RN)
const getApiUrl = (): string => {
  // Always use Railway production server as primary
  const railwayUrl = 'https://gofitai-production.up.railway.app';
  console.log('[ENVIRONMENT] Using Railway production API URL:', railwayUrl);
  return railwayUrl;
  
  // Note: To use local development server, manually override in development
  // const configUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;
  // if (configUrl && __DEV__) {
  //   console.log('[ENVIRONMENT] Using configured API URL for development:', configUrl);
  //   return configUrl;
  // }
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
  apiTimeout: 180000, // 3 minutes for AI processing (server timeout is 5 minutes)
  
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
