# RevenueCat App Store Integration Guide

This guide walks you through integrating RevenueCat with iOS App Store and Google Play Store to enable in-app purchases in your GoFitAI app.

## 📋 Prerequisites

- ✅ RevenueCat account and project created
- ✅ iOS Developer Account (for App Store)
- ✅ Google Play Developer Account (for Play Store)
- ✅ App configured with correct Bundle IDs
- ✅ RevenueCat SDK integrated (already done)

## 🍎 iOS App Store Setup

### Step 1: Create App in App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Click "My Apps" → "+" → "New App"**
3. **Fill in app details:**
   - **Name:** GoFitAI
   - **Bundle ID:** `com.henrymadeit.gofitai` (must match your app.config.ts)
   - **SKU:** `gofitai-ios` (unique identifier)
   - **User Access:** Full Access

### Step 2: Set Up In-App Purchases

1. **Navigate to your app → Features → In-App Purchases**
2. **Click "+" to create new in-app purchases:**

#### Monthly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Reference Name:** GoFitAI Premium Monthly
- **Subscription Group:** Create new group "Premium Subscriptions"
- **Subscription Duration:** 1 Month
- **Price:** Choose your price tier (e.g., $9.99/month)

#### Yearly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Reference Name:** GoFitAI Premium Yearly
- **Subscription Group:** Use existing "Premium Subscriptions"
- **Subscription Duration:** 1 Year
- **Price:** Choose your price tier (e.g., $99.99/year)

#### Lifetime Premium (Optional)
- **Type:** Non-Consumable
- **Product ID:** `gofitai_premium_lifetime`
- **Reference Name:** GoFitAI Premium Lifetime
- **Price:** Choose your price tier (e.g., $299.99)

### Step 3: Configure Subscription Details

For each subscription, add:
- **Localizations** (at least English)
- **Subscription Display Name:** "GoFitAI Premium"
- **Description:** "Unlock unlimited AI-powered workouts, nutrition plans, and premium features"
- **Review Screenshot:** Upload a screenshot showing premium features

### Step 4: Set Up App Store Server Notifications

1. **Go to App Store Connect → Your App → App Information**
2. **Scroll to App Store Server Notifications**
3. **Add Production Server URL:** `https://your-domain.com/webhooks/appstore`
4. **Add Sandbox Server URL:** `https://your-domain.com/webhooks/appstore-sandbox`
5. **Shared Secret:** Generate and save this for later

## 🤖 Google Play Store Setup

### Step 1: Create App in Google Play Console

1. **Go to [Google Play Console](https://play.google.com/console)**
2. **Create new app:**
   - **App name:** GoFitAI
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free (with in-app purchases)

### Step 2: Set Up In-App Products

1. **Navigate to Monetization → Products → In-app products**
2. **Create products matching iOS:**

#### Monthly Premium Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Name:** GoFitAI Premium Monthly
- **Description:** Monthly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 month
- **Free trial:** Optional (e.g., 7 days)

#### Yearly Premium Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Name:** GoFitAI Premium Yearly
- **Description:** Yearly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 year

### Step 3: Configure Play Billing

1. **Go to Monetization → Play Billing**
2. **Set up Real-time developer notifications:**
   - **Topic name:** `revenuecat-rtdn`
   - **Endpoint URL:** Will be provided by RevenueCat

## ⚙️ RevenueCat Dashboard Configuration

### Step 1: Add App Store Credentials

1. **Go to [RevenueCat Dashboard](https://app.revenuecat.com)**
2. **Select your project → Apps → iOS App**
3. **Add App Store Connect credentials:**
   - **App Store Connect API Key:** Upload your API key file
   - **Issuer ID:** From App Store Connect API keys
   - **Key ID:** From App Store Connect API keys
   - **Vendor Number:** From App Store Connect
   - **Shared Secret:** From App Store Connect notifications setup

### Step 2: Add Google Play Credentials

1. **Select your project → Apps → Android App**
2. **Add Google Play credentials:**
   - **Service Account Key:** Upload JSON file from Google Cloud Console
   - **Package Name:** `com.henrymadeit.gofitai`

### Step 3: Configure Products

1. **Go to Products → Add Product for each:**
   - `gofitai_premium_monthly`
   - `gofitai_premium_yearly`
   - `gofitai_premium_lifetime` (iOS only)

### Step 4: Create Offerings

1. **Go to Offerings → Create Offering:**
   - **Identifier:** `default`
   - **Description:** Default subscription offering
   - **Add packages:** Monthly, Yearly, Lifetime

2. **Create additional offerings:**
   - **Identifier:** `onboarding`
   - **Description:** Special onboarding offer
   - **Identifier:** `paywall`
   - **Description:** Paywall offering

## 🔧 App Configuration Updates

Update your RevenueCat configuration to match the products you created:

```typescript
// src/config/revenuecat.ts
export const REVENUECAT_CONFIG = {
  // Product IDs (must match App Store Connect and Google Play Console)
  PRODUCT_IDS: {
    MONTHLY_PREMIUM: 'gofitai_premium_monthly',
    YEARLY_PREMIUM: 'gofitai_premium_yearly',
    LIFETIME_PREMIUM: 'gofitai_premium_lifetime',
  },
  
  // Entitlement IDs (must match RevenueCat dashboard)
  ENTITLEMENTS: {
    PREMIUM: 'premium',
  },
  
  // Offering IDs (must match RevenueCat dashboard)
  OFFERINGS: {
    DEFAULT: 'default',
    ONBOARDING: 'onboarding',
    PAYWALL: 'paywall',
  },
} as const;
```

## 🧪 Testing In-App Purchases

### iOS Sandbox Testing

1. **Create Sandbox Test Users:**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create test accounts with different regions/currencies

2. **Test on Device:**
   - Sign out of App Store on test device
   - Install your app (TestFlight or development build)
   - Attempt purchase - iOS will prompt to sign in with sandbox account

3. **Test Scenarios:**
   - Purchase monthly subscription
   - Purchase yearly subscription  
   - Cancel and restore subscription
   - Test subscription renewal
   - Test different payment methods

### Android Testing

1. **Set up Google Play Internal Testing:**
   - Upload AAB to Google Play Console
   - Create internal testing track
   - Add test users

2. **Test License Testing:**
   - Add test accounts in Google Play Console
   - Set up license testing responses

### RevenueCat Webhook Testing

1. **Set up webhook endpoint:**
```javascript
// Example webhook handler (Node.js/Express)
app.post('/webhooks/revenuecat', (req, res) => {
  const event = req.body;
  
  console.log('RevenueCat webhook received:', event.type);
  
  switch (event.type) {
    case 'INITIAL_PURCHASE':
      // Handle new subscription
      break;
    case 'RENEWAL':
      // Handle subscription renewal
      break;
    case 'CANCELLATION':
      // Handle subscription cancellation
      break;
    case 'EXPIRATION':
      // Handle subscription expiration
      break;
  }
  
  res.status(200).send('OK');
});
```

## 📱 UI Integration

### Adding Paywall to Your App

The paywall component is already created. Use it in your app:

```typescript
import { PaywallScreen } from '../src/components/subscription/PaywallScreen';

// Show paywall when user hits premium feature
const showPaywall = () => {
  router.push('/paywall');
};

// Or use as modal
const [showPaywallModal, setShowPaywallModal] = useState(false);

{showPaywallModal && (
  <PaywallScreen 
    onClose={() => setShowPaywallModal(false)}
    source="feature_limit"
    offeringId="default"
  />
)}
```

### Subscription Status Check

```typescript
import { useSubscription } from '../src/hooks/useSubscription';

const MyComponent = () => {
  const { isPremium, openPaywall } = useSubscription();
  
  const handlePremiumFeature = () => {
    if (!isPremium) {
      openPaywall();
      return;
    }
    
    // Execute premium feature
  };
  
  return (
    <TouchableOpacity onPress={handlePremiumFeature}>
      <Text>
        {isPremium ? 'Premium Feature' : 'Upgrade to Premium'}
      </Text>
    </TouchableOpacity>
  );
};
```

## 🚀 Production Deployment

### iOS App Store

1. **Submit for Review:**
   - Upload build to App Store Connect
   - Fill out App Review Information
   - Include test account credentials for reviewers

2. **App Review Guidelines:**
   - Clearly describe premium features
   - Ensure subscription terms are visible
   - Test all purchase flows

### Google Play Store

1. **Submit for Review:**
   - Upload AAB to Google Play Console
   - Complete store listing
   - Submit for review

2. **Play Billing Guidelines:**
   - Follow Google Play Billing policies
   - Implement proper subscription management

## 📊 Analytics & Monitoring

### RevenueCat Dashboard

Monitor key metrics:
- Monthly Recurring Revenue (MRR)
- Churn rate
- Conversion rates
- Geographic performance

### Custom Analytics

Track subscription events in your analytics:

```typescript
import { analyticsTrack } from '../services/analytics';

// Track paywall views
analyticsTrack('paywall_viewed', { source: 'feature_limit' });

// Track purchases
analyticsTrack('subscription_purchased', { 
  product_id: 'gofitai_premium_yearly',
  price: 99.99 
});

// Track cancellations
analyticsTrack('subscription_cancelled', { 
  product_id: 'gofitai_premium_yearly',
  reason: 'user_initiated' 
});
```

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API Key" Error:**
   - Verify Bundle ID matches RevenueCat project
   - Check API key is correctly set in environment
   - Restart Expo with `--clear` flag

2. **Products Not Loading:**
   - Ensure products are approved in App Store Connect
   - Check product IDs match exactly
   - Verify app is signed with correct provisioning profile

3. **Sandbox Purchases Not Working:**
   - Sign out of App Store on device
   - Use sandbox test account
   - Check sandbox environment is enabled

4. **Webhook Not Receiving Events:**
   - Verify webhook URL is publicly accessible
   - Check webhook secret matches
   - Monitor webhook logs for errors

### Debug Commands

```bash
# Check RevenueCat configuration
npm run debug-revenuecat

# Test API connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.revenuecat.com/v1/subscribers/test-user

# Check app configuration
npx expo config --type public
```

## 📞 Support

- **RevenueCat Documentation:** https://docs.revenuecat.com
- **RevenueCat Support:** https://community.revenuecat.com
- **Apple Developer Support:** https://developer.apple.com/support
- **Google Play Support:** https://support.google.com/googleplay/android-developer

---

## ✅ Checklist

Before going live, ensure:

- [ ] Products created in App Store Connect
- [ ] Products created in Google Play Console  
- [ ] RevenueCat dashboard configured
- [ ] API keys properly set
- [ ] Paywall UI implemented
- [ ] Subscription status checks added
- [ ] Sandbox testing completed
- [ ] Webhook handlers implemented
- [ ] Analytics tracking added
- [ ] App store submissions prepared

🎉 **Congratulations!** Your app now has full in-app purchase integration with RevenueCat!







This guide walks you through integrating RevenueCat with iOS App Store and Google Play Store to enable in-app purchases in your GoFitAI app.

## 📋 Prerequisites

- ✅ RevenueCat account and project created
- ✅ iOS Developer Account (for App Store)
- ✅ Google Play Developer Account (for Play Store)
- ✅ App configured with correct Bundle IDs
- ✅ RevenueCat SDK integrated (already done)

## 🍎 iOS App Store Setup

### Step 1: Create App in App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Click "My Apps" → "+" → "New App"**
3. **Fill in app details:**
   - **Name:** GoFitAI
   - **Bundle ID:** `com.henrymadeit.gofitai` (must match your app.config.ts)
   - **SKU:** `gofitai-ios` (unique identifier)
   - **User Access:** Full Access

### Step 2: Set Up In-App Purchases

1. **Navigate to your app → Features → In-App Purchases**
2. **Click "+" to create new in-app purchases:**

#### Monthly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Reference Name:** GoFitAI Premium Monthly
- **Subscription Group:** Create new group "Premium Subscriptions"
- **Subscription Duration:** 1 Month
- **Price:** Choose your price tier (e.g., $9.99/month)

#### Yearly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Reference Name:** GoFitAI Premium Yearly
- **Subscription Group:** Use existing "Premium Subscriptions"
- **Subscription Duration:** 1 Year
- **Price:** Choose your price tier (e.g., $99.99/year)

#### Lifetime Premium (Optional)
- **Type:** Non-Consumable
- **Product ID:** `gofitai_premium_lifetime`
- **Reference Name:** GoFitAI Premium Lifetime
- **Price:** Choose your price tier (e.g., $299.99)

### Step 3: Configure Subscription Details

For each subscription, add:
- **Localizations** (at least English)
- **Subscription Display Name:** "GoFitAI Premium"
- **Description:** "Unlock unlimited AI-powered workouts, nutrition plans, and premium features"
- **Review Screenshot:** Upload a screenshot showing premium features

### Step 4: Set Up App Store Server Notifications

1. **Go to App Store Connect → Your App → App Information**
2. **Scroll to App Store Server Notifications**
3. **Add Production Server URL:** `https://your-domain.com/webhooks/appstore`
4. **Add Sandbox Server URL:** `https://your-domain.com/webhooks/appstore-sandbox`
5. **Shared Secret:** Generate and save this for later

## 🤖 Google Play Store Setup

### Step 1: Create App in Google Play Console

1. **Go to [Google Play Console](https://play.google.com/console)**
2. **Create new app:**
   - **App name:** GoFitAI
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free (with in-app purchases)

### Step 2: Set Up In-App Products

1. **Navigate to Monetization → Products → In-app products**
2. **Create products matching iOS:**

#### Monthly Premium Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Name:** GoFitAI Premium Monthly
- **Description:** Monthly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 month
- **Free trial:** Optional (e.g., 7 days)

#### Yearly Premium Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Name:** GoFitAI Premium Yearly
- **Description:** Yearly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 year

### Step 3: Configure Play Billing

1. **Go to Monetization → Play Billing**
2. **Set up Real-time developer notifications:**
   - **Topic name:** `revenuecat-rtdn`
   - **Endpoint URL:** Will be provided by RevenueCat

## ⚙️ RevenueCat Dashboard Configuration

### Step 1: Add App Store Credentials

1. **Go to [RevenueCat Dashboard](https://app.revenuecat.com)**
2. **Select your project → Apps → iOS App**
3. **Add App Store Connect credentials:**
   - **App Store Connect API Key:** Upload your API key file
   - **Issuer ID:** From App Store Connect API keys
   - **Key ID:** From App Store Connect API keys
   - **Vendor Number:** From App Store Connect
   - **Shared Secret:** From App Store Connect notifications setup

### Step 2: Add Google Play Credentials

1. **Select your project → Apps → Android App**
2. **Add Google Play credentials:**
   - **Service Account Key:** Upload JSON file from Google Cloud Console
   - **Package Name:** `com.henrymadeit.gofitai`

### Step 3: Configure Products

1. **Go to Products → Add Product for each:**
   - `gofitai_premium_monthly`
   - `gofitai_premium_yearly`
   - `gofitai_premium_lifetime` (iOS only)

### Step 4: Create Offerings

1. **Go to Offerings → Create Offering:**
   - **Identifier:** `default`
   - **Description:** Default subscription offering
   - **Add packages:** Monthly, Yearly, Lifetime

2. **Create additional offerings:**
   - **Identifier:** `onboarding`
   - **Description:** Special onboarding offer
   - **Identifier:** `paywall`
   - **Description:** Paywall offering

## 🔧 App Configuration Updates

Update your RevenueCat configuration to match the products you created:

```typescript
// src/config/revenuecat.ts
export const REVENUECAT_CONFIG = {
  // Product IDs (must match App Store Connect and Google Play Console)
  PRODUCT_IDS: {
    MONTHLY_PREMIUM: 'gofitai_premium_monthly',
    YEARLY_PREMIUM: 'gofitai_premium_yearly',
    LIFETIME_PREMIUM: 'gofitai_premium_lifetime',
  },
  
  // Entitlement IDs (must match RevenueCat dashboard)
  ENTITLEMENTS: {
    PREMIUM: 'premium',
  },
  
  // Offering IDs (must match RevenueCat dashboard)
  OFFERINGS: {
    DEFAULT: 'default',
    ONBOARDING: 'onboarding',
    PAYWALL: 'paywall',
  },
} as const;
```

## 🧪 Testing In-App Purchases

### iOS Sandbox Testing

1. **Create Sandbox Test Users:**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create test accounts with different regions/currencies

2. **Test on Device:**
   - Sign out of App Store on test device
   - Install your app (TestFlight or development build)
   - Attempt purchase - iOS will prompt to sign in with sandbox account

3. **Test Scenarios:**
   - Purchase monthly subscription
   - Purchase yearly subscription  
   - Cancel and restore subscription
   - Test subscription renewal
   - Test different payment methods

### Android Testing

1. **Set up Google Play Internal Testing:**
   - Upload AAB to Google Play Console
   - Create internal testing track
   - Add test users

2. **Test License Testing:**
   - Add test accounts in Google Play Console
   - Set up license testing responses

### RevenueCat Webhook Testing

1. **Set up webhook endpoint:**
```javascript
// Example webhook handler (Node.js/Express)
app.post('/webhooks/revenuecat', (req, res) => {
  const event = req.body;
  
  console.log('RevenueCat webhook received:', event.type);
  
  switch (event.type) {
    case 'INITIAL_PURCHASE':
      // Handle new subscription
      break;
    case 'RENEWAL':
      // Handle subscription renewal
      break;
    case 'CANCELLATION':
      // Handle subscription cancellation
      break;
    case 'EXPIRATION':
      // Handle subscription expiration
      break;
  }
  
  res.status(200).send('OK');
});
```

## 📱 UI Integration

### Adding Paywall to Your App

The paywall component is already created. Use it in your app:

```typescript
import { PaywallScreen } from '../src/components/subscription/PaywallScreen';

// Show paywall when user hits premium feature
const showPaywall = () => {
  router.push('/paywall');
};

// Or use as modal
const [showPaywallModal, setShowPaywallModal] = useState(false);

{showPaywallModal && (
  <PaywallScreen 
    onClose={() => setShowPaywallModal(false)}
    source="feature_limit"
    offeringId="default"
  />
)}
```

### Subscription Status Check

```typescript
import { useSubscription } from '../src/hooks/useSubscription';

const MyComponent = () => {
  const { isPremium, openPaywall } = useSubscription();
  
  const handlePremiumFeature = () => {
    if (!isPremium) {
      openPaywall();
      return;
    }
    
    // Execute premium feature
  };
  
  return (
    <TouchableOpacity onPress={handlePremiumFeature}>
      <Text>
        {isPremium ? 'Premium Feature' : 'Upgrade to Premium'}
      </Text>
    </TouchableOpacity>
  );
};
```

## 🚀 Production Deployment

### iOS App Store

1. **Submit for Review:**
   - Upload build to App Store Connect
   - Fill out App Review Information
   - Include test account credentials for reviewers

2. **App Review Guidelines:**
   - Clearly describe premium features
   - Ensure subscription terms are visible
   - Test all purchase flows

### Google Play Store

1. **Submit for Review:**
   - Upload AAB to Google Play Console
   - Complete store listing
   - Submit for review

2. **Play Billing Guidelines:**
   - Follow Google Play Billing policies
   - Implement proper subscription management

## 📊 Analytics & Monitoring

### RevenueCat Dashboard

Monitor key metrics:
- Monthly Recurring Revenue (MRR)
- Churn rate
- Conversion rates
- Geographic performance

### Custom Analytics

Track subscription events in your analytics:

```typescript
import { analyticsTrack } from '../services/analytics';

// Track paywall views
analyticsTrack('paywall_viewed', { source: 'feature_limit' });

// Track purchases
analyticsTrack('subscription_purchased', { 
  product_id: 'gofitai_premium_yearly',
  price: 99.99 
});

// Track cancellations
analyticsTrack('subscription_cancelled', { 
  product_id: 'gofitai_premium_yearly',
  reason: 'user_initiated' 
});
```

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API Key" Error:**
   - Verify Bundle ID matches RevenueCat project
   - Check API key is correctly set in environment
   - Restart Expo with `--clear` flag

2. **Products Not Loading:**
   - Ensure products are approved in App Store Connect
   - Check product IDs match exactly
   - Verify app is signed with correct provisioning profile

3. **Sandbox Purchases Not Working:**
   - Sign out of App Store on device
   - Use sandbox test account
   - Check sandbox environment is enabled

4. **Webhook Not Receiving Events:**
   - Verify webhook URL is publicly accessible
   - Check webhook secret matches
   - Monitor webhook logs for errors

### Debug Commands

```bash
# Check RevenueCat configuration
npm run debug-revenuecat

# Test API connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.revenuecat.com/v1/subscribers/test-user

# Check app configuration
npx expo config --type public
```

## 📞 Support

- **RevenueCat Documentation:** https://docs.revenuecat.com
- **RevenueCat Support:** https://community.revenuecat.com
- **Apple Developer Support:** https://developer.apple.com/support
- **Google Play Support:** https://support.google.com/googleplay/android-developer

---

## ✅ Checklist

Before going live, ensure:

- [ ] Products created in App Store Connect
- [ ] Products created in Google Play Console  
- [ ] RevenueCat dashboard configured
- [ ] API keys properly set
- [ ] Paywall UI implemented
- [ ] Subscription status checks added
- [ ] Sandbox testing completed
- [ ] Webhook handlers implemented
- [ ] Analytics tracking added
- [ ] App store submissions prepared

🎉 **Congratulations!** Your app now has full in-app purchase integration with RevenueCat!











This guide walks you through integrating RevenueCat with iOS App Store and Google Play Store to enable in-app purchases in your GoFitAI app.

## 📋 Prerequisites

- ✅ RevenueCat account and project created
- ✅ iOS Developer Account (for App Store)
- ✅ Google Play Developer Account (for Play Store)
- ✅ App configured with correct Bundle IDs
- ✅ RevenueCat SDK integrated (already done)

## 🍎 iOS App Store Setup

### Step 1: Create App in App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Click "My Apps" → "+" → "New App"**
3. **Fill in app details:**
   - **Name:** GoFitAI
   - **Bundle ID:** `com.henrymadeit.gofitai` (must match your app.config.ts)
   - **SKU:** `gofitai-ios` (unique identifier)
   - **User Access:** Full Access

### Step 2: Set Up In-App Purchases

1. **Navigate to your app → Features → In-App Purchases**
2. **Click "+" to create new in-app purchases:**

#### Monthly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Reference Name:** GoFitAI Premium Monthly
- **Subscription Group:** Create new group "Premium Subscriptions"
- **Subscription Duration:** 1 Month
- **Price:** Choose your price tier (e.g., $9.99/month)

#### Yearly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Reference Name:** GoFitAI Premium Yearly
- **Subscription Group:** Use existing "Premium Subscriptions"
- **Subscription Duration:** 1 Year
- **Price:** Choose your price tier (e.g., $99.99/year)

#### Lifetime Premium (Optional)
- **Type:** Non-Consumable
- **Product ID:** `gofitai_premium_lifetime`
- **Reference Name:** GoFitAI Premium Lifetime
- **Price:** Choose your price tier (e.g., $299.99)

### Step 3: Configure Subscription Details

For each subscription, add:
- **Localizations** (at least English)
- **Subscription Display Name:** "GoFitAI Premium"
- **Description:** "Unlock unlimited AI-powered workouts, nutrition plans, and premium features"
- **Review Screenshot:** Upload a screenshot showing premium features

### Step 4: Set Up App Store Server Notifications

1. **Go to App Store Connect → Your App → App Information**
2. **Scroll to App Store Server Notifications**
3. **Add Production Server URL:** `https://your-domain.com/webhooks/appstore`
4. **Add Sandbox Server URL:** `https://your-domain.com/webhooks/appstore-sandbox`
5. **Shared Secret:** Generate and save this for later

## 🤖 Google Play Store Setup

### Step 1: Create App in Google Play Console

1. **Go to [Google Play Console](https://play.google.com/console)**
2. **Create new app:**
   - **App name:** GoFitAI
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free (with in-app purchases)

### Step 2: Set Up In-App Products

1. **Navigate to Monetization → Products → In-app products**
2. **Create products matching iOS:**

#### Monthly Premium Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Name:** GoFitAI Premium Monthly
- **Description:** Monthly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 month
- **Free trial:** Optional (e.g., 7 days)

#### Yearly Premium Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Name:** GoFitAI Premium Yearly
- **Description:** Yearly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 year

### Step 3: Configure Play Billing

1. **Go to Monetization → Play Billing**
2. **Set up Real-time developer notifications:**
   - **Topic name:** `revenuecat-rtdn`
   - **Endpoint URL:** Will be provided by RevenueCat

## ⚙️ RevenueCat Dashboard Configuration

### Step 1: Add App Store Credentials

1. **Go to [RevenueCat Dashboard](https://app.revenuecat.com)**
2. **Select your project → Apps → iOS App**
3. **Add App Store Connect credentials:**
   - **App Store Connect API Key:** Upload your API key file
   - **Issuer ID:** From App Store Connect API keys
   - **Key ID:** From App Store Connect API keys
   - **Vendor Number:** From App Store Connect
   - **Shared Secret:** From App Store Connect notifications setup

### Step 2: Add Google Play Credentials

1. **Select your project → Apps → Android App**
2. **Add Google Play credentials:**
   - **Service Account Key:** Upload JSON file from Google Cloud Console
   - **Package Name:** `com.henrymadeit.gofitai`

### Step 3: Configure Products

1. **Go to Products → Add Product for each:**
   - `gofitai_premium_monthly`
   - `gofitai_premium_yearly`
   - `gofitai_premium_lifetime` (iOS only)

### Step 4: Create Offerings

1. **Go to Offerings → Create Offering:**
   - **Identifier:** `default`
   - **Description:** Default subscription offering
   - **Add packages:** Monthly, Yearly, Lifetime

2. **Create additional offerings:**
   - **Identifier:** `onboarding`
   - **Description:** Special onboarding offer
   - **Identifier:** `paywall`
   - **Description:** Paywall offering

## 🔧 App Configuration Updates

Update your RevenueCat configuration to match the products you created:

```typescript
// src/config/revenuecat.ts
export const REVENUECAT_CONFIG = {
  // Product IDs (must match App Store Connect and Google Play Console)
  PRODUCT_IDS: {
    MONTHLY_PREMIUM: 'gofitai_premium_monthly',
    YEARLY_PREMIUM: 'gofitai_premium_yearly',
    LIFETIME_PREMIUM: 'gofitai_premium_lifetime',
  },
  
  // Entitlement IDs (must match RevenueCat dashboard)
  ENTITLEMENTS: {
    PREMIUM: 'premium',
  },
  
  // Offering IDs (must match RevenueCat dashboard)
  OFFERINGS: {
    DEFAULT: 'default',
    ONBOARDING: 'onboarding',
    PAYWALL: 'paywall',
  },
} as const;
```

## 🧪 Testing In-App Purchases

### iOS Sandbox Testing

1. **Create Sandbox Test Users:**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create test accounts with different regions/currencies

2. **Test on Device:**
   - Sign out of App Store on test device
   - Install your app (TestFlight or development build)
   - Attempt purchase - iOS will prompt to sign in with sandbox account

3. **Test Scenarios:**
   - Purchase monthly subscription
   - Purchase yearly subscription  
   - Cancel and restore subscription
   - Test subscription renewal
   - Test different payment methods

### Android Testing

1. **Set up Google Play Internal Testing:**
   - Upload AAB to Google Play Console
   - Create internal testing track
   - Add test users

2. **Test License Testing:**
   - Add test accounts in Google Play Console
   - Set up license testing responses

### RevenueCat Webhook Testing

1. **Set up webhook endpoint:**
```javascript
// Example webhook handler (Node.js/Express)
app.post('/webhooks/revenuecat', (req, res) => {
  const event = req.body;
  
  console.log('RevenueCat webhook received:', event.type);
  
  switch (event.type) {
    case 'INITIAL_PURCHASE':
      // Handle new subscription
      break;
    case 'RENEWAL':
      // Handle subscription renewal
      break;
    case 'CANCELLATION':
      // Handle subscription cancellation
      break;
    case 'EXPIRATION':
      // Handle subscription expiration
      break;
  }
  
  res.status(200).send('OK');
});
```

## 📱 UI Integration

### Adding Paywall to Your App

The paywall component is already created. Use it in your app:

```typescript
import { PaywallScreen } from '../src/components/subscription/PaywallScreen';

// Show paywall when user hits premium feature
const showPaywall = () => {
  router.push('/paywall');
};

// Or use as modal
const [showPaywallModal, setShowPaywallModal] = useState(false);

{showPaywallModal && (
  <PaywallScreen 
    onClose={() => setShowPaywallModal(false)}
    source="feature_limit"
    offeringId="default"
  />
)}
```

### Subscription Status Check

```typescript
import { useSubscription } from '../src/hooks/useSubscription';

const MyComponent = () => {
  const { isPremium, openPaywall } = useSubscription();
  
  const handlePremiumFeature = () => {
    if (!isPremium) {
      openPaywall();
      return;
    }
    
    // Execute premium feature
  };
  
  return (
    <TouchableOpacity onPress={handlePremiumFeature}>
      <Text>
        {isPremium ? 'Premium Feature' : 'Upgrade to Premium'}
      </Text>
    </TouchableOpacity>
  );
};
```

## 🚀 Production Deployment

### iOS App Store

1. **Submit for Review:**
   - Upload build to App Store Connect
   - Fill out App Review Information
   - Include test account credentials for reviewers

2. **App Review Guidelines:**
   - Clearly describe premium features
   - Ensure subscription terms are visible
   - Test all purchase flows

### Google Play Store

1. **Submit for Review:**
   - Upload AAB to Google Play Console
   - Complete store listing
   - Submit for review

2. **Play Billing Guidelines:**
   - Follow Google Play Billing policies
   - Implement proper subscription management

## 📊 Analytics & Monitoring

### RevenueCat Dashboard

Monitor key metrics:
- Monthly Recurring Revenue (MRR)
- Churn rate
- Conversion rates
- Geographic performance

### Custom Analytics

Track subscription events in your analytics:

```typescript
import { analyticsTrack } from '../services/analytics';

// Track paywall views
analyticsTrack('paywall_viewed', { source: 'feature_limit' });

// Track purchases
analyticsTrack('subscription_purchased', { 
  product_id: 'gofitai_premium_yearly',
  price: 99.99 
});

// Track cancellations
analyticsTrack('subscription_cancelled', { 
  product_id: 'gofitai_premium_yearly',
  reason: 'user_initiated' 
});
```

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API Key" Error:**
   - Verify Bundle ID matches RevenueCat project
   - Check API key is correctly set in environment
   - Restart Expo with `--clear` flag

2. **Products Not Loading:**
   - Ensure products are approved in App Store Connect
   - Check product IDs match exactly
   - Verify app is signed with correct provisioning profile

3. **Sandbox Purchases Not Working:**
   - Sign out of App Store on device
   - Use sandbox test account
   - Check sandbox environment is enabled

4. **Webhook Not Receiving Events:**
   - Verify webhook URL is publicly accessible
   - Check webhook secret matches
   - Monitor webhook logs for errors

### Debug Commands

```bash
# Check RevenueCat configuration
npm run debug-revenuecat

# Test API connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.revenuecat.com/v1/subscribers/test-user

# Check app configuration
npx expo config --type public
```

## 📞 Support

- **RevenueCat Documentation:** https://docs.revenuecat.com
- **RevenueCat Support:** https://community.revenuecat.com
- **Apple Developer Support:** https://developer.apple.com/support
- **Google Play Support:** https://support.google.com/googleplay/android-developer

---

## ✅ Checklist

Before going live, ensure:

- [ ] Products created in App Store Connect
- [ ] Products created in Google Play Console  
- [ ] RevenueCat dashboard configured
- [ ] API keys properly set
- [ ] Paywall UI implemented
- [ ] Subscription status checks added
- [ ] Sandbox testing completed
- [ ] Webhook handlers implemented
- [ ] Analytics tracking added
- [ ] App store submissions prepared

🎉 **Congratulations!** Your app now has full in-app purchase integration with RevenueCat!







This guide walks you through integrating RevenueCat with iOS App Store and Google Play Store to enable in-app purchases in your GoFitAI app.

## 📋 Prerequisites

- ✅ RevenueCat account and project created
- ✅ iOS Developer Account (for App Store)
- ✅ Google Play Developer Account (for Play Store)
- ✅ App configured with correct Bundle IDs
- ✅ RevenueCat SDK integrated (already done)

## 🍎 iOS App Store Setup

### Step 1: Create App in App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Click "My Apps" → "+" → "New App"**
3. **Fill in app details:**
   - **Name:** GoFitAI
   - **Bundle ID:** `com.henrymadeit.gofitai` (must match your app.config.ts)
   - **SKU:** `gofitai-ios` (unique identifier)
   - **User Access:** Full Access

### Step 2: Set Up In-App Purchases

1. **Navigate to your app → Features → In-App Purchases**
2. **Click "+" to create new in-app purchases:**

#### Monthly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Reference Name:** GoFitAI Premium Monthly
- **Subscription Group:** Create new group "Premium Subscriptions"
- **Subscription Duration:** 1 Month
- **Price:** Choose your price tier (e.g., $9.99/month)

#### Yearly Premium Subscription
- **Type:** Auto-Renewable Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Reference Name:** GoFitAI Premium Yearly
- **Subscription Group:** Use existing "Premium Subscriptions"
- **Subscription Duration:** 1 Year
- **Price:** Choose your price tier (e.g., $99.99/year)

#### Lifetime Premium (Optional)
- **Type:** Non-Consumable
- **Product ID:** `gofitai_premium_lifetime`
- **Reference Name:** GoFitAI Premium Lifetime
- **Price:** Choose your price tier (e.g., $299.99)

### Step 3: Configure Subscription Details

For each subscription, add:
- **Localizations** (at least English)
- **Subscription Display Name:** "GoFitAI Premium"
- **Description:** "Unlock unlimited AI-powered workouts, nutrition plans, and premium features"
- **Review Screenshot:** Upload a screenshot showing premium features

### Step 4: Set Up App Store Server Notifications

1. **Go to App Store Connect → Your App → App Information**
2. **Scroll to App Store Server Notifications**
3. **Add Production Server URL:** `https://your-domain.com/webhooks/appstore`
4. **Add Sandbox Server URL:** `https://your-domain.com/webhooks/appstore-sandbox`
5. **Shared Secret:** Generate and save this for later

## 🤖 Google Play Store Setup

### Step 1: Create App in Google Play Console

1. **Go to [Google Play Console](https://play.google.com/console)**
2. **Create new app:**
   - **App name:** GoFitAI
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free (with in-app purchases)

### Step 2: Set Up In-App Products

1. **Navigate to Monetization → Products → In-app products**
2. **Create products matching iOS:**

#### Monthly Premium Subscription
- **Product ID:** `gofitai_premium_monthly`
- **Name:** GoFitAI Premium Monthly
- **Description:** Monthly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 month
- **Free trial:** Optional (e.g., 7 days)

#### Yearly Premium Subscription
- **Product ID:** `gofitai_premium_yearly`
- **Name:** GoFitAI Premium Yearly
- **Description:** Yearly subscription to GoFitAI Premium features
- **Price:** Match iOS pricing
- **Subscription period:** 1 year

### Step 3: Configure Play Billing

1. **Go to Monetization → Play Billing**
2. **Set up Real-time developer notifications:**
   - **Topic name:** `revenuecat-rtdn`
   - **Endpoint URL:** Will be provided by RevenueCat

## ⚙️ RevenueCat Dashboard Configuration

### Step 1: Add App Store Credentials

1. **Go to [RevenueCat Dashboard](https://app.revenuecat.com)**
2. **Select your project → Apps → iOS App**
3. **Add App Store Connect credentials:**
   - **App Store Connect API Key:** Upload your API key file
   - **Issuer ID:** From App Store Connect API keys
   - **Key ID:** From App Store Connect API keys
   - **Vendor Number:** From App Store Connect
   - **Shared Secret:** From App Store Connect notifications setup

### Step 2: Add Google Play Credentials

1. **Select your project → Apps → Android App**
2. **Add Google Play credentials:**
   - **Service Account Key:** Upload JSON file from Google Cloud Console
   - **Package Name:** `com.henrymadeit.gofitai`

### Step 3: Configure Products

1. **Go to Products → Add Product for each:**
   - `gofitai_premium_monthly`
   - `gofitai_premium_yearly`
   - `gofitai_premium_lifetime` (iOS only)

### Step 4: Create Offerings

1. **Go to Offerings → Create Offering:**
   - **Identifier:** `default`
   - **Description:** Default subscription offering
   - **Add packages:** Monthly, Yearly, Lifetime

2. **Create additional offerings:**
   - **Identifier:** `onboarding`
   - **Description:** Special onboarding offer
   - **Identifier:** `paywall`
   - **Description:** Paywall offering

## 🔧 App Configuration Updates

Update your RevenueCat configuration to match the products you created:

```typescript
// src/config/revenuecat.ts
export const REVENUECAT_CONFIG = {
  // Product IDs (must match App Store Connect and Google Play Console)
  PRODUCT_IDS: {
    MONTHLY_PREMIUM: 'gofitai_premium_monthly',
    YEARLY_PREMIUM: 'gofitai_premium_yearly',
    LIFETIME_PREMIUM: 'gofitai_premium_lifetime',
  },
  
  // Entitlement IDs (must match RevenueCat dashboard)
  ENTITLEMENTS: {
    PREMIUM: 'premium',
  },
  
  // Offering IDs (must match RevenueCat dashboard)
  OFFERINGS: {
    DEFAULT: 'default',
    ONBOARDING: 'onboarding',
    PAYWALL: 'paywall',
  },
} as const;
```

## 🧪 Testing In-App Purchases

### iOS Sandbox Testing

1. **Create Sandbox Test Users:**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create test accounts with different regions/currencies

2. **Test on Device:**
   - Sign out of App Store on test device
   - Install your app (TestFlight or development build)
   - Attempt purchase - iOS will prompt to sign in with sandbox account

3. **Test Scenarios:**
   - Purchase monthly subscription
   - Purchase yearly subscription  
   - Cancel and restore subscription
   - Test subscription renewal
   - Test different payment methods

### Android Testing

1. **Set up Google Play Internal Testing:**
   - Upload AAB to Google Play Console
   - Create internal testing track
   - Add test users

2. **Test License Testing:**
   - Add test accounts in Google Play Console
   - Set up license testing responses

### RevenueCat Webhook Testing

1. **Set up webhook endpoint:**
```javascript
// Example webhook handler (Node.js/Express)
app.post('/webhooks/revenuecat', (req, res) => {
  const event = req.body;
  
  console.log('RevenueCat webhook received:', event.type);
  
  switch (event.type) {
    case 'INITIAL_PURCHASE':
      // Handle new subscription
      break;
    case 'RENEWAL':
      // Handle subscription renewal
      break;
    case 'CANCELLATION':
      // Handle subscription cancellation
      break;
    case 'EXPIRATION':
      // Handle subscription expiration
      break;
  }
  
  res.status(200).send('OK');
});
```

## 📱 UI Integration

### Adding Paywall to Your App

The paywall component is already created. Use it in your app:

```typescript
import { PaywallScreen } from '../src/components/subscription/PaywallScreen';

// Show paywall when user hits premium feature
const showPaywall = () => {
  router.push('/paywall');
};

// Or use as modal
const [showPaywallModal, setShowPaywallModal] = useState(false);

{showPaywallModal && (
  <PaywallScreen 
    onClose={() => setShowPaywallModal(false)}
    source="feature_limit"
    offeringId="default"
  />
)}
```

### Subscription Status Check

```typescript
import { useSubscription } from '../src/hooks/useSubscription';

const MyComponent = () => {
  const { isPremium, openPaywall } = useSubscription();
  
  const handlePremiumFeature = () => {
    if (!isPremium) {
      openPaywall();
      return;
    }
    
    // Execute premium feature
  };
  
  return (
    <TouchableOpacity onPress={handlePremiumFeature}>
      <Text>
        {isPremium ? 'Premium Feature' : 'Upgrade to Premium'}
      </Text>
    </TouchableOpacity>
  );
};
```

## 🚀 Production Deployment

### iOS App Store

1. **Submit for Review:**
   - Upload build to App Store Connect
   - Fill out App Review Information
   - Include test account credentials for reviewers

2. **App Review Guidelines:**
   - Clearly describe premium features
   - Ensure subscription terms are visible
   - Test all purchase flows

### Google Play Store

1. **Submit for Review:**
   - Upload AAB to Google Play Console
   - Complete store listing
   - Submit for review

2. **Play Billing Guidelines:**
   - Follow Google Play Billing policies
   - Implement proper subscription management

## 📊 Analytics & Monitoring

### RevenueCat Dashboard

Monitor key metrics:
- Monthly Recurring Revenue (MRR)
- Churn rate
- Conversion rates
- Geographic performance

### Custom Analytics

Track subscription events in your analytics:

```typescript
import { analyticsTrack } from '../services/analytics';

// Track paywall views
analyticsTrack('paywall_viewed', { source: 'feature_limit' });

// Track purchases
analyticsTrack('subscription_purchased', { 
  product_id: 'gofitai_premium_yearly',
  price: 99.99 
});

// Track cancellations
analyticsTrack('subscription_cancelled', { 
  product_id: 'gofitai_premium_yearly',
  reason: 'user_initiated' 
});
```

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API Key" Error:**
   - Verify Bundle ID matches RevenueCat project
   - Check API key is correctly set in environment
   - Restart Expo with `--clear` flag

2. **Products Not Loading:**
   - Ensure products are approved in App Store Connect
   - Check product IDs match exactly
   - Verify app is signed with correct provisioning profile

3. **Sandbox Purchases Not Working:**
   - Sign out of App Store on device
   - Use sandbox test account
   - Check sandbox environment is enabled

4. **Webhook Not Receiving Events:**
   - Verify webhook URL is publicly accessible
   - Check webhook secret matches
   - Monitor webhook logs for errors

### Debug Commands

```bash
# Check RevenueCat configuration
npm run debug-revenuecat

# Test API connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.revenuecat.com/v1/subscribers/test-user

# Check app configuration
npx expo config --type public
```

## 📞 Support

- **RevenueCat Documentation:** https://docs.revenuecat.com
- **RevenueCat Support:** https://community.revenuecat.com
- **Apple Developer Support:** https://developer.apple.com/support
- **Google Play Support:** https://support.google.com/googleplay/android-developer

---

## ✅ Checklist

Before going live, ensure:

- [ ] Products created in App Store Connect
- [ ] Products created in Google Play Console  
- [ ] RevenueCat dashboard configured
- [ ] API keys properly set
- [ ] Paywall UI implemented
- [ ] Subscription status checks added
- [ ] Sandbox testing completed
- [ ] Webhook handlers implemented
- [ ] Analytics tracking added
- [ ] App store submissions prepared

🎉 **Congratulations!** Your app now has full in-app purchase integration with RevenueCat!












