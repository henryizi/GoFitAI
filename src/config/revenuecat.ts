// RevenueCat Configuration
export const REVENUECAT_CONFIG = {
  // RevenueCat API Keys
  ios: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_dummy_key',
  },
  android: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || 'goog_dummy_key',
  },
  web: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY || 'web_dummy_key',
  },
  
  // Product IDs - MUST match StoreKit configuration exactly
  products: {
    premium: {
      monthly: 'gofitai_premium_monthly1',
      yearly: 'gofitai_premium_yearly1',
      lifetime: 'gofitai_premium_lifetime1',
    },
  },
  
  // Entitlement IDs
  entitlements: {
    premium: 'premium',
  },
  
  // Configuration options
  options: {
    // Enable debug logging in development
    logLevel: __DEV__ ? 'debug' : 'error',
    
    // Enable observer mode (for apps that already have their own purchase system)
    observerMode: false,
    
    // Enable automatic collection of Apple Search Ads attribution
    enableAppleSearchAds: true,
  },
} as const;

// Premium features list
export const PREMIUM_FEATURES = [
  'Unlimited AI workout plans',
  'Unlimited AI nutrition plans',
  'Unlimited AI recipe generator',
  'Unlimited AI nutrition chat',
  'Advanced progress tracking',
  'Custom workout builder',
  'Ad-free experience',
] as const;

// Type definitions
export type RevenueCatConfig = typeof REVENUECAT_CONFIG;
export type ProductId = keyof typeof REVENUECAT_CONFIG.products.premium;
export type EntitlementId = keyof typeof REVENUECAT_CONFIG.entitlements;