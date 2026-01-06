import { NativeModules, Platform } from 'react-native';

interface StoreKitProduct {
  identifier: string;
  displayName: string;
  description: string;
  price: number;
  displayPrice: string;
  currencyCode: string;
  subscription?: {
    subscriptionPeriod: number;
    subscriptionPeriodUnit: string;
    introductoryOffer?: {
      price: number;
      displayPrice: string;
      period: number;
    };
  };
  type: number;
  isAvailable: boolean;
}

interface StoreKitFetchResult {
  products: StoreKitProduct[];
  missingProducts: string[];
  fetchedAt: string;
}

interface StoreKitDirectFetcherInterface {
  fetchProducts(productIds: string[]): Promise<StoreKitFetchResult>;
  checkProductAvailability(productId: string): Promise<{
    available: boolean;
    price?: number;
    displayPrice?: string;
    currencyCode?: string;
  }>;
}

// Get the native module if available (iOS only)
const { StoreKitDirectFetcher } = NativeModules;

/**
 * Native module to fetch products directly from App Store Connect using StoreKit 2
 * This bypasses RevenueCat's cache and fetches fresh data directly from Apple
 */
export class StoreKitDirectFetcherService {
  private static isAvailable(): boolean {
    const isIOS = Platform.OS === 'ios';
    const moduleExists = StoreKitDirectFetcher != null;
    
    // Log diagnostics
    console.log('[StoreKitDirect] 🔍 Checking native module availability:');
    console.log('[StoreKitDirect]   Platform:', Platform.OS);
    console.log('[StoreKitDirect]   Is iOS:', isIOS);
    console.log('[StoreKitDirect]   Module exists:', moduleExists);
    console.log('[StoreKitDirect]   Module object:', StoreKitDirectFetcher);
    
    if (!isIOS) {
      console.warn('[StoreKitDirect] ⚠️ Not iOS platform - native module only works on iOS');
      return false;
    }
    
    if (!moduleExists) {
      console.warn('[StoreKitDirect] ⚠️ Native module not found!');
      console.warn('[StoreKitDirect] ⚠️ This means the native module is not properly linked.');
      console.warn('[StoreKitDirect] ⚠️ Possible causes:');
      console.warn('[StoreKitDirect]   1. App needs to be rebuilt after adding native files');
      console.warn('[StoreKitDirect]   2. Native module files not added to Xcode project');
      console.warn('[StoreKitDirect]   3. Module not properly exported');
      console.warn('[StoreKitDirect] ⚠️ Falling back to RevenueCat...');
      return false;
    }
    
    console.log('[StoreKitDirect] ✅ Native module is available!');
    return true;
  }

  /**
   * Fetch products directly from App Store Connect using StoreKit 2
   * This is a true direct fetch - no RevenueCat cache involved
   */
  static async fetchProductsDirectly(productIds: string[]): Promise<StoreKitProduct[]> {
    if (!this.isAvailable()) {
      console.warn('[StoreKitDirect] ⚠️ Native module not available (iOS only)');
      return [];
    }

    try {
      console.log('[StoreKitDirect] 🍎 Fetching products directly from App Store Connect using StoreKit 2...');
      console.log('[StoreKitDirect] 📋 Product IDs:', productIds);

      const result: StoreKitFetchResult = await StoreKitDirectFetcher.fetchProducts(productIds);

      console.log('[StoreKitDirect] ✅ Successfully fetched', result.products.length, 'products');
      console.log('[StoreKitDirect] ⚠️ This is a TRUE direct fetch - bypassing RevenueCat cache');

      result.products.forEach((product) => {
        console.log(`[StoreKitDirect]   ${product.identifier}: ${product.displayPrice} (${product.currencyCode})`);
        console.log(`[StoreKitDirect]     Raw price: ${product.price}`);
        console.log(`[StoreKitDirect]     Display name: ${product.displayName}`);
      });

      if (result.missingProducts.length > 0) {
        console.warn('[StoreKitDirect] ⚠️ Missing products:', result.missingProducts);
        result.missingProducts.forEach((id) => {
          console.warn(`[StoreKitDirect]   ❌ ${id} - Not found in App Store Connect`);
          console.warn(`[StoreKitDirect]   Check: 1. Product exists in App Store Connect`);
          console.warn(`[StoreKitDirect]         2. Product is approved/ready`);
          console.warn(`[StoreKitDirect]         3. Product ID matches exactly`);
        });
      }

      return result.products;
    } catch (error: any) {
      console.error('[StoreKitDirect] ❌ Failed to fetch products directly:', error);
      console.error('[StoreKitDirect] Error details:', {
        message: error?.message,
        code: error?.code
      });
      return [];
    }
  }

  /**
   * Check if a specific product is available in App Store Connect
   */
  static async checkProductAvailability(productId: string): Promise<{
    available: boolean;
    price?: number;
    displayPrice?: string;
    currencyCode?: string;
  }> {
    if (!this.isAvailable()) {
      return { available: false };
    }

    try {
      const result = await StoreKitDirectFetcher.checkProductAvailability(productId);
      return result;
    } catch (error: any) {
      console.error('[StoreKitDirect] ❌ Failed to check product availability:', error);
      return { available: false };
    }
  }

  /**
   * Check if the native module is available
   */
  static get isNativeModuleAvailable(): boolean {
    return this.isAvailable();
  }
}

