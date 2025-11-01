import { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

// Mock offerings for testing
const mockOfferings: PurchasesOffering[] = [
  {
    identifier: 'default',
    serverDescription: 'Default offering',
    metadata: {},
    availablePackages: [
      {
        identifier: '$rc_monthly',
        offeringIdentifier: 'default',
        product: {
          identifier: 'gofitai_premium_monthly',
          description: 'Get unlimited access to AI workout plans, nutrition guidance, and premium features. Start with a 7-day free trial!',
          title: 'GoFitAI Premium Monthly',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
          introPrice: null,
          discounts: [],
          pricePerWeek: 2.49,
          pricePerMonth: 9.99,
          pricePerYear: 119.88,
          pricePerWeekString: '$2.49',
          pricePerMonthString: '$9.99',
          pricePerYearString: '$119.88',
          subscriptionPeriod: null,
          introductoryPrice: null,
          subscriptionGroupIdentifier: null,
          presentedOfferingIdentifier: 'default',
        } as any,
        packageType: 'MONTHLY' as any,
        presentedOfferingContext: {
          offeringIdentifier: 'default',
          placementIdentifier: null,
          targetingContext: null,
        },
      },
      {
        identifier: '$rc_lifetime',
        offeringIdentifier: 'default',
        product: {
          identifier: 'gofitai_premium_lifetime',
          description: 'Get unlimited lifetime access to AI workout plans, nutrition guidance, and all premium features. One-time purchase, yours forever!',
          title: 'GoFitAI Premium Lifetime',
          price: 99.99,
          priceString: '$99.99',
          currencyCode: 'USD',
          introPrice: null,
          discounts: [],
          pricePerWeek: 0,
          pricePerMonth: 0,
          pricePerYear: 0,
          pricePerWeekString: '$0.00',
          pricePerMonthString: '$0.00',
          pricePerYearString: '$0.00',
          subscriptionPeriod: null,
          introductoryPrice: null,
          subscriptionGroupIdentifier: null,
          presentedOfferingIdentifier: 'default',
        } as any,
        packageType: 'LIFETIME' as any,
        presentedOfferingContext: {
          offeringIdentifier: 'default',
          placementIdentifier: null,
          targetingContext: null,
        },
      },
    ],
    lifetime: null,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: null,
    weekly: null,
  },
];

// Mock customer info
const mockCustomerInfo: CustomerInfo = {
  originalPurchaseDate: new Date().toISOString(),
  requestDate: new Date().toISOString(),
  latestExpirationDate: null,
  originalApplicationVersion: '1.0.0',
  originalAppUserId: 'mock_user',
  managementURL: null,
  firstSeen: new Date().toISOString(),
  activeSubscriptions: [],
  allPurchaseDatesByProduct: {},
  allExpirationDatesByProduct: {},
  entitlements: {
    all: {},
    active: {},
    verification: 'NOT_REQUESTED' as any,
  },
  nonSubscriptionTransactions: [],
  requestDateString: new Date().toISOString(),
  firstSeenString: new Date().toISOString(),
  originalPurchaseDateString: new Date().toISOString(),
  latestExpirationDateString: null,
} as CustomerInfo;

export class MockRevenueCatService {
  static async initialize(): Promise<void> {
    console.log('🎭 MockRevenueCatService: Initialized successfully');
    console.log('🎭 MockRevenueCat: Ready for testing with StoreKit products:');
    console.log('🎭   - gofitai_premium_monthly (with 7-day free trial)');
    console.log('🎭   - gofitai_premium_lifetime ($99.99 one-time)');
    return Promise.resolve();
  }

  static async getOfferings(): Promise<PurchasesOffering[]> {
    console.log('🎭 MockRevenueCat: Getting offerings (2 products available)');
    return Promise.resolve(mockOfferings);
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    console.log('🎭 MockRevenueCat: Getting customer info (free user)');
    return Promise.resolve(mockCustomerInfo);
  }

  static async isPremiumActive(): Promise<boolean> {
    console.log('🎭 MockRevenueCat: Checking premium status (returns false for paywall testing)');
    // Return false for testing paywall functionality
    return Promise.resolve(false);
  }

  static async getSubscriptionInfo(): Promise<{ isPremium: boolean; productId?: string; expirationDate?: string; willRenew?: boolean; periodType?: 'monthly' | 'lifetime' }> {
    console.log('MockRevenueCatService: Getting subscription info');
    return Promise.resolve({
      isPremium: false,
      productId: undefined,
      expirationDate: undefined,
      willRenew: false,
      periodType: undefined,
    });
  }

  static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    console.log('🎭 MockRevenueCat: Simulating purchase for', packageToPurchase.identifier, '(' + packageToPurchase.product.identifier + ')');
    
    // Simulate successful purchase
    const updatedCustomerInfo = {
      ...mockCustomerInfo,
      entitlements: {
        all: {
          premium: {
            identifier: 'premium',
            isActive: true,
            willRenew: true,
            latestPurchaseDate: new Date().toISOString(),
            originalPurchaseDate: new Date().toISOString(),
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            store: 'MOCK_STORE' as any,
            productIdentifier: packageToPurchase.product.identifier,
            productPlanIdentifier: null,
            isSandbox: true,
            unsubscribeDetectedAt: null,
            billingIssueDetectedAt: null,
            periodType: 'NORMAL' as any,
            latestPurchaseDateString: new Date().toISOString(),
            originalPurchaseDateString: new Date().toISOString(),
            expirationDateString: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            unsubscribeDetectedAtString: null,
            billingIssueDetectedAtString: null,
            latestPurchaseDateMillis: Date.now(),
            originalPurchaseDateMillis: Date.now(),
            expirationDateMillis: Date.now() + 30 * 24 * 60 * 60 * 1000,
            unsubscribeDetectedAtMillis: null,
            billingIssueDetectedAtMillis: null,
            ownershipType: 'PURCHASED' as any,
            verification: 'NOT_REQUESTED' as any,
          },
        },
        active: {
          premium: {
            identifier: 'premium',
            isActive: true,
            willRenew: true,
            latestPurchaseDate: new Date().toISOString(),
            originalPurchaseDate: new Date().toISOString(),
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            store: 'MOCK_STORE' as any,
            productIdentifier: packageToPurchase.product.identifier,
            productPlanIdentifier: null,
            isSandbox: true,
            unsubscribeDetectedAt: null,
            billingIssueDetectedAt: null,
            periodType: 'NORMAL' as any,
            latestPurchaseDateString: new Date().toISOString(),
            originalPurchaseDateString: new Date().toISOString(),
            expirationDateString: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            unsubscribeDetectedAtString: null,
            billingIssueDetectedAtString: null,
            latestPurchaseDateMillis: Date.now(),
            originalPurchaseDateMillis: Date.now(),
            expirationDateMillis: Date.now() + 30 * 24 * 60 * 60 * 1000,
            unsubscribeDetectedAtMillis: null,
            billingIssueDetectedAtMillis: null,
            ownershipType: 'PURCHASED' as any,
            verification: 'NOT_REQUESTED' as any,
          },
        },
        verification: 'NOT_REQUESTED' as any,
      },
    } as CustomerInfo;

    return Promise.resolve({
      success: true,
      customerInfo: updatedCustomerInfo,
    });
  }
}
















