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
          identifier: 'gofitai_premium_monthly1',
          description: 'Premium Monthly Subscription',
          title: 'Premium Monthly',
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
        identifier: '$rc_annual',
        offeringIdentifier: 'default',
        product: {
          identifier: 'gofitai_premium_lifetime1',
          description: 'Premium Annual Subscription',
          title: 'Premium Annual',
          price: 99.99,
          priceString: '$99.99',
          currencyCode: 'USD',
          introPrice: null,
          discounts: [],
          pricePerWeek: 1.92,
          pricePerMonth: 8.33,
          pricePerYear: 99.99,
          pricePerWeekString: '$1.92',
          pricePerMonthString: '$8.33',
          pricePerYearString: '$99.99',
          subscriptionPeriod: null,
          introductoryPrice: null,
          subscriptionGroupIdentifier: null,
          presentedOfferingIdentifier: 'default',
        } as any,
        packageType: 'ANNUAL' as any,
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
    console.log('MockRevenueCatService: Initialized');
    return Promise.resolve();
  }

  static async getOfferings(): Promise<PurchasesOffering[]> {
    console.log('MockRevenueCatService: Getting offerings');
    return Promise.resolve(mockOfferings);
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    console.log('MockRevenueCatService: Getting customer info');
    return Promise.resolve(mockCustomerInfo);
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
    console.log('MockRevenueCatService: Purchasing package', packageToPurchase.identifier);
    
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
















