import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesEntitlementInfo,
  LOG_LEVEL 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { REVENUECAT_CONFIG } from '../../config/revenuecat';
import { MockRevenueCatService } from './MockRevenueCatService';
import { StoreKitDirectFetcherService } from './StoreKitDirectFetcher';

// ========================================
// 🧪 TESTING CONFIGURATION
// ========================================
// To test REAL Apple purchase UI in Xcode:
// 1. Set ENABLE_REAL_STOREKIT_TESTING = true
// 2. Make sure you have a valid RevenueCat API key in .env
// 3. Configure StoreKit testing in Xcode
// 4. Test on device or simulator
//
// To use mock service (current default):
// - Keep ENABLE_REAL_STOREKIT_TESTING = false
// - Mock service simulates purchases without Apple UI
// FORCE MODULE RELOAD - Changed timestamp: 2025-11-02-11:20-FINAL
const ENABLE_REAL_STOREKIT_TESTING = false;
const USE_MOCK_SERVICE = false; // FORCE REAL PURCHASES - FINAL VERSION

// Debug logging - FORCE RELOAD v2
console.log('🔧 RevenueCat Config Debug (FORCE RELOAD v2 - loaded at ' + new Date().toISOString() + '):');
console.log('  __DEV__:', __DEV__);
console.log('  ENABLE_REAL_STOREKIT_TESTING:', ENABLE_REAL_STOREKIT_TESTING);
console.log('  USE_MOCK_SERVICE:', USE_MOCK_SERVICE);
console.log('🔧 Expected: USE_MOCK_SERVICE should be FALSE for real purchases');

// Re-export types for easier importing
export type SubscriptionPackage = PurchasesPackage;
export type SubscriptionOffering = PurchasesOffering;

export interface SubscriptionInfo {
  isPremium: boolean;
  productId?: string;
  expirationDate?: string;
  willRenew?: boolean;
  periodType?: 'monthly' | 'lifetime';
  originalPurchaseDate?: string;
  isInGracePeriod?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}

/**
 * Detect the current environment for RevenueCat configuration
 */
const detectEnvironment = () => {
  const isExpoGo = Constants.appOwnership === 'expo';
  const isWeb = Platform.OS === 'web';
  const isSimulator = Constants.isDevice === false;
  
  // Expo Go always uses web/browser mode for RevenueCat
  if (isExpoGo || isWeb) {
    return {
      platform: 'web' as const,
      apiKey: REVENUECAT_CONFIG.web.apiKey, // Use web API key for Expo Go/web
      reason: isExpoGo ? 'Expo Go detected' : 'Web platform detected'
    };
  }
  
  // Native iOS/Android
  if (Platform.OS === 'ios') {
    return {
      platform: 'ios' as const,
      apiKey: REVENUECAT_CONFIG.ios.apiKey,
      reason: 'Native iOS build'
    };
  }
  
  if (Platform.OS === 'android') {
    return {
      platform: 'android' as const,
      apiKey: REVENUECAT_CONFIG.android.apiKey,
      reason: 'Native Android build'
    };
  }
  
  // Fallback to web for unknown platforms
  return {
    platform: 'web' as const,
    apiKey: REVENUECAT_CONFIG.web.apiKey, // Use web API key for fallback
    reason: 'Unknown platform, defaulting to web'
  };
};

export class RevenueCatService {
  private static isInitialized = false;
  private static isEnabled = false; // Track if RevenueCat is actually functional
  private static pendingUserId: string | null = null;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize RevenueCat SDK
   */
  static async initialize(userId?: string): Promise<void> {
    console.log('[RevenueCat] Initialize called - USE_MOCK_SERVICE:', USE_MOCK_SERVICE, '__DEV__:', __DEV__);
    console.log('🔧 RUNTIME CHECK: USE_MOCK_SERVICE type:', typeof USE_MOCK_SERVICE, 'value:', USE_MOCK_SERVICE);
    console.log('🔧 RUNTIME CHECK: Expected FALSE for real Apple purchases');
    
    if (USE_MOCK_SERVICE) {
      console.log('🎭 MockRevenueCat: Using MOCK service - no real Apple purchases will occur');
      console.log('🎭 MockRevenueCat: To test real Apple purchases, set ENABLE_REAL_STOREKIT_TESTING = true');
      this.isInitialized = true;
      this.isEnabled = true;
      return MockRevenueCatService.initialize();
    }
    
    console.log('💳 RevenueCat: Using REAL service - Apple purchase UI will appear');
    console.log('💳 RevenueCat: Make sure you have StoreKit testing configured in Xcode');
    console.log('💳 RevenueCat: StoreKit products: gofitai_premium_monthly1, gofitai_premium_lifetime1');
    
    // If already initialized, handle user ID update if needed
    if (this.isInitialized) {
      console.log('[RevenueCat] Already initialized');
      if (userId && this.pendingUserId !== userId) {
        console.log('[RevenueCat] Updating user ID:', userId);
        try {
          await Purchases.logIn(userId);
          this.pendingUserId = userId;
        } catch (error) {
          console.error('[RevenueCat] Failed to update user ID:', error);
        }
      }
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      console.log('[RevenueCat] Initialization already in progress, waiting...');
      try {
        await this.initializationPromise;
        // Handle user ID after initialization completes
        if (userId && this.pendingUserId !== userId) {
          await Purchases.logIn(userId);
          this.pendingUserId = userId;
        }
      } catch (error) {
        console.error('[RevenueCat] Initialization failed:', error);
        this.initializationPromise = null; // Reset so we can try again
        throw error;
      }
      return;
    }

    // Start initialization
    console.log('[RevenueCat] Starting new initialization...');
    this.initializationPromise = this._doInitialize(userId);
    
    try {
      await this.initializationPromise;
    } catch (error) {
      // Reset promise on failure so we can try again
      this.initializationPromise = null;
      throw error;
    }
  }

  private static async _doInitialize(userId?: string): Promise<void> {
    try {
      console.log('[RevenueCat] Starting initialization...');
      console.log('[RevenueCat] Platform:', Platform.OS);
      console.log('[RevenueCat] Development mode:', __DEV__);

      // Store user ID if provided for later use
      if (userId) {
        this.pendingUserId = userId;
        console.log('[RevenueCat] Pending user ID stored:', userId);
      }

      // Configure RevenueCat based on environment
      // Use WARN level to suppress false positive product warnings when products are correctly configured
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
      
      // Detect environment and get appropriate configuration
      const env = detectEnvironment();
      console.log('[RevenueCat] Environment detected:', env.platform, '(' + env.reason + ')');
      
      // SPECIAL CASE: Expo Go
      // Expo Go does not support native modules like RevenueCat.
      // We must disable the service to prevent crashes.
      if (Constants.appOwnership === 'expo') {
        console.warn('[RevenueCat] ⚠️ Expo Go detected. Native RevenueCat module is NOT available.');
        console.warn('[RevenueCat] ℹ️ Disabling RevenueCat service to prevent crashes.');
        console.warn('[RevenueCat] ℹ️ Use a Development Build to test subscriptions.');
        
        this.isInitialized = true;
        this.isEnabled = false;
        return;
      }

      if (!env.apiKey || env.apiKey.includes('dummy_key')) {
        console.warn(`[RevenueCat] ⚠️  ${env.platform.toUpperCase()} API key is missing or using dummy key`);
        
        if (env.platform === 'web') {
          console.warn('[RevenueCat] ℹ️  For Expo Go development, you need a Web Billing API key');
          console.warn('[RevenueCat] ℹ️  Get it from: RevenueCat Dashboard > Apps > [Your App] > API Keys > Web Billing API Key');
          console.warn('[RevenueCat] ℹ️  Add it to your .env as: EXPO_PUBLIC_REVENUECAT_WEB_API_KEY=your_web_key_here');
          console.warn('[RevenueCat] ℹ️  Continuing without RevenueCat - subscription features will be disabled');
          
          // Mark as initialized but disabled for Expo Go without proper keys
          this.isInitialized = true;
          this.isEnabled = false;
          return;
        }
        
        throw new Error(`${env.platform.toUpperCase()} RevenueCat API key not configured`);
      }
      
      // Validate API key format based on platform
      const expectedPrefix = env.platform === 'ios' ? 'appl_' : 
                           env.platform === 'android' ? 'goog_' : 
                           'web_'; // Web keys usually start with 'web_'
      
      if (env.platform !== 'web' && !env.apiKey.startsWith(expectedPrefix)) {
        console.error(`[RevenueCat] ❌ Invalid ${env.platform.toUpperCase()} API key format. Should start with "${expectedPrefix}"`);
        console.error('[RevenueCat] Current key:', env.apiKey.substring(0, 10) + '...');
        throw new Error(`Invalid ${env.platform.toUpperCase()} RevenueCat API key format.`);
      }
      
      console.log(`[RevenueCat] Configuring for ${env.platform} with key:`, env.apiKey.substring(0, 8) + '...');
      console.log('[RevenueCat] Observer mode: false (RevenueCat handles purchases)');
      
      // Configure RevenueCat SDK
      await Purchases.configure({ 
        apiKey: env.apiKey
        // No observer mode - let RevenueCat handle purchases directly
      });
      
      console.log(`[RevenueCat] ${env.platform.toUpperCase()} configuration completed successfully`);

      // Test if the configuration worked by checking if we can access customer info
      try {
        console.log('[RevenueCat] Testing connection by getting customer info...');
        const testCustomerInfo = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] ✅ Connection test successful - can access customer info');
        console.log('[RevenueCat] ✅ RevenueCat is properly connected!');
        console.log('[RevenueCat] Customer ID:', testCustomerInfo.originalAppUserId);
      } catch (testError: any) {
        console.error('[RevenueCat] ❌ Connection test failed - cannot access customer info:', testError);
        console.error('[RevenueCat] ❌ This means RevenueCat is NOT properly connected');
        console.error('[RevenueCat] Error details:', {
          message: testError?.message,
          code: testError?.code,
          domain: testError?.domain
        });
        // Don't throw here, but mark as potentially problematic
        console.warn('[RevenueCat] ⚠️ Continuing initialization, but connection may be unstable');
      }
      
      // Test if we can get offerings (this is the actual feature we need)
      try {
        console.log('[RevenueCat] Testing offerings fetch...');
        const testOfferings = await Purchases.getOfferings();
        console.log('[RevenueCat] ✅ Offerings test successful');
        console.log('[RevenueCat] Current offering:', testOfferings.current?.identifier || 'none');
        console.log('[RevenueCat] Total offerings:', Object.keys(testOfferings.all).length);
        if (testOfferings.current) {
          console.log('[RevenueCat] Packages in current offering:', testOfferings.current.availablePackages.length);
        }
      } catch (offeringsError: any) {
        console.error('[RevenueCat] ❌ Offerings test failed:', offeringsError);
        console.error('[RevenueCat] This means products cannot be fetched from App Store Connect');
        // This is more critical - if we can't get offerings, we can't show products
        throw new Error(`Cannot fetch offerings from RevenueCat: ${offeringsError?.message || 'Unknown error'}`);
      }

      // Only mark as enabled if we can actually fetch offerings
      // This ensures we're truly connected to RevenueCat
      this.isInitialized = true;
      this.isEnabled = true;
      console.log('[RevenueCat] ✅ Successfully initialized and connected to RevenueCat');
      console.log('[RevenueCat] ✅ Ready to fetch products from App Store Connect');
      
      // Set pending user ID if available
      if (this.pendingUserId) {
        try {
          console.log('[RevenueCat] Setting pending user ID...');
          await Purchases.logIn(this.pendingUserId);
          console.log('[RevenueCat] User ID set successfully:', this.pendingUserId);
          this.pendingUserId = null;
        } catch (error) {
          console.error('[RevenueCat] Failed to set pending user ID:', error);
        }
      }
      
    } catch (error) {
      console.error('[RevenueCat] Failed to initialize:', error);
      console.error('[RevenueCat] Initialization error details:', {
        message: error.message,
        stack: error.stack,
        platform: Platform.OS,
        hasApiKey: Platform.OS === 'ios' ? !!REVENUECAT_CONFIG.ios.apiKey : !!REVENUECAT_CONFIG.android.apiKey
      });
      
      // Provide helpful error messages based on common issues
      if (error.message?.includes('Invalid API key')) {
        console.error('[RevenueCat] 🔑 API KEY ISSUE:');
        console.error('[RevenueCat] - Make sure you\'re using the PUBLIC API key (not the secret key)');
        console.error('[RevenueCat] - iOS keys should start with "appl_"');
        console.error('[RevenueCat] - Android keys should start with "goog_"');
        console.error('[RevenueCat] - Get your key from: RevenueCat Dashboard > Your App > API Keys');
      }
      
      if (error.message?.includes('Web Billing API key')) {
        console.error('[RevenueCat] 🚨 WRONG API KEY TYPE:');
        console.error('[RevenueCat] - You\'re using a Web Billing API key');
        console.error('[RevenueCat] - You need the Mobile App PUBLIC API key instead');
        console.error('[RevenueCat] - Go to RevenueCat Dashboard > Your App > API Keys > Public app-specific key');
      }
      
      this.isInitialized = false;
      this.isEnabled = false;
      throw error;
    } finally {
      // Reset the initialization promise so we can retry if needed
      this.initializationPromise = null;
    }
  }

  /**
   * Set user ID for RevenueCat
   */
  static async setUserId(userId: string): Promise<void> {
    try {
      if (USE_MOCK_SERVICE) {
        console.log('🎭 MockRevenueCat: User ID set to', userId);
        return;
      }
      
      if (!this.isInitialized) {
        // Store user ID for when RevenueCat is initialized
        this.pendingUserId = userId;
        console.log('[RevenueCat] Not initialized yet, storing user ID for later:', userId);
        return;
      }
      
      if (!this.isEnabled) {
        console.warn('[RevenueCat] setUserId() called but RevenueCat is disabled - storing for later');
        this.pendingUserId = userId;
        return;
      }
      
      console.log('[RevenueCat] Identifying user with RevenueCat:', userId);
      
      // Check current user ID before attempting to set new one
      const currentCustomerInfo = await Purchases.getCustomerInfo();
      const currentUserId = currentCustomerInfo?.originalAppUserId;
      const isAnonymousId = currentUserId?.startsWith('$RCAnonymousID:');
      
      console.log('[RevenueCat] Current RevenueCat user ID:', currentUserId);
      console.log('[RevenueCat] Is anonymous ID:', isAnonymousId);
      console.log('[RevenueCat] Target user ID:', userId);
      
      // If currently using anonymous ID or different user ID, force login
      if (isAnonymousId || currentUserId !== userId) {
        console.log('[RevenueCat] User ID mismatch or anonymous - forcing login...');
        try {
          const loginResult = await Purchases.logIn(userId);
          console.log('[RevenueCat] Login result:', {
            created: loginResult.created,
            customerInfo: loginResult.customerInfo?.originalAppUserId
          });
          
          // Verify the user ID was set correctly
          const verifyCustomerInfo = await Purchases.getCustomerInfo();
          const verifyUserId = verifyCustomerInfo?.originalAppUserId;
          
          if (verifyUserId === userId) {
            console.log('[RevenueCat] ✅ User ID set successfully and verified:', userId);
            this.pendingUserId = userId;
          } else {
            console.warn('[RevenueCat] ⚠️ User ID set but verification shows different ID:', {
              expected: userId,
              actual: verifyUserId,
              wasAnonymous: isAnonymousId
            });
            // If still anonymous, try one more time after a short delay
            if (verifyUserId?.startsWith('$RCAnonymousID:')) {
              console.log('[RevenueCat] Still anonymous after login, retrying...');
              await new Promise(resolve => setTimeout(resolve, 500));
              const retryResult = await Purchases.logIn(userId);
              const retryVerify = await Purchases.getCustomerInfo();
              if (retryVerify?.originalAppUserId === userId) {
                console.log('[RevenueCat] ✅ User ID set successfully on retry:', userId);
                this.pendingUserId = userId;
              } else {
                console.warn('[RevenueCat] ⚠️ User ID still not set after retry');
              }
            }
          }
        } catch (loginError: any) {
          // Handle case where logIn says user ID is the same
          if (loginError?.message?.includes('same as the one already cached')) {
            console.warn('[RevenueCat] ⚠️ logIn says user ID is same, but verification shows different');
            // Force verify and log the discrepancy
            const verifyInfo = await Purchases.getCustomerInfo();
            console.warn('[RevenueCat] ⚠️ Actual user ID:', verifyInfo?.originalAppUserId);
            console.warn('[RevenueCat] ⚠️ Expected user ID:', userId);
            
            // If still anonymous, try logging out first then back in
            if (verifyInfo?.originalAppUserId?.startsWith('$RCAnonymousID:')) {
              console.log('[RevenueCat] Still anonymous, attempting logout then login...');
              try {
                await Purchases.logOut();
                await new Promise(resolve => setTimeout(resolve, 300));
                await Purchases.logIn(userId);
                const finalVerify = await Purchases.getCustomerInfo();
                if (finalVerify?.originalAppUserId === userId) {
                  console.log('[RevenueCat] ✅ User ID set successfully after logout/login:', userId);
                  this.pendingUserId = userId;
                }
              } catch (retryError) {
                console.error('[RevenueCat] Failed to set user ID after logout/login:', retryError);
              }
            }
          } else {
            throw loginError;
          }
        }
      } else {
        console.log('[RevenueCat] ✅ User ID already set correctly:', userId);
        this.pendingUserId = userId;
      }
    } catch (error: any) {
      console.error('[RevenueCat] Failed to set user ID:', error);
      // Don't throw - allow the app to continue even if RevenueCat user ID setting fails
      // This prevents auth from breaking if RevenueCat has issues
      console.warn('[RevenueCat] Continuing despite user ID setting failure');
    }
  }

  /**
   * Ensure RevenueCat is initialized before any operations (public method)
   */
  static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      console.log('[RevenueCat] Service not initialized, initializing now...');
      await this.initialize();
    }
  }

  /**
   * Check if RevenueCat is enabled and functional
   */
  private static isRevenueCatEnabled(): boolean {
    const enabled = this.isInitialized && this.isEnabled;
    if (!enabled) {
      console.warn('[RevenueCat] ⚠️ RevenueCat is disabled. Reasons:');
      console.warn(`[RevenueCat]   - isInitialized: ${this.isInitialized}`);
      console.warn(`[RevenueCat]   - isEnabled: ${this.isEnabled}`);
      if (!this.isInitialized) {
        console.warn('[RevenueCat]   → RevenueCat has not been initialized yet');
        console.warn('[RevenueCat]   → Make sure RevenueCatService.initialize() is called');
      } else if (!this.isEnabled) {
        console.warn('[RevenueCat]   → RevenueCat initialization failed or was disabled');
        console.warn('[RevenueCat]   → Common causes:');
        console.warn('[RevenueCat]     1. Running in Expo Go (use Development Build instead)');
        console.warn('[RevenueCat]     2. Missing or invalid API key');
        console.warn('[RevenueCat]     3. Initialization error (check logs above)');
      }
    }
    return enabled;
  }

  /**
   * Ensure RevenueCat is initialized before any operations (private method)
   */
  private static async ensureInitializedPrivate(): Promise<void> {
    if (!this.isInitialized) {
      console.log('[RevenueCat] Service not initialized, initializing now...');
      await this.initialize();
    }
    
    if (!this.isEnabled) {
      throw new Error('RevenueCat is not enabled - subscription features are disabled');
    }
    
    if (!this.isInitialized) {
      throw new Error('RevenueCat initialization failed. Please check your API key configuration.');
    }
  }

  /**
   * Get available offerings
   * @param forceRefresh - If true, invalidates cache and fetches fresh offerings
   */
  static async getOfferings(forceRefresh: boolean = false): Promise<PurchasesOffering[]> {
    if (USE_MOCK_SERVICE) {
      const mockOfferings = await MockRevenueCatService.getOfferings();
      return mockOfferings;
    }
    
    // Try to initialize if not already done
    if (!this.isInitialized) {
      console.log('[RevenueCat] getOfferings() called but not initialized, attempting initialization...');
      try {
        await this.initialize();
        // Wait a moment for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error('[RevenueCat] Failed to initialize during getOfferings:', error);
        console.error('[RevenueCat] Error details:', {
          message: error?.message,
          stack: error?.stack
        });
      }
    }
    
    // Check if RevenueCat is enabled
    if (!this.isRevenueCatEnabled()) {
      console.warn('[RevenueCat] ⚠️ getOfferings() called but RevenueCat is disabled');
      console.warn('[RevenueCat] ⚠️ This means products cannot be fetched from App Store Connect');
      console.warn('[RevenueCat] ⚠️ Please check the initialization logs above for details');
      console.warn('[RevenueCat] ⚠️ Common fixes:');
      console.warn('[RevenueCat]   1. If in Expo Go: Use Development Build instead');
      console.warn('[RevenueCat]   2. Check .env file for EXPO_PUBLIC_REVENUECAT_IOS_API_KEY');
      console.warn('[RevenueCat]   3. Verify API key starts with "appl_" for iOS');
      console.warn('[RevenueCat]   4. Restart app after fixing API key');
      return [];
    }
    
    try {
      await this.ensureInitializedPrivate();
      
      // Force refresh by invalidating cache if requested
      if (forceRefresh) {
        console.log('[RevenueCat] 🔄 Force refreshing offerings (invalidating cache)...');
        console.log('[RevenueCat] ⚠️ If products still not found after refresh, RevenueCat servers may need to sync');
        console.log('[RevenueCat] ⚠️ RevenueCat syncs with App Store Connect every 5-10 minutes');
        console.log('[RevenueCat] ⚠️ Even if configured correctly, there can be a delay');
        
        try {
          // Multiple cache invalidation attempts
          console.log('[RevenueCat] Step 1: Refreshing customer info...');
          await Purchases.getCustomerInfo();
          console.log('[RevenueCat] ✅ Customer info refreshed');
          
          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to sync offerings (this might help force a refresh)
          console.log('[RevenueCat] Step 2: Attempting to sync offerings...');
          // Note: RevenueCat SDK doesn't have explicit sync, but getting customer info helps
          
          // Additional wait
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('[RevenueCat] Step 3: Cache invalidation complete');
        } catch (e) {
          console.log('[RevenueCat] Cache invalidation attempt completed (with errors):', e);
        }
      }
      
      // Get offerings - RevenueCat SDK automatically fetches latest from App Store Connect
      // Note: RevenueCat caches offerings for a short period (usually 5-10 minutes)
      // If prices were just updated in App Store Connect, you may need to wait for sync
      const offerings = await Purchases.getOfferings();
      
      console.log('[RevenueCat] 📡 Fetched offerings from RevenueCat servers');
      console.log('[RevenueCat] ℹ️ Prices are fetched from App Store Connect in real-time');
      console.log('[RevenueCat] ℹ️ If prices don\'t match, check:');
      console.log('[RevenueCat]   1. RevenueCat Dashboard → Products → Refresh/Sync button');
      console.log('[RevenueCat]   2. Wait 5-10 minutes for App Store Connect sync');
      console.log('[RevenueCat]   3. Restart app after sync completes');
      
      // Log price information for debugging with validation
      if (offerings.current) {
        console.log('[RevenueCat] 💰 Current prices from App Store Connect:');
        offerings.current.availablePackages.forEach((pkg: any) => {
          const productId = pkg.product?.identifier;
          const price = pkg.product?.priceString;
          const priceValue = pkg.product?.price;
          const currency = pkg.product?.currencyCode;
          
          console.log(`[RevenueCat]   ${productId}: ${price} (${currency}) - Raw value: ${priceValue}`);
          
          // Validate lifetime price
          if (productId === 'gofitai_premium_lifetime1') {
            const expectedPrice = 149.99;
            if (priceValue && Math.abs(priceValue - expectedPrice) > 0.01) {
              console.warn(`[RevenueCat] ⚠️ Lifetime price mismatch detected!`);
              console.warn(`[RevenueCat]   Current from App Store: $${priceValue}`);
              console.warn(`[RevenueCat]   Expected (updated): $${expectedPrice}`);
              console.warn(`[RevenueCat]   Difference: $${Math.abs(priceValue - expectedPrice).toFixed(2)}`);
              console.warn(`[RevenueCat]   This indicates a sync delay between App Store Connect and RevenueCat`);
              console.warn(`[RevenueCat]   Solutions:`);
              console.warn(`[RevenueCat]     1. Go to RevenueCat Dashboard → Products → gofitai_premium_lifetime1`);
              console.warn(`[RevenueCat]     2. Click "Refresh" or "Sync" button`);
              console.warn(`[RevenueCat]     3. Wait 5-10 minutes for sync to complete`);
              console.warn(`[RevenueCat]     4. Restart app and refresh paywall`);
            } else if (priceValue) {
              console.log(`[RevenueCat] ✅ Lifetime price matches expected: $${expectedPrice}`);
            }
          }
        });
      }
      
      console.log('[RevenueCat] 📦 Offerings response:', {
        current: !!offerings.current,
        allCount: Object.keys(offerings.all).length,
        allKeys: Object.keys(offerings.all)
      });
      
      // Log ALL offerings and their packages for debugging
      console.log('[RevenueCat] 🔍 All offerings details:');
      Object.entries(offerings.all).forEach(([key, offering]: [string, any]) => {
        console.log(`[RevenueCat]   Offering "${key}":`, {
          identifier: offering.identifier,
          packageCount: offering.availablePackages?.length || 0,
          packages: offering.availablePackages?.map((p: any) => ({
            identifier: p.identifier,
            productId: p.product?.identifier,
            packageType: p.packageType,
            price: p.product?.priceString
          })) || []
        });
      });
      
      // EXTENSIVE DEBUG: Log every single product ID found
      console.log('[RevenueCat] 🔍 EXTENSIVE DEBUG: All product IDs found in all offerings:');
      const allProductIds: string[] = [];
      Object.values(offerings.all).forEach((offering: any) => {
        offering.availablePackages?.forEach((pkg: any) => {
          if (pkg.product?.identifier) {
            allProductIds.push(pkg.product.identifier);
            console.log(`[RevenueCat]   Found product: ${pkg.product.identifier}`);
            console.log(`[RevenueCat]     Package ID: ${pkg.identifier}`);
            console.log(`[RevenueCat]     Package Type: ${pkg.packageType}`);
            console.log(`[RevenueCat]     Price: ${pkg.product.priceString}`);
            console.log(`[RevenueCat]     Title: ${pkg.product.title}`);
          }
        });
      });
      
      // Check for specific products
      const expectedProducts = [
        'gofitai_premium_monthly1',
        'gofitai_premium_yearly1',
        'gofitai_premium_lifetime1'
      ];
      
      console.log('[RevenueCat] 🔍 Checking for expected products:');
      expectedProducts.forEach((expectedId) => {
        const found = allProductIds.includes(expectedId);
        if (found) {
          console.log(`[RevenueCat]   ✅ ${expectedId}: FOUND`);
          // Find which offering it's in
          Object.entries(offerings.all).forEach(([key, offering]: [string, any]) => {
            const pkg = offering.availablePackages?.find((p: any) => 
              p.product?.identifier === expectedId
            );
            if (pkg) {
              console.log(`[RevenueCat]     → In offering: "${key}"`);
              console.log(`[RevenueCat]     → Package ID: ${pkg.identifier}`);
              console.log(`[RevenueCat]     → Package Type: ${pkg.packageType}`);
            }
          });
        } else {
          console.log(`[RevenueCat]   ❌ ${expectedId}: NOT FOUND`);
          console.log(`[RevenueCat]     ⚠️ Product exists in RevenueCat Dashboard but not in any offering!`);
          console.log(`[RevenueCat]     Check: 1. Product is added to a package`);
          console.log(`[RevenueCat]           2. Package is added to an offering`);
          console.log(`[RevenueCat]           3. Offering is saved and active`);
        }
      });
      
      // Check all offerings to find packages
      const allOfferingsList = Object.values(offerings.all);
      console.log('[RevenueCat] 📋 Found', allOfferingsList.length, 'total offerings');
      
      // Log detailed info about all offerings
      allOfferingsList.forEach((offering: any) => {
        console.log(`[RevenueCat]   Offering "${offering.identifier}":`, {
          packageCount: offering.availablePackages?.length || 0,
          packages: offering.availablePackages?.map((p: any) => ({
          identifier: p.identifier,
          type: p.packageType,
            productId: p.product?.identifier,
            price: p.product?.priceString,
            title: p.product?.title,
            // Additional debug info
            productTitle: p.product?.title,
            productDescription: p.product?.description
          })) || []
        });
        
        // Check specifically for yearly product in this offering
        // Search by product ID first
        const yearlyProductInOffering = offering.availablePackages?.find((p: any) => 
          p.product?.identifier === 'gofitai_premium_yearly1'
        );
        
        // Also search by package identifier patterns (including $rc_annual)
        const yearlyPackageByIdentifier = offering.availablePackages?.find((p: any) => 
          p.identifier?.toLowerCase().includes('yearly') ||
          p.identifier?.toLowerCase().includes('annual') ||
          p.identifier === '$rc_annual' ||
          p.identifier === '$rc_yearly'
        );
        
        // SPECIFIC CHECK: If $rc_annual exists, verify it's linked to the correct product
        const rcAnnualPackage = offering.availablePackages?.find((p: any) => 
          p.identifier === '$rc_annual'
        );
        
        if (rcAnnualPackage) {
          console.log(`[RevenueCat] 🔍 Found $rc_annual package in offering "${offering.identifier}":`);
          console.log(`[RevenueCat]   Package ID: ${rcAnnualPackage.identifier}`);
          console.log(`[RevenueCat]   Package Type: ${rcAnnualPackage.packageType}`);
          console.log(`[RevenueCat]   Product ID: ${rcAnnualPackage.product?.identifier}`);
          console.log(`[RevenueCat]   Expected Product ID: gofitai_premium_yearly1`);
          
          if (rcAnnualPackage.product?.identifier === 'gofitai_premium_yearly1') {
            console.log(`[RevenueCat]   ✅ $rc_annual is correctly linked to gofitai_premium_yearly1`);
          } else {
            console.warn(`[RevenueCat]   ❌ $rc_annual is linked to "${rcAnnualPackage.product?.identifier}" instead of "gofitai_premium_yearly1"`);
            console.warn(`[RevenueCat]   ⚠️ FIX: In RevenueCat Dashboard → Packages → $rc_annual`);
            console.warn(`[RevenueCat]   ⚠️ Change the Product to "gofitai_premium_yearly1"`);
          }
        }
        
        // Also search by package type
        const yearlyPackageByType = offering.availablePackages?.find((p: any) => 
          p.packageType === 'ANNUAL' || p.packageType === 'YEARLY'
        );
        
        if (yearlyProductInOffering) {
          console.log(`[RevenueCat] ✅ Found yearly product in offering "${offering.identifier}" by product ID:`, {
            packageIdentifier: yearlyProductInOffering.identifier,
            packageType: yearlyProductInOffering.packageType,
            productId: yearlyProductInOffering.product?.identifier,
            price: yearlyProductInOffering.product?.priceString
          });
        } else if (yearlyPackageByIdentifier) {
          console.log(`[RevenueCat] ⚠️ Found package with yearly identifier but different product ID:`, {
            packageIdentifier: yearlyPackageByIdentifier.identifier,
            packageType: yearlyPackageByIdentifier.packageType,
            productId: yearlyPackageByIdentifier.product?.identifier,
            expectedProductId: 'gofitai_premium_yearly1',
            match: yearlyPackageByIdentifier.product?.identifier === 'gofitai_premium_yearly1'
          });
          if (yearlyPackageByIdentifier.product?.identifier !== 'gofitai_premium_yearly1') {
            console.warn(`[RevenueCat] ⚠️ Package identifier suggests yearly, but product ID is "${yearlyPackageByIdentifier.product?.identifier}"`);
            console.warn(`[RevenueCat] ⚠️ Expected product ID: "gofitai_premium_yearly1"`);
            console.warn(`[RevenueCat] ⚠️ Fix: In RevenueCat Dashboard, link this package to product "gofitai_premium_yearly1"`);
          }
        } else if (yearlyPackageByType) {
          console.log(`[RevenueCat] ⚠️ Found ANNUAL package type but different product ID:`, {
            packageIdentifier: yearlyPackageByType.identifier,
            packageType: yearlyPackageByType.packageType,
            productId: yearlyPackageByType.product?.identifier,
            expectedProductId: 'gofitai_premium_yearly1',
            match: yearlyPackageByType.product?.identifier === 'gofitai_premium_yearly1'
          });
          if (yearlyPackageByType.product?.identifier !== 'gofitai_premium_yearly1') {
            console.warn(`[RevenueCat] ⚠️ Package type is ANNUAL, but product ID is "${yearlyPackageByType.product?.identifier}"`);
            console.warn(`[RevenueCat] ⚠️ Expected product ID: "gofitai_premium_yearly1"`);
            console.warn(`[RevenueCat] ⚠️ Fix: In RevenueCat Dashboard, link this package to product "gofitai_premium_yearly1"`);
          }
        } else {
          console.log(`[RevenueCat] ❌ Yearly product NOT found in offering "${offering.identifier}"`);
          console.log(`[RevenueCat] 🔍 Searching all packages in this offering for clues...`);
          offering.availablePackages?.forEach((pkg: any, index: number) => {
            console.log(`[RevenueCat]   Package ${index + 1}:`, {
              identifier: pkg.identifier,
              type: pkg.packageType,
              productId: pkg.product?.identifier,
              productTitle: pkg.product?.title
            });
          });
          console.warn(`[RevenueCat] ⚠️ None of the packages match "gofitai_premium_yearly1"`);
          console.warn(`[RevenueCat] ⚠️ Make sure in RevenueCat Dashboard:`);
          console.warn(`[RevenueCat]    1. Product "gofitai_premium_yearly1" exists in Products tab`);
          console.warn(`[RevenueCat]    2. A package is created and linked to "gofitai_premium_yearly1"`);
          console.warn(`[RevenueCat]    3. Package type is set to "ANNUAL" or "YEARLY"`);
          console.warn(`[RevenueCat]    4. Package is added to offering "${offering.identifier}"`);
        }
      });
      
      // IMPORTANT: Collect packages from ALL offerings, not just current
      // This ensures we don't miss packages that might be in other offerings
      const allPackagesFromAllOfferings: any[] = [];
      allOfferingsList.forEach((offering: any) => {
        if (offering.availablePackages && offering.availablePackages.length > 0) {
          allPackagesFromAllOfferings.push(...offering.availablePackages);
          console.log(`[RevenueCat] Collected ${offering.availablePackages.length} packages from offering "${offering.identifier}"`);
        }
      });
      
      // Remove duplicates by identifier
      const uniquePackages = Array.from(
        new Map(allPackagesFromAllOfferings.map((pkg: any) => [pkg.identifier, pkg])).values()
      );
      
      console.log(`[RevenueCat] 📦 Total unique packages from all offerings: ${uniquePackages.length}`);
      console.log('[RevenueCat] All unique packages:', uniquePackages.map((p: any) => ({
        identifier: p.identifier,
        type: p.packageType,
        productId: p.product?.identifier,
        price: p.product?.priceString
        })));
        
      // Check for yearly product across ALL packages
      // Also specifically check for $rc_annual package
      const yearlyPackage = uniquePackages.find((p: any) => 
        p.product?.identifier === 'gofitai_premium_yearly1' ||
        (p.packageType === 'ANNUAL' && p.product?.identifier?.includes('yearly')) ||
        p.identifier === '$rc_annual'
      );
      
      // If $rc_annual exists, check if it's linked to the correct product
      const rcAnnualInAll = uniquePackages.find((p: any) => p.identifier === '$rc_annual');
      if (rcAnnualInAll) {
        console.log(`[RevenueCat] 🔍 Found $rc_annual in all packages:`);
        console.log(`[RevenueCat]   Product ID: ${rcAnnualInAll.product?.identifier}`);
        console.log(`[RevenueCat]   Package Type: ${rcAnnualInAll.packageType}`);
        console.log(`[RevenueCat]   Price: ${rcAnnualInAll.product?.priceString}`);
        
        if (rcAnnualInAll.product?.identifier !== 'gofitai_premium_yearly1') {
          console.warn(`[RevenueCat]   ⚠️ $rc_annual package exists but is linked to "${rcAnnualInAll.product?.identifier}"`);
          console.warn(`[RevenueCat]   ⚠️ Expected: "gofitai_premium_yearly1"`);
          console.warn(`[RevenueCat]   ⚠️ This is why the yearly product can't be found!`);
          console.warn(`[RevenueCat]   ⚠️ FIX: RevenueCat Dashboard → Packages → $rc_annual → Change Product to "gofitai_premium_yearly1"`);
        } else {
          console.log(`[RevenueCat]   ✅ $rc_annual is correctly linked to gofitai_premium_yearly1`);
        }
      }
      
      if (yearlyPackage) {
        console.log('[RevenueCat] ✅ Found yearly package across all offerings:', {
          identifier: yearlyPackage.identifier,
          type: yearlyPackage.packageType,
          productId: yearlyPackage.product?.identifier,
          price: yearlyPackage.product?.priceString
        });
      } else {
        console.warn('[RevenueCat] ❌ Yearly package NOT found in ANY offering');
        console.warn('[RevenueCat] Searched for:');
        console.warn('[RevenueCat]   - Product ID: gofitai_premium_yearly1');
        console.warn('[RevenueCat]   - Package type: ANNUAL');
        console.warn('[RevenueCat] Found packages:', uniquePackages.map((p: any) => ({
          productId: p.product?.identifier,
          type: p.packageType
        })));
      }
      
      // Use current offering if available, but merge with packages from other offerings
      if (offerings.current !== null) {
        console.log('[RevenueCat] ✅ Current offering:', offerings.current.identifier, 'with', offerings.current.availablePackages.length, 'packages');
        
        // Merge current offering packages with unique packages from all offerings
        // This ensures we have all packages even if they're in different offerings
        const mergedPackages = Array.from(
          new Map([
            ...offerings.current.availablePackages.map((p: any) => [p.identifier, p]),
            ...uniquePackages.map((p: any) => [p.identifier, p])
          ]).values()
        );
        
        console.log(`[RevenueCat] 📦 Merged packages: ${mergedPackages.length} total`);
        
        // Return current offering but with merged packages
        return [{
          ...offerings.current,
          availablePackages: mergedPackages
        }];
      }
      
      // If no current offering, create a combined offering with all packages
      console.log('[RevenueCat] ⚠️ No current offering, creating combined offering with all packages');
      if (uniquePackages.length > 0) {
        return [{
          identifier: 'combined',
          description: 'Combined offering from all available offerings',
          availablePackages: uniquePackages
        }];
      }
      
      return allOfferingsList;
    } catch (error) {
      console.error('[RevenueCat] Failed to get offerings:', error);
      
      // TEMPORARY: Return mock offerings for dashboard configuration period
      if (__DEV__ && (error.message?.includes('None of the products registered') || error.message?.includes('Couldn\'t find package'))) {
        console.log('[RevenueCat] 🔧 USING MOCK OFFERINGS - Configure RevenueCat dashboard!');
        console.log('[RevenueCat] 🔧 Error was:', error.message);
        return this.getMockOfferings();
      }
      
      throw error;
    }
  }

  /**
   * Compare products from App Store Connect vs RevenueCat
   * This helps diagnose sync issues
   */
  static async compareProductsWithAppStore(productIds: string[]): Promise<void> {
    console.log('[RevenueCat] 🔍 COMPARING: App Store Connect vs RevenueCat');
    console.log('[RevenueCat] ============================================');
    
    // Fetch from App Store Connect directly (if available)
    let appStoreProducts: any[] = [];
    if (Platform.OS === 'ios' && StoreKitDirectFetcherService.isNativeModuleAvailable) {
      try {
        appStoreProducts = await StoreKitDirectFetcherService.fetchProductsDirectly(productIds);
        console.log('[RevenueCat] ✅ App Store Connect: Found', appStoreProducts.length, 'products');
      } catch (error) {
        console.warn('[RevenueCat] ⚠️ Could not fetch from App Store Connect directly:', error);
      }
    } else {
      console.log('[RevenueCat] ⚠️ Native StoreKit module not available - cannot fetch directly');
    }
    
    // Fetch from RevenueCat
    let revenueCatProducts: any[] = [];
    try {
      const offerings = await this.getOfferings(true);
      const allPackages: any[] = [];
      offerings.forEach((offering: any) => {
        if (offering.availablePackages) {
          allPackages.push(...offering.availablePackages);
        }
      });
      
      revenueCatProducts = allPackages
        .filter((pkg: any) => pkg.product && productIds.includes(pkg.product.identifier))
        .map((pkg: any) => ({
          identifier: pkg.product.identifier,
          price: pkg.product.price,
          priceString: pkg.product.priceString,
          currencyCode: pkg.product.currencyCode,
          title: pkg.product.title,
          packageType: pkg.packageType,
          packageIdentifier: pkg.identifier
        }));
      
      console.log('[RevenueCat] ✅ RevenueCat: Found', revenueCatProducts.length, 'products');
    } catch (error) {
      console.error('[RevenueCat] ❌ Could not fetch from RevenueCat:', error);
    }
    
    // Compare
    console.log('[RevenueCat] ============================================');
    console.log('[RevenueCat] 📊 COMPARISON RESULTS:');
    
    productIds.forEach((productId) => {
      const appStoreProduct = appStoreProducts.find((p: any) => p.identifier === productId);
      const revenueCatProduct = revenueCatProducts.find((p: any) => p.identifier === productId);
      
      console.log(`[RevenueCat] --- ${productId} ---`);
      
      if (appStoreProduct) {
        console.log(`[RevenueCat]   App Store Connect: ✅ Found`);
        console.log(`[RevenueCat]     Price: ${appStoreProduct.displayPrice} (Raw: ${appStoreProduct.price})`);
      } else {
        console.log(`[RevenueCat]   App Store Connect: ❌ NOT FOUND`);
      }
      
      if (revenueCatProduct) {
        console.log(`[RevenueCat]   RevenueCat: ✅ Found`);
        console.log(`[RevenueCat]     Price: ${revenueCatProduct.priceString} (Raw: ${revenueCatProduct.price})`);
        console.log(`[RevenueCat]     Package Type: ${revenueCatProduct.packageType}`);
        console.log(`[RevenueCat]     Package ID: ${revenueCatProduct.packageIdentifier}`);
      } else {
        console.log(`[RevenueCat]   RevenueCat: ❌ NOT FOUND`);
        console.log(`[RevenueCat]     ⚠️ Product exists in App Store Connect but RevenueCat can't find it`);
        console.log(`[RevenueCat]     Check: 1. Product added to RevenueCat Dashboard`);
        console.log(`[RevenueCat]           2. Package created and linked`);
        console.log(`[RevenueCat]           3. Package added to offering`);
        console.log(`[RevenueCat]           4. Wait 10-15 minutes for sync`);
      }
      
      if (appStoreProduct && revenueCatProduct) {
        const priceDiff = Math.abs(appStoreProduct.price - revenueCatProduct.price);
        if (priceDiff > 0.01) {
          console.log(`[RevenueCat]   ⚠️ PRICE MISMATCH!`);
          console.log(`[RevenueCat]     App Store: ${appStoreProduct.price}`);
          console.log(`[RevenueCat]     RevenueCat: ${revenueCatProduct.price}`);
          console.log(`[RevenueCat]     Difference: ${priceDiff.toFixed(2)}`);
          console.log(`[RevenueCat]     → RevenueCat needs to sync with App Store Connect`);
          console.log(`[RevenueCat]     → Go to RevenueCat Dashboard → Products → ${productId} → Refresh`);
        } else {
          console.log(`[RevenueCat]   ✅ Prices match`);
        }
      }
      
      console.log('');
    });
    
    console.log('[RevenueCat] ============================================');
  }

  /**
   * Fetch products directly from App Store Connect using StoreKit 2 (iOS only)
   * 
   * This method uses a native iOS module to fetch products directly from App Store Connect,
   * completely bypassing RevenueCat's cache and servers.
   * 
   * On Android or if native module is unavailable, falls back to RevenueCat.
   * 
   * @param productIds - Array of product IDs to fetch
   * @returns Array of products with their current prices directly from App Store Connect
   */
  static async fetchProductsDirectlyFromAppStore(productIds: string[]): Promise<any[]> {
    // Try native StoreKit 2 module first (iOS only, true direct fetch)
    if (Platform.OS === 'ios' && StoreKitDirectFetcherService.isNativeModuleAvailable) {
      console.log('[RevenueCat] 🍎 Using native StoreKit 2 module for direct App Store Connect fetch');
      try {
        const directProducts = await StoreKitDirectFetcherService.fetchProductsDirectly(productIds);
        
        if (directProducts.length > 0) {
          // Convert StoreKit format to RevenueCat-like format for compatibility
          return directProducts.map((product: any) => ({
            identifier: product.identifier,
            price: product.price,
            priceString: product.displayPrice,
            currencyCode: product.currencyCode,
            title: product.displayName,
            description: product.description,
            rawProduct: product
          }));
        }
      } catch (error: any) {
        console.warn('[RevenueCat] ⚠️ Native StoreKit fetch failed, falling back to RevenueCat:', error);
        // Fall through to RevenueCat fallback
      }
    }

    // Fallback to RevenueCat (goes through RevenueCat servers)
    if (USE_MOCK_SERVICE) {
      console.log('[RevenueCat] ⚠️ Cannot fetch products - using mock service');
      return [];
    }

    if (!this.isInitialized) {
      console.log('[RevenueCat] Initializing before fetching products...');
      await this.initialize();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!this.isRevenueCatEnabled()) {
      console.warn('[RevenueCat] ⚠️ Cannot fetch products - RevenueCat is disabled');
      return [];
    }

    try {
      console.log('[RevenueCat] 🔄 Fetching products through RevenueCat (fallback method)...');
      console.log('[RevenueCat] ⚠️ NOTE: This goes through RevenueCat servers, not directly to App Store Connect');
      console.log('[RevenueCat] 📋 Product IDs:', productIds);

      // RevenueCat SDK doesn't have a direct method to fetch products by ID
      // It always goes through RevenueCat's backend servers
      // We can only force a cache refresh to get the latest data from RevenueCat's servers
      
      // Force refresh to get latest data from RevenueCat's servers
      await Purchases.getCustomerInfo(); // This triggers a refresh
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for sync
      
      // This still goes through RevenueCat's servers, not directly to App Store Connect
      const offerings = await Purchases.getOfferings();
      
      // Extract all products from all offerings
      const allProducts: any[] = [];
      const allOfferingsList = Object.values(offerings.all);
      
      allOfferingsList.forEach((offering: any) => {
        offering.availablePackages?.forEach((pkg: any) => {
          if (pkg.product && productIds.includes(pkg.product.identifier)) {
            allProducts.push({
              identifier: pkg.product.identifier,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
              title: pkg.product.title,
              description: pkg.product.description,
              packageType: pkg.packageType,
              packageIdentifier: pkg.identifier,
              // Raw product data
              rawProduct: pkg.product
            });
          }
        });
      });

      console.log('[RevenueCat] ✅ Fetched products through RevenueCat:');
      console.log('[RevenueCat] ⚠️ These prices are from RevenueCat\'s cache of App Store Connect data');
      console.log('[RevenueCat] ⚠️ If prices are outdated, sync in RevenueCat Dashboard first');
      allProducts.forEach((product) => {
        console.log(`[RevenueCat]   ${product.identifier}: ${product.priceString} (${product.currencyCode})`);
        console.log(`[RevenueCat]     Raw price value: ${product.price}`);
        console.log(`[RevenueCat]     Title: ${product.title}`);
      });

      // Check for missing products
      const foundIds = allProducts.map(p => p.identifier);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      if (missingIds.length > 0) {
        console.warn('[RevenueCat] ⚠️ Some products not found:');
        missingIds.forEach(id => {
          console.warn(`[RevenueCat]   ❌ ${id} - Not found in any offering`);
          console.warn(`[RevenueCat]   Check: 1. Product exists in App Store Connect`);
          console.warn(`[RevenueCat]         2. Product is approved/ready`);
          console.warn(`[RevenueCat]         3. Product is added to RevenueCat Dashboard`);
          console.warn(`[RevenueCat]         4. Product is in an active offering`);
          console.warn(`[RevenueCat]         5. RevenueCat Dashboard → Products → Refresh/Sync`);
        });
      }

      return allProducts;
    } catch (error: any) {
      console.error('[RevenueCat] ❌ Failed to fetch products directly from App Store:', error);
      console.error('[RevenueCat] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      return [];
    }
  }

  /**
   * TEMPORARY: Mock offerings for testing while dashboard is being configured
   */
  private static getMockOfferings(): any[] {
    console.log('[RevenueCat] 🚧 Using mock offerings - CONFIGURE DASHBOARD!');
    
    const mockPackages = [
      {
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: 'gofitai_premium_monthly1',
          description: 'Premium Monthly Subscription - 7-day free trial, then $9.99/month',
          title: 'GoFitAI Premium Monthly',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
          introPrice: {
            price: 0,
            priceString: 'Free for 7 days',
            period: 'P1W', // 1 week
            cycles: 1,
            periodUnit: 'week',
            periodNumberOfUnits: 1
          }
        },
        offeringIdentifier: 'default'
      },
      {
        identifier: '$rc_lifetime',
        packageType: 'LIFETIME',
        product: {
          identifier: 'gofitai_premium_lifetime1',
          description: 'Premium Lifetime Access - One-time payment, yours forever!',
          title: 'GoFitAI Premium Lifetime',
          price: 149.99,
          priceString: '$149.99',
          currencyCode: 'USD'
        },
        offeringIdentifier: 'default'
      }
    ];

    return [{
      identifier: 'default',
      description: 'GoFitAI Premium Plans',
      availablePackages: mockPackages,
      lifetime: mockPackages[1],
      monthly: mockPackages[0]
    }];
  }

  /**
   * Get current offering (primary offering)
   */
  static async getCurrentOffering(): Promise<PurchasesOffering | null> {
    try {
      console.log('[RevenueCat] getCurrentOffering() called, checking initialization...');
      
      // Check if RevenueCat is enabled
      if (!this.isRevenueCatEnabled()) {
        console.warn('[RevenueCat] getCurrentOffering() called but RevenueCat is disabled - returning null');
        return null;
      }
      
      // Ensure we're properly initialized
      await this.ensureInitializedPrivate();
      
      console.log('[RevenueCat] Attempting to get offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Successfully got offerings, current:', !!offerings.current);
      return offerings.current;
    } catch (error) {
      console.error('[RevenueCat] Failed to get current offering:', error);
      console.error('[RevenueCat] Error details:', {
        message: error.message,
        isInitialized: this.isInitialized,
        initPromise: !!this.initializationPromise
      });
      
      // TEMPORARY: Return mock offering for dashboard configuration period
      if (__DEV__ && (error.message?.includes('None of the products registered') || error.message?.includes('singleton instance'))) {
        console.log('[RevenueCat] 🔧 USING MOCK CURRENT OFFERING due to:', error.message);
        const mockOfferings = this.getMockOfferings();
        return mockOfferings[0] || null;
      }
      
      return null;
    }
  }

  /**
   * Check if the user is within a grace period
   * This checks both:
   * 1. RevenueCat's built-in grace period status (from App Store's 16-day billing grace period)
   * 2. A 24-hour buffer for edge cases
   */
  private static checkGracePeriod(
    entitlement: any, 
    expirationDateString: string | null | undefined
  ): boolean {
    // First, check if RevenueCat indicates grace period via periodType
    // RevenueCat sets periodType to 'GRACE_PERIOD' when App Store grace period is active
    if (entitlement?.periodType === 'GRACE_PERIOD') {
      console.log('[RevenueCat] 🛡️ User is in App Store billing grace period (16 days)');
      return true;
    }
    
    // Fallback: Check expiration date with 24-hour buffer for edge cases
    if (!expirationDateString) return false;
    
    try {
      const expirationDate = new Date(expirationDateString);
      const now = new Date();
      const oneDayBuffer = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      // If expiration date + 1 day is still in the future, allow access
      if (expirationDate.getTime() + oneDayBuffer > now.getTime()) {
        console.log('[RevenueCat] 🛡️ User is in 24-hour grace buffer period');
        return true;
      }
    } catch (e) {
      console.error('[RevenueCat] Error checking grace period:', e);
    }
    
    return false;
  }

  /**
   * Check if user has active premium subscription
   */
  static async isPremiumActive(): Promise<boolean> {
    if (USE_MOCK_SERVICE) {
      return MockRevenueCatService.isPremiumActive();
    }
    
    try {
      await this.initialize();
      
      // Check if service is enabled (e.g., false in Expo Go)
      if (!this.isEnabled) {
        console.log('[RevenueCat] Service disabled - returning false for premium check');
        return false;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      
      // Log all entitlements for debugging
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));
      
      // Check for specific entitlement
      const premiumEntitlementId = REVENUECAT_CONFIG.entitlements.premium;
      const premiumEntitlement = customerInfo.entitlements.active[premiumEntitlementId];
      
      // RevenueCat automatically includes entitlements in 'active' during App Store's 16-day grace period
      // So if it's in active, user has access (whether it's fully active or in grace period)
      if (premiumEntitlement) {
        if (premiumEntitlement.periodType === 'GRACE_PERIOD') {
          console.log('[RevenueCat] ✅ User has active entitlement in App Store billing grace period (16 days)');
        }
        return true;
      }

      // Check for grace period on expired entitlement
      // RevenueCat automatically includes entitlements in 'active' during App Store's 16-day grace period
      // But we also check 'all' entitlements for grace period status
      const expiredEntitlement = customerInfo.entitlements.all[premiumEntitlementId];
      if (expiredEntitlement) {
        // Check if in grace period (App Store's 16-day billing grace period or 24h buffer)
        if (this.checkGracePeriod(expiredEntitlement, expiredEntitlement.expirationDate)) {
          console.log('[RevenueCat] User granted access via grace period');
          return true;
        }
      }
      
      // Fallback: Check if ANY entitlement is active (robustness against naming mismatches)
      // If the user has *any* active entitlement, they are likely premium.
      // Note: RevenueCat includes entitlements in 'active' during App Store's 16-day grace period
      const activeEntitlements = Object.values(customerInfo.entitlements.active);
      if (activeEntitlements.length > 0) {
        console.log('[RevenueCat] Found active entitlement (name mismatch?) - treating as Premium');
        return true;
      }

      // Fallback: Check grace period for ANY expired entitlement
      const allEntitlements = Object.values(customerInfo.entitlements.all);
      for (const entitlement of allEntitlements) {
        if (this.checkGracePeriod(entitlement, entitlement.expirationDate)) {
          console.log('[RevenueCat] User granted access via grace period (fallback entitlement)');
          return true;
        }
      }

      return false;
      
    } catch (error) {
      console.error('[RevenueCat] Failed to check premium status:', error);
      return false;
    }
  }

  /**
   * Get detailed subscription information
   */
  static async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    if (USE_MOCK_SERVICE) {
      return MockRevenueCatService.getSubscriptionInfo();
    }
    
    try {
      await this.initialize();
      
      // Check if service is enabled (e.g., false in Expo Go)
      if (!this.isEnabled) {
        console.log('[RevenueCat] Service disabled - returning default subscription info');
        return { isPremium: false };
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const premiumId = REVENUECAT_CONFIG.entitlements.premium;
      
      let premiumEntitlement = customerInfo.entitlements.active[premiumId];
      let isInGracePeriod = false;
      
      // Check if active entitlement is in grace period
      // RevenueCat automatically includes entitlements in 'active' during App Store's 16-day grace period
      if (premiumEntitlement && premiumEntitlement.periodType === 'GRACE_PERIOD') {
        isInGracePeriod = true;
        console.log('[RevenueCat] Active entitlement is in App Store billing grace period (16 days)');
      }
      
      // Check for grace period if not active
      // Note: RevenueCat automatically includes entitlements in 'active' during App Store's 16-day grace period
      // But we also check 'all' entitlements for grace period status
      if (!premiumEntitlement) {
        const expiredEntitlement = customerInfo.entitlements.all[premiumId];
        if (expiredEntitlement && this.checkGracePeriod(expiredEntitlement, expiredEntitlement.expirationDate)) {
          premiumEntitlement = expiredEntitlement;
          isInGracePeriod = true;
        }
      }
      
      // Fallback: If specific entitlement not found, check if ANY entitlement is active or in grace period
      if (!premiumEntitlement) {
        // Check active first
        // Note: RevenueCat includes entitlements in 'active' during App Store's 16-day grace period
        const activeEntitlements = Object.values(customerInfo.entitlements.active);
        if (activeEntitlements.length > 0) {
          console.log('[RevenueCat] Using fallback active entitlement:', activeEntitlements[0].identifier);
          premiumEntitlement = activeEntitlements[0];
          // Check if this active entitlement is actually in grace period
          if (premiumEntitlement.periodType === 'GRACE_PERIOD') {
            isInGracePeriod = true;
          }
        } 
        // Check all (for grace period)
        else {
          const allEntitlements = Object.values(customerInfo.entitlements.all);
          for (const entitlement of allEntitlements) {
            if (this.checkGracePeriod(entitlement, entitlement.expirationDate)) {
              console.log('[RevenueCat] Using fallback expired entitlement (grace period):', entitlement.identifier);
              premiumEntitlement = entitlement;
              isInGracePeriod = true;
              break;
            }
          }
        }
      }
      
      if (!premiumEntitlement) {
        return { isPremium: false };
      }

      // Determine period type from product ID
      let periodType: 'monthly' | 'lifetime' = 'monthly';
      if (premiumEntitlement.productIdentifier.includes('lifetime')) {
        periodType = 'lifetime';
      }

      // Log entitlement details for debugging
      console.log('[RevenueCat] Premium entitlement details:', {
        productId: premiumEntitlement.productIdentifier,
        expirationDate: premiumEntitlement.expirationDate,
        willRenew: premiumEntitlement.willRenew,
        periodType: premiumEntitlement.periodType,
        originalPurchaseDate: premiumEntitlement.originalPurchaseDate,
        isInGracePeriod,
        latestPurchaseDate: premiumEntitlement.latestPurchaseDate,
        // Check for trial period info
        introPrice: (premiumEntitlement as any).introPrice,
      });

      // For monthly subscriptions, ensure we have an expiration date
      // RevenueCat's expirationDate should already account for the 7-day free trial:
      // - If user is in trial: expirationDate = trial end date (7 days from purchase)
      // - If trial ended: expirationDate = next renewal date (30 days from trial end)
      let expirationDate = premiumEntitlement.expirationDate;
      
      if (!expirationDate && periodType === 'monthly' && premiumEntitlement.originalPurchaseDate) {
        console.warn('[RevenueCat] Missing expiration date for monthly subscription');
        
        // Check if user might still be in trial period
        const purchaseDate = new Date(premiumEntitlement.originalPurchaseDate);
        const now = new Date();
        const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If less than 7 days since purchase, they're likely in trial
        // Trial ends 7 days from purchase, then subscription renews 30 days after trial end
        if (daysSincePurchase < 7) {
          // Still in trial - expiration date is trial end (7 days from purchase)
          const trialEnd = new Date(purchaseDate);
          trialEnd.setDate(trialEnd.getDate() + 7);
          expirationDate = trialEnd.toISOString();
          console.log('[RevenueCat] User in trial period, expiration date = trial end:', expirationDate);
        } else {
          // Trial ended - next renewal is 30 days after trial end
          const trialEnd = new Date(purchaseDate);
          trialEnd.setDate(trialEnd.getDate() + 7);
          const nextRenewal = new Date(trialEnd);
          nextRenewal.setDate(nextRenewal.getDate() + 30);
          expirationDate = nextRenewal.toISOString();
          console.log('[RevenueCat] Trial ended, next renewal date:', expirationDate);
        }
      }

      return {
        isPremium: true,
        productId: premiumEntitlement.productIdentifier,
        expirationDate: expirationDate || undefined,
        willRenew: premiumEntitlement.willRenew,
        periodType,
        originalPurchaseDate: premiumEntitlement.originalPurchaseDate,
        isInGracePeriod
      };
      
    } catch (error) {
      console.error('[RevenueCat] Failed to get subscription info:', error);
      return { isPremium: false };
    }
  }

  /**
   * Purchase a package
   * @param packageToPurchase - The package to purchase
   */
  static async purchasePackage(
    packageToPurchase: PurchasesPackage
  ): Promise<PurchaseResult> {
    if (USE_MOCK_SERVICE) {
      return MockRevenueCatService.purchasePackage(packageToPurchase);
    }
    
    // Check if RevenueCat is enabled
    if (!this.isRevenueCatEnabled()) {
      console.warn('[RevenueCat] purchasePackage() called but RevenueCat is disabled');
      return {
        success: false,
        error: 'Subscription features are currently disabled'
      };
    }
    
    try {
      await this.initialize();
      
      // CRITICAL: Ensure user ID is set before purchase to avoid anonymous purchases
      // Get current user ID from auth context if available
      const currentCustomerInfo = await Purchases.getCustomerInfo();
      const currentUserId = currentCustomerInfo?.originalAppUserId;
      const isAnonymous = currentUserId?.startsWith('$RCAnonymousID:');
      
      console.log('[RevenueCat] 💳 Pre-purchase user ID check:', {
        currentUserId,
        isAnonymous,
        pendingUserId: this.pendingUserId
      });
      
      // If user is anonymous and we have a pending user ID, set it before purchase
      if (isAnonymous && this.pendingUserId) {
        console.log('[RevenueCat] ⚠️ User is anonymous before purchase - setting user ID first');
        console.log('[RevenueCat] ⚠️ This prevents purchase from being associated with anonymous ID');
        try {
          await this.setUserId(this.pendingUserId);
          // Wait a moment for RevenueCat to sync
          await new Promise(resolve => setTimeout(resolve, 500));
          // Verify user ID was set
          const verifyInfo = await Purchases.getCustomerInfo();
          if (verifyInfo?.originalAppUserId?.startsWith('$RCAnonymousID:')) {
            console.error('[RevenueCat] ❌ User ID still anonymous after setUserId - purchase may be anonymous!');
          } else {
            console.log('[RevenueCat] ✅ User ID set successfully before purchase');
          }
        } catch (userIdError) {
          console.error('[RevenueCat] ❌ Failed to set user ID before purchase:', userIdError);
          console.error('[RevenueCat] ❌ Purchase may be associated with anonymous ID!');
        }
      }
      
      let customerInfo;
      
      const packageType = (packageToPurchase as any).packageType;
      const isLifetime = packageType === 'LIFETIME';
      
      console.log('[RevenueCat] 💳 Processing purchase for package:', packageToPurchase.identifier);
      console.log('[RevenueCat] 💳 Package type:', packageType);
      console.log('[RevenueCat] 💳 Product ID:', packageToPurchase.product.identifier);
      console.log('[RevenueCat] 💳 Product price:', packageToPurchase.product.priceString);
      console.log('[RevenueCat] 💳 Is Lifetime:', isLifetime);
        
        // For lifetime purchases, ensure we're calling purchasePackage correctly
        if (isLifetime) {
          console.log('[RevenueCat] 💎 Lifetime purchase - this should trigger Apple payment sheet');
          console.log('[RevenueCat] 💎 Package details:', {
            identifier: packageToPurchase.identifier,
            productId: packageToPurchase.product.identifier,
            price: packageToPurchase.product.priceString,
            packageType: packageType
          });
        }
        
        try {
          // Check if product is already owned before attempting purchase
          console.log('[RevenueCat] 🔍 Checking if product is already owned...');
          const currentCustomerInfo = await Purchases.getCustomerInfo();
          const productId = packageToPurchase.product.identifier;
          
          // Check if user already owns this product (for lifetime purchases)
          if (isLifetime) {
            const hasProductInTransactions = currentCustomerInfo.nonSubscriptionTransactions?.some(
              (transaction: any) => transaction.productIdentifier === productId
            );
            const premiumEntitlement = currentCustomerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.premium];
            const hasProductInEntitlements = premiumEntitlement?.productIdentifier === productId;
            const hasProduct = hasProductInTransactions || hasProductInEntitlements;
            
            console.log('[RevenueCat] 🔍 Ownership check (before purchase):', {
              hasProductInTransactions,
              hasProductInEntitlements,
              hasProduct,
              productId,
              premiumEntitlementProductId: premiumEntitlement?.productIdentifier,
              nonSubscriptionTransactions: currentCustomerInfo.nonSubscriptionTransactions?.map((t: any) => ({
                productId: t.productIdentifier,
                purchaseDate: t.purchaseDate
              })) || [],
              activeEntitlements: Object.keys(currentCustomerInfo.entitlements.active || {}),
              allEntitlementProductIds: Object.values(currentCustomerInfo.entitlements.active || {}).map((e: any) => e.productIdentifier)
            });
            
            if (hasProduct) {
              console.warn('[RevenueCat] ⚠️ User already owns this lifetime product');
              console.warn('[RevenueCat] ⚠️ Previous purchase found:', {
                purchaseDate: currentCustomerInfo.nonSubscriptionTransactions?.find(
                  (t: any) => t.productIdentifier === productId
                )?.purchaseDate,
                transactionCount: currentCustomerInfo.nonSubscriptionTransactions?.length || 0
              });
              
              // In development, allow attempting purchase anyway (StoreKit test environment may allow it)
              // In production, this check prevents unnecessary API calls
              if (__DEV__) {
                console.warn('[RevenueCat] ⚠️ Development mode: Allowing purchase attempt despite ownership');
                console.warn('[RevenueCat] ⚠️ StoreKit test environment may allow re-purchase');
                console.warn('[RevenueCat] ⚠️ Proceeding with purchase - Apple will handle the actual purchase logic');
                // Continue to purchase - let Apple/StoreKit decide if purchase is allowed
              } else {
                console.warn('[RevenueCat] ⚠️ Production mode: Blocking purchase - user already owns product');
                console.warn('[RevenueCat] ⚠️ This is why the payment sheet is not appearing');
                console.warn('[RevenueCat] ⚠️ If this is a new account, this may indicate:');
                console.warn('[RevenueCat]    1. StoreKit test configuration issue');
                console.warn('[RevenueCat]    2. Previous test purchase not cleared');
                console.warn('[RevenueCat]    3. RevenueCat sync issue');
                return {
                  success: false,
                  error: 'You already own this product. Please restore your purchases if you believe this is an error.'
                };
              }
            }
            console.log('[RevenueCat] ✅ Product not owned, proceeding with purchase');
            console.log('[RevenueCat] ✅ Apple payment sheet should appear now');
          }
          
          // Validate package object before calling purchasePackage
          if (!packageToPurchase || !packageToPurchase.product) {
            console.error('[RevenueCat] ❌ Invalid package object:', packageToPurchase);
            return {
              success: false,
              error: 'Invalid package object. Please try again.'
            };
          }
          
          // Validate product identifier
          if (!packageToPurchase.product.identifier) {
            console.error('[RevenueCat] ❌ Package missing product identifier');
            return {
              success: false,
              error: 'Package is missing product identifier. Please try again.'
            };
          }
          
          console.log('[RevenueCat] 💳 Calling Purchases.purchasePackage() - Apple payment sheet should appear now');
          console.log('[RevenueCat] 💳 Package validation:', {
            packageExists: !!packageToPurchase,
            packageIdentifier: packageToPurchase.identifier,
            packageType: (packageToPurchase as any).packageType,
            productExists: !!packageToPurchase.product,
            productId: packageToPurchase.product.identifier,
            productTitle: packageToPurchase.product.title,
            productPrice: packageToPurchase.product.priceString,
            productPriceValue: packageToPurchase.product.price,
            productCurrency: packageToPurchase.product.currencyCode,
            isLifetime: isLifetime
          });
          
          // Log the actual package object structure for debugging
          console.log('[RevenueCat] 💳 Full package object:', JSON.stringify({
            identifier: packageToPurchase.identifier,
            packageType: (packageToPurchase as any).packageType,
            product: {
              identifier: packageToPurchase.product.identifier,
              title: packageToPurchase.product.title,
              description: packageToPurchase.product.description,
              price: packageToPurchase.product.price,
              priceString: packageToPurchase.product.priceString,
              currencyCode: packageToPurchase.product.currencyCode
            }
          }, null, 2));
          
          // Verify RevenueCat is properly initialized
          if (!this.isInitialized) {
            console.error('[RevenueCat] ❌ RevenueCat not initialized before purchase!');
            await this.initialize();
          }
          
          console.log('[RevenueCat] 💳 About to call Purchases.purchasePackage()...');
          console.log('[RevenueCat] 💳 This should trigger Apple payment sheet immediately');
          
          // Add timeout to detect if purchase hangs
          const purchasePromise = Purchases.purchasePackage(packageToPurchase);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Purchase timeout - payment sheet did not appear after 30 seconds')), 30000)
          );
          
          console.log('[RevenueCat] 💳 Purchase promise created, waiting for Apple payment sheet...');
          
          const { customerInfo: purchaseResult } = await Promise.race([purchasePromise, timeoutPromise]) as any;
          
          console.log('[RevenueCat] 💳 Purchase promise resolved - payment sheet should have appeared');
          
          console.log('[RevenueCat] ✅ Purchase completed successfully');
          console.log('[RevenueCat] 💳 Purchase result:', {
            hasActiveEntitlements: Object.keys(purchaseResult.entitlements.active || {}).length > 0,
            activeSubscriptions: purchaseResult.activeSubscriptions || [],
            nonSubscriptionTransactions: purchaseResult.nonSubscriptionTransactions || []
          });
          
          // CRITICAL: Verify purchase is associated with correct user ID, not anonymous
          const purchaseUserId = purchaseResult.originalAppUserId;
          const purchaseIsAnonymous = purchaseUserId?.startsWith('$RCAnonymousID:');
          
          console.log('[RevenueCat] 🔍 Post-purchase user ID verification:', {
            purchaseUserId,
            purchaseIsAnonymous,
            pendingUserId: this.pendingUserId
          });
          
          // If purchase was made with anonymous ID but we have a user ID, transfer the purchase
          if (purchaseIsAnonymous && this.pendingUserId) {
            console.warn('[RevenueCat] ⚠️ Purchase was made with anonymous ID!');
            console.warn('[RevenueCat] ⚠️ Attempting to transfer purchase to user account...');
            try {
              // Set user ID - this should transfer the purchase
              await this.setUserId(this.pendingUserId);
              // Wait for transfer to complete
              await new Promise(resolve => setTimeout(resolve, 1000));
              // Verify transfer
              const transferredInfo = await Purchases.getCustomerInfo();
              const transferredUserId = transferredInfo?.originalAppUserId;
              if (transferredUserId === this.pendingUserId) {
                console.log('[RevenueCat] ✅ Purchase successfully transferred to user account:', this.pendingUserId);
                customerInfo = transferredInfo;
              } else {
                console.warn('[RevenueCat] ⚠️ Purchase transfer may have failed:', {
                  expected: this.pendingUserId,
                  actual: transferredUserId
                });
                customerInfo = purchaseResult;
              }
            } catch (transferError) {
              console.error('[RevenueCat] ❌ Failed to transfer purchase to user account:', transferError);
              console.error('[RevenueCat] ❌ Purchase remains associated with anonymous ID');
              customerInfo = purchaseResult;
            }
          } else {
            customerInfo = purchaseResult;
          }
        } catch (purchaseError: any) {
          console.error('[RevenueCat] ❌ Purchase failed:', purchaseError);
          console.error('[RevenueCat] ❌ Error type:', typeof purchaseError);
          console.error('[RevenueCat] ❌ Error details:', {
            message: purchaseError?.message,
            code: purchaseError?.code,
            userCancelled: purchaseError?.userCancelled,
            underlyingErrorMessage: purchaseError?.underlyingErrorMessage,
            name: purchaseError?.name,
            stack: purchaseError?.stack
          });
          
          // Check for timeout
          if (purchaseError?.message?.includes('timeout')) {
            console.error('[RevenueCat] ⏱️ Purchase timed out - payment sheet may not have appeared');
            return {
              success: false,
              error: 'Purchase timed out. The payment sheet may not have appeared. Please try again.'
            };
          }
          
          throw purchaseError;
        }
      
      // Verify purchase actually completed by checking entitlements
      const hasActiveEntitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.premium] !== undefined;
      const hasNonSubscriptionTransaction = isLifetime && customerInfo.nonSubscriptionTransactions?.some(
        (transaction: any) => transaction.productIdentifier === packageToPurchase.product.identifier
      );
      
      console.log('[RevenueCat] Purchase verification:', {
        productId: packageToPurchase.product.identifier,
        hasActiveEntitlement,
        hasNonSubscriptionTransaction,
        isLifetime,
        activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
        nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions?.length || 0
      });
      
      // For lifetime purchases, check both entitlements and non-subscription transactions
      // For subscriptions, check entitlements
      const purchaseVerified = isLifetime 
        ? (hasActiveEntitlement || hasNonSubscriptionTransaction)
        : hasActiveEntitlement;
      
      if (!purchaseVerified) {
        console.error('[RevenueCat] ❌ Purchase completed but entitlements not found!');
        console.error('[RevenueCat] ❌ This may indicate the purchase did not complete properly');
        console.error('[RevenueCat] ❌ CustomerInfo:', {
          activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
          nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions || [],
          activeSubscriptions: customerInfo.activeSubscriptions || []
        });
        return {
          success: false,
          error: 'Purchase completed but subscription status was not updated. Please try restoring purchases or contact support.'
        };
      }
      
      console.log('[RevenueCat] ✅ Purchase verified successfully:', {
        productId: packageToPurchase.product.identifier,
        customerInfo: customerInfo.entitlements.active
      });
      
      return {
        success: true,
        customerInfo
      };
      
    } catch (error: any) {
      console.error('[RevenueCat] Purchase failed:', error);
      
      // Handle "ineligible" error with helpful message
      if (error?.message?.includes('ineligible')) {
        console.warn('[RevenueCat] ⚠️ User is ineligible for purchase');
        console.warn('[RevenueCat] ⚠️ This usually means:');
        console.warn('[RevenueCat]   1. User is already subscribed');
        console.warn('[RevenueCat]   2. User already used promotional offer');
        console.warn('[RevenueCat]   3. Test account eligibility issue');
        return {
          success: false,
          error: 'You are not eligible for this purchase. You may already be subscribed or have used this offer.'
        };
      }
      
      // Handle user cancellation
      if (error.userCancelled || error?.underlyingErrorMessage?.includes('cancelled')) {
        console.log('[RevenueCat] ℹ️ User cancelled the purchase');
        return {
          success: false,
          error: 'Purchase was cancelled by user'
        };
      }
      
      // Check if product is already owned (common for lifetime purchases)
      if (error?.message?.includes('already purchased') || error?.message?.includes('already owns') || error?.underlyingErrorMessage?.includes('already')) {
        console.warn('[RevenueCat] ⚠️ Product already purchased - user may already own lifetime');
        return {
          success: false,
          error: 'You already own this product. Please restore your purchases if you believe this is an error.'
        };
      }
      
      // Handle "Couldn't find package" error with helpful message
      if (error.message?.includes('Couldn\'t find package')) {
        console.error('[RevenueCat] 🚨 Package not found - RevenueCat Dashboard needs configuration!');
        return {
          success: false,
          error: __DEV__ 
            ? 'RevenueCat Dashboard needs configuration. Please add products and offerings.'
            : 'Purchase temporarily unavailable. Please try again later.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  /**
   * Restore purchases
   */
  static async restorePurchases(): Promise<PurchaseResult> {
    if (USE_MOCK_SERVICE) {
      return MockRevenueCatService.restorePurchases();
    }
    
    // Check if RevenueCat is enabled
    if (!this.isRevenueCatEnabled()) {
      console.warn('[RevenueCat] restorePurchases() called but RevenueCat is disabled');
      return {
        success: false,
        error: 'Subscription features are currently disabled'
      };
    }
    
    try {
      await this.initialize();
      
      const customerInfo = await Purchases.restorePurchases();
      
      console.log('[RevenueCat] Purchases restored successfully');
      
      return {
        success: true,
        customerInfo
      };
      
    } catch (error: any) {
      console.error('[RevenueCat] Failed to restore purchases:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to restore purchases'
      };
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  static async hasFeatureAccess(feature: string): Promise<boolean> {
    try {
      const isPremium = await this.isPremiumActive();
      
      if (isPremium) {
        return true;
      }
      
      // Check feature-specific logic for free tier
      // This could be expanded to check usage limits, etc.
      return false;
      
    } catch (error) {
      console.error('[RevenueCat] Failed to check feature access:', error);
      return false;
    }
  }

  /**
   * Get customer info
   */
  static async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (USE_MOCK_SERVICE) {
        return await MockRevenueCatService.getCustomerInfo();
      }
      
      // Check if RevenueCat is enabled
      if (!this.isRevenueCatEnabled()) {
        console.warn('[RevenueCat] getCustomerInfo() called but RevenueCat is disabled - returning null');
        return null;
      }
      
      await this.initialize();
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('[RevenueCat] Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Log out user
   */
  static async logOut(): Promise<void> {
    try {
      if (USE_MOCK_SERVICE) {
        console.log('MockRevenueCatService: User logged out');
        return;
      }
      
      // Check if RevenueCat is enabled before trying to log out
      if (!this.isRevenueCatEnabled()) {
        console.warn('[RevenueCat] logOut() called but RevenueCat is disabled');
        return;
      }
      
      // Check if user is anonymous before attempting logout
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        // If originalAppUserId is null/undefined or is an anonymous ID, user is anonymous
        const isAnonymous = !customerInfo?.originalAppUserId || 
                          customerInfo.originalAppUserId.includes('$RCAnonymousID');
        
        if (isAnonymous) {
          console.log('[RevenueCat] User is anonymous, no logout needed');
          return;
        }
      } catch (checkError) {
        // If we can't check customer info, we'll try to log out anyway
        // The error handling below will catch anonymous user errors
        console.warn('[RevenueCat] Could not check customer info before logout:', checkError);
      }
      
      await Purchases.logOut();
      console.log('[RevenueCat] User logged out successfully');
    } catch (error: any) {
      // Handle anonymous user case gracefully - this is expected when user is already anonymous
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('anonymous') || errorMessage.includes('Anonymous')) {
        console.log('[RevenueCat] User is anonymous, no logout needed');
        return;
      }
      // For other errors, log as warning (not error) since logout failures shouldn't block the app
      console.warn('[RevenueCat] Failed to log out user (continuing anyway):', error);
    }
  }

  /**
   * Check initialization status
   */
  static isSDKInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Debug function to check premium status and log all details
   */
  static async debugPremiumStatus(): Promise<void> {
    console.log('🔍 ========== PREMIUM STATUS DEBUG ==========');
    console.log('[RevenueCat] Checking premium status...');
    
    try {
      await this.initialize();
      
      if (!this.isEnabled) {
        console.log('[RevenueCat] ❌ RevenueCat is disabled');
        console.log('[RevenueCat] This might be because:');
        console.log('[RevenueCat] - Running in Expo Go (not supported)');
        console.log('[RevenueCat] - Missing API keys');
        console.log('[RevenueCat] - Initialization failed');
        return;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      
      console.log('[RevenueCat] ✅ Customer Info Retrieved');
      console.log('[RevenueCat] User ID:', customerInfo.originalAppUserId);
      console.log('[RevenueCat] First Seen:', customerInfo.firstSeen);
      console.log('[RevenueCat] Management URL:', customerInfo.managementURL);
      
      console.log('\n[RevenueCat] 📋 Active Entitlements:');
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      if (activeEntitlements.length === 0) {
        console.log('[RevenueCat]   ❌ No active entitlements found');
      } else {
        activeEntitlements.forEach(entitlementId => {
          const entitlement = customerInfo.entitlements.active[entitlementId];
          console.log(`[RevenueCat]   ✅ ${entitlementId}:`);
          console.log(`[RevenueCat]     - Product ID: ${entitlement.productIdentifier}`);
          console.log(`[RevenueCat]     - Is Active: ${entitlement.isActive}`);
          console.log(`[RevenueCat]     - Will Renew: ${entitlement.willRenew}`);
          console.log(`[RevenueCat]     - Period Type: ${entitlement.periodType}`);
          console.log(`[RevenueCat]     - Expiration Date: ${entitlement.expirationDate || 'Never'}`);
          console.log(`[RevenueCat]     - Latest Purchase: ${entitlement.latestPurchaseDate}`);
        });
      }
      
      console.log('\n[RevenueCat] 📋 All Entitlements (including expired):');
      const allEntitlements = Object.keys(customerInfo.entitlements.all);
      if (allEntitlements.length === 0) {
        console.log('[RevenueCat]   ❌ No entitlements found');
      } else {
        allEntitlements.forEach(entitlementId => {
          const entitlement = customerInfo.entitlements.all[entitlementId];
          const isActive = entitlement.isActive;
          console.log(`[RevenueCat]   ${isActive ? '✅' : '❌'} ${entitlementId}:`);
          console.log(`[RevenueCat]     - Product ID: ${entitlement.productIdentifier}`);
          console.log(`[RevenueCat]     - Is Active: ${entitlement.isActive}`);
          console.log(`[RevenueCat]     - Expiration Date: ${entitlement.expirationDate || 'Never'}`);
        });
      }
      
      const premiumEntitlementId = REVENUECAT_CONFIG.entitlements.premium;
      console.log(`\n[RevenueCat] 🎯 Checking for Premium Entitlement: "${premiumEntitlementId}"`);
      
      const premiumEntitlement = customerInfo.entitlements.active[premiumEntitlementId];
      if (premiumEntitlement) {
        console.log('[RevenueCat] ✅ PREMIUM STATUS: ACTIVE');
        console.log(`[RevenueCat]   Product: ${premiumEntitlement.productIdentifier}`);
        console.log(`[RevenueCat]   Expires: ${premiumEntitlement.expirationDate || 'Never (Lifetime)'}`);
        console.log(`[RevenueCat]   Will Renew: ${premiumEntitlement.willRenew}`);
      } else {
        console.log('[RevenueCat] ❌ PREMIUM STATUS: NOT ACTIVE');
        console.log(`[RevenueCat]   No active entitlement found for "${premiumEntitlementId}"`);
        
        // Check if it exists but is expired
        const expiredPremium = customerInfo.entitlements.all[premiumEntitlementId];
        if (expiredPremium) {
          console.log('[RevenueCat]   ⚠️ Found expired premium entitlement:');
          console.log(`[RevenueCat]     - Expired: ${expiredPremium.expirationDate}`);
          console.log(`[RevenueCat]     - Product: ${expiredPremium.productIdentifier}`);
        }
      }
      
      const isPremium = await this.isPremiumActive();
      console.log(`\n[RevenueCat] 🎯 Final Premium Check Result: ${isPremium ? '✅ PREMIUM' : '❌ NOT PREMIUM'}`);
      console.log('🔍 ===========================================');
    } catch (error: any) {
      console.error('[RevenueCat] ❌ Error checking premium status:', error);
      console.log('🔍 ===========================================');
    }
  }
}