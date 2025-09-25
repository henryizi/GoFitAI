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

// Toggle this to use mock service for testing
const USE_MOCK_SERVICE = true; // Set to false to use real RevenueCat integration

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
      apiKey: REVENUECAT_CONFIG.ios.apiKey, // Use iOS key for web fallback
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
    apiKey: REVENUECAT_CONFIG.ios.apiKey, // Use iOS key for web fallback
    reason: 'Unknown platform, defaulting to web'
  };
};

export class RevenueCatService {
  private static isInitialized = false;
  private static pendingUserId: string | null = null;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize RevenueCat SDK
   */
  static async initialize(userId?: string): Promise<void> {
    if (USE_MOCK_SERVICE) {
      return MockRevenueCatService.initialize();
    }
    
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
      Purchases.setLogLevel(LOG_LEVEL.INFO);
      
      // Detect environment and get appropriate configuration
      const env = detectEnvironment();
      console.log('[RevenueCat] Environment detected:', env.platform, '(' + env.reason + ')');
      
      if (!env.apiKey) {
        console.error(`[RevenueCat] ❌ ${env.platform.toUpperCase()} API key is missing from environment variables`);
        
        if (env.platform === 'web') {
          console.error('[RevenueCat] ℹ️  For Expo Go development, you need a Web Billing API key');
          console.error('[RevenueCat] ℹ️  Get it from: RevenueCat Dashboard > Apps > [Your App] > API Keys > Web Billing API Key');
          console.error('[RevenueCat] ℹ️  Add it to your .env as: EXPO_PUBLIC_REVENUECAT_WEB_API_KEY=your_web_key_here');
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
      
      await Purchases.configure({ 
        apiKey: env.apiKey
        // No observer mode - let RevenueCat handle purchases directly
      });
      
      console.log(`[RevenueCat] ${env.platform.toUpperCase()} configuration completed successfully`);

      // Test if the configuration worked by checking if we can access customer info
      try {
        console.log('[RevenueCat] Testing configuration by getting customer info...');
        await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Configuration test successful - can access customer info');
      } catch (testError) {
        console.error('[RevenueCat] Configuration test failed - cannot access customer info:', testError);
        // Don't throw here, as this might be expected in some cases
      }

      this.isInitialized = true;
      console.log('[RevenueCat] Successfully initialized');
      
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
      if (!this.isInitialized) {
        // Store user ID for when RevenueCat is initialized
        this.pendingUserId = userId;
        console.log('[RevenueCat] Not initialized yet, storing user ID for later:', userId);
        return;
      }
      
      await Purchases.logIn(userId);
      console.log('[RevenueCat] User ID set successfully:', userId);
    } catch (error) {
      console.error('[RevenueCat] Failed to set user ID:', error);
      throw error;
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
   * Ensure RevenueCat is initialized before any operations (private method)
   */
  private static async ensureInitializedPrivate(): Promise<void> {
    if (!this.isInitialized) {
      console.log('[RevenueCat] Service not initialized, initializing now...');
      await this.initialize();
    }
    
    if (!this.isInitialized) {
      throw new Error('RevenueCat initialization failed. Please check your API key configuration.');
    }
  }

  /**
   * Get available offerings
   */
  static async getOfferings(): Promise<PurchasesOffering[]> {
    if (USE_MOCK_SERVICE) {
      const mockOfferings = await MockRevenueCatService.getOfferings();
      return mockOfferings;
    }
    
    try {
      await this.ensureInitializedPrivate();
      const offerings = await Purchases.getOfferings();
      
      console.log('[RevenueCat] 📦 Offerings response:', {
        current: !!offerings.current,
        allCount: Object.keys(offerings.all).length,
        allKeys: Object.keys(offerings.all)
      });
      
      if (offerings.current !== null) {
        console.log('[RevenueCat] ✅ Using current offering with', offerings.current.availablePackages.length, 'packages');
        return [offerings.current];
      }
      
      const allOfferings = Object.values(offerings.all);
      console.log('[RevenueCat] ⚠️ No current offering, using all offerings:', allOfferings.length);
      return allOfferings;
    } catch (error) {
      console.error('[RevenueCat] Failed to get offerings:', error);
      
      // TEMPORARY: Return mock offerings for dashboard configuration period
      if (__DEV__ && error.message?.includes('None of the products registered')) {
        console.log('[RevenueCat] 🔧 USING MOCK OFFERINGS - Configure RevenueCat dashboard!');
        return this.getMockOfferings();
      }
      
      throw error;
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
          identifier: 'gofitai_premium_monthly',
          description: 'Premium Monthly Subscription with 7-day free trial',
          title: 'GoFitAI Premium Monthly',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
          introPrice: {
            price: 0,
            priceString: 'Free',
            period: 'P1W', // 1 week
            cycles: 1
          }
        },
        offeringIdentifier: 'default'
      },
      {
        identifier: '$rc_lifetime',
        packageType: 'LIFETIME',
        product: {
          identifier: 'gofitai_premium_lifetime',
          description: 'Premium Lifetime Access - One-time payment',
          title: 'GoFitAI Premium Lifetime',
          price: 79.99,
          priceString: '$79.99',
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
   * Check if user has active premium subscription
   */
  static async isPremiumActive(): Promise<boolean> {
    try {
      await this.initialize();
      const customerInfo = await Purchases.getCustomerInfo();
      
      const premiumEntitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.premium];
      return premiumEntitlement !== undefined;
      
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
      const customerInfo = await Purchases.getCustomerInfo();
      
      const premiumEntitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.premium];
      
      if (!premiumEntitlement) {
        return { isPremium: false };
      }

      // Determine period type from product ID
      let periodType: 'monthly' | 'lifetime' = 'monthly';
      if (premiumEntitlement.productIdentifier.includes('lifetime')) {
        periodType = 'lifetime';
      }

      return {
        isPremium: true,
        productId: premiumEntitlement.productIdentifier,
        expirationDate: premiumEntitlement.expirationDate,
        willRenew: premiumEntitlement.willRenew,
        periodType,
        originalPurchaseDate: premiumEntitlement.originalPurchaseDate
      };
      
    } catch (error) {
      console.error('[RevenueCat] Failed to get subscription info:', error);
      return { isPremium: false };
    }
  }

  /**
   * Purchase a package
   */
  static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<PurchaseResult> {
    if (USE_MOCK_SERVICE) {
      return MockRevenueCatService.purchasePackage(packageToPurchase);
    }
    
    try {
      await this.initialize();
      
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      console.log('[RevenueCat] Purchase successful:', {
        productId: packageToPurchase.product.identifier,
        customerInfo: customerInfo.entitlements.active
      });
      
      return {
        success: true,
        customerInfo
      };
      
    } catch (error: any) {
      console.error('[RevenueCat] Purchase failed:', error);
      
      // Handle user cancellation
      if (error.userCancelled) {
        return {
          success: false,
          error: 'Purchase was cancelled by user'
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
      await this.initialize();
      await Purchases.logOut();
      console.log('[RevenueCat] User logged out successfully');
    } catch (error) {
      console.error('[RevenueCat] Failed to log out user:', error);
    }
  }

  /**
   * Check initialization status
   */
  static isSDKInitialized(): boolean {
    return this.isInitialized;
  }
}