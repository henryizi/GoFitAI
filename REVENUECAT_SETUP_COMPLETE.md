# RevenueCat Setup Complete Guide

## Current Status ✅
- ✅ iOS API Key: Configured (`appl_MPx...`)
- ✅ Mock Service: Enabled (temporary for testing)
- ❌ Android API Key: Missing
- ❌ Dashboard Products: Need configuration
- ❌ App Store Connect: Products need creation and linking

## Step-by-Step Setup Instructions

### Step 1: Get Android API Key

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Select your app** "GoFitAI"
3. **Navigate to API Keys** section
4. **Copy the Android API key** (starts with `goog_`)
5. **Add to your environment**:
   ```bash
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_android_key_here
   ```

### Step 2: Configure Products in RevenueCat Dashboard

1. **Go to Products tab** in your GoFitAI app dashboard
2. **Create these products**:

#### Monthly Subscription
- **Product ID**: `gofitai_premium_monthly1`
- **Type**: Auto-renewable subscription
- **Duration**: 1 month
- **Price**: $9.99 USD
- **Title**: "Premium Monthly"
- **Description**: "Premium Monthly Subscription"

#### Yearly Subscription
- **Product ID**: `gofitai_premium_lifetime1`
- **Type**: Auto-renewable subscription
- **Duration**: 1 year
- **Price**: $99.99 USD
- **Title**: "Premium Yearly"
- **Description**: "Premium Yearly Subscription"

### Step 3: Create Offerings

1. **Go to Offerings tab**
2. **Create a new offering**:
   - **Identifier**: `default`
   - **Description**: "Default GoFitAI Premium Plans"
3. **Add both products** to this offering

### Step 4: Set Up App Store Connect

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Create In-App Purchase products**:
   - Product ID: `gofitai_premium_monthly1`
   - Product ID: `gofitai_premium_lifetime1`
3. **Set pricing** and availability
4. **Submit for review** (for production) or **approve for testing** (for sandbox)

### Step 5: Link Products in RevenueCat

1. **Back in RevenueCat Dashboard**
2. **Go to Products tab**
3. **For each product**, click "Link to App Store Connect"
4. **Select the corresponding App Store Connect product**
5. **RevenueCat will sync** pricing and availability automatically

### Step 6: Test the Integration

1. **Enable real integration** (after dashboard setup):
   ```typescript
   const USE_MOCK_SERVICE = false;
   ```

2. **Run your app** and check console logs for:
   ```
   [RevenueCat] ✅ Using current offering with X packages
   [RevenueCat] Configuration test successful
   ```

3. **Test purchases** in sandbox mode:
   - Use TestFlight builds
   - Products must be approved for testing in App Store Connect

## Current Configuration

```typescript
// src/config/revenuecat.ts
export const REVENUECAT_CONFIG = {
  ios: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || 'appl_dummy_key',
  },
  android: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || 'goog_dummy_key',
  },
  products: {
    premium: {
      monthly: 'gofitai_premium_monthly1',
      yearly: 'gofitai_premium_lifetime1',
    },
  },
  entitlements: {
    premium: 'premium',
  },
};
```

## Mock Service Status

```typescript
// src/services/subscription/RevenueCatService.ts
const USE_MOCK_SERVICE = true; // Currently enabled for testing
```

## Premium Features Available

- Unlimited AI workout plans
- Advanced nutrition tracking
- Custom meal planning
- Progress analytics
- Priority support
- Ad-free experience

## Next Steps

1. ✅ Complete dashboard configuration
2. ✅ Set up App Store Connect products
3. ✅ Test with mock service (current)
4. ❌ Switch to real RevenueCat integration
5. ❌ Test sandbox purchases
6. ❌ Test production purchases

## Troubleshooting

### Common Issues:

1. **"Error fetching offerings"**:
   - Products not linked to App Store Connect
   - Products not approved for testing
   - Wrong API key used

2. **"Invalid API key"**:
   - Using secret key instead of public key
   - Wrong platform (iOS vs Android)

3. **"None of the products registered"**:
   - Products don't exist in App Store Connect
   - Products not linked in RevenueCat dashboard

### Debug Commands:

```bash
# Check API keys
npm run debug-revenuecat

# Run configuration test
node test-revenuecat-fix.js

# Test real integration
node test-revenuecat-real.js
```

## Production Checklist

- [ ] Products approved by Apple
- [ ] API keys are production keys
- [ ] Entitlements properly configured
- [ ] Webhook endpoints set up
- [ ] Analytics configured
- [ ] Test purchases working
- [ ] Production builds tested

## Support Resources

- **RevenueCat Documentation**: https://docs.revenuecat.com/
- **RevenueCat Dashboard**: https://app.revenuecat.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **Expo StoreKit**: https://docs.expo.dev/versions/latest/sdk/storekit/

---

**Status**: Mock service enabled for testing while dashboard is configured
**Next Action**: Complete Step 2 (Configure Products in RevenueCat Dashboard)




