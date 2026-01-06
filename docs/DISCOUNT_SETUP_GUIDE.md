# 💰 Discount Setup Guide: App Store Connect & RevenueCat

## Overview

There are several ways to offer discounts to users. Here are your options:

---

## 🎯 Option 1: Introductory Offers (Applies to ALL New Users)

**Use Case**: Discount for ALL first-time subscribers automatically

⚠️ **IMPORTANT**: Introductory Offers apply to **ALL new subscribers automatically** - you cannot restrict them to only users who click the X button. If you want the discount to only show for users who see the "limited offer" page, use **Option 2: Promotional Offers** instead.

### Setup in App Store Connect:

1. **Go to App Store Connect** → Your App → **Subscriptions**
2. **Select your subscription** (`gofitai_premium_monthly1`)
3. **Click "Manage"** → **"Introductory Offers"**
4. **Click "+" to add an introductory offer**

#### Configure the Offer:

- **Reference Name**: `Limited Time Discount` (internal name)
- **Offer Type**: Choose one:
  - **Free Trial**: Free for X days (e.g., 7 days)
  - **Pay as You Go**: Discounted price for first period
    - Example: `$4.99` for first month (50% off $9.99)
  - **Pay Up Front**: Pay discounted price upfront for multiple periods
- **Duration**: 
  - `1 period` (first month only)
  - `2 periods` (first 2 months)
  - etc.
- **Start Date**: When the offer becomes available
- **End Date**: When the offer expires (optional)

#### Example Configuration:
```
Offer Type: Pay as You Go
Price: $4.99 (50% off regular $9.99)
Duration: 1 period
Availability: All new subscribers
```

### Setup in RevenueCat:

1. **Go to RevenueCat Dashboard** → Your Project
2. **Products** → Select `gofitai_premium_monthly1`
3. The introductory offer will automatically sync from App Store Connect
4. **No additional configuration needed** - RevenueCat reads it automatically

### Code Implementation:

RevenueCat automatically includes introductory offers in the product data:

```typescript
// The product will have introPrice populated
const monthlyPackage = offerings[0].availablePackages.find(
  pkg => pkg.packageType === 'MONTHLY'
);

if (monthlyPackage?.product.introPrice) {
  // Display: "First month $4.99, then $9.99/month"
  console.log(monthlyPackage.product.introPrice.priceString);
}
```

---

## 🎁 Option 2: Promotional Offers (For Selective Discounts) ⭐ RECOMMENDED FOR YOUR USE CASE

**Use Case**: Discount that you can apply **selectively** - only when user clicks X button and sees the limited offer page

✅ **This is what you need** if you want the discount to ONLY apply to users who click the X button. Other users pay the normal price.

### Setup in App Store Connect:

1. **Go to App Store Connect** → Your App → **Subscriptions**
2. **Select your subscription** → **"Promotional Offers"**
3. **Click "+" to create a promotional offer**

#### Configure the Offer:

- **Reference Name**: `Limited Time 30% Off` (internal name)
- **Offer Code**: `LIMITED30` (users enter this code, or you can apply programmatically)
- **Offer Type**: 
  - **Pay as You Go**: Discounted price per period
  - **Pay Up Front**: Discounted price for multiple periods
- **Duration**: How many periods the discount applies
- **Customer Eligibility**: 
  - All eligible customers
  - Specific customer segments
- **Start/End Dates**: When the offer is valid

### Setup in RevenueCat:

1. **RevenueCat Dashboard** → **Promotional Offers**
2. **Create Promotional Offer**:
   - **Offer ID**: `limited_offer_30` (your internal ID)
   - **App Store Offer Code**: `LIMITED30` (matches App Store Connect)
   - **Duration**: Number of periods
   - **Discount**: Percentage or fixed amount

3. **Apply via API** (when user claims the offer):

```typescript
// In your limited-offer.tsx when user clicks "Claim"
import Purchases from 'react-native-purchases';

const applyPromotionalOffer = async (discountPercent: number) => {
  try {
    // Get the promotional offer from RevenueCat
    const offerings = await Purchases.getOfferings();
    const monthlyPackage = offerings.current?.availablePackages.find(
      pkg => pkg.packageType === 'MONTHLY'
    );
    
    if (monthlyPackage) {
      // Apply the promotional offer
      const { customerInfo } = await Purchases.purchasePackage(
        monthlyPackage,
        { promotionalOffer: 'limited_offer_30' } // Your offer ID
      );
      
      return { success: true, customerInfo };
    }
  } catch (error) {
    console.error('Failed to apply promotional offer:', error);
    return { success: false, error };
  }
};
```

---

## 🔄 Option 3: Multiple Products with Different Prices

**Use Case**: Create separate subscription products at different price points

### Setup in App Store Connect:

1. **Create a new subscription product**:
   - **Product ID**: `gofitai_premium_monthly_discounted`
   - **Price**: `$4.99/month` (discounted price)
   - **Same subscription group** as your main monthly subscription

2. **Configure in RevenueCat**:
   - **Products** → Add new product
   - **Packages** → Create package with this product
   - **Offerings** → Add to your offering

### Code Implementation:

```typescript
// In limited-offer.tsx
const handleClaim = async () => {
  const offerings = await Purchases.getOfferings();
  
  // Find the discounted monthly package
  const discountedPackage = offerings.current?.availablePackages.find(
    pkg => pkg.identifier === 'monthly_discounted' // Your package ID
  );
  
  if (discountedPackage) {
    await Purchases.purchasePackage(discountedPackage);
  }
};
```

---

## 🎲 Option 4: Dynamic Promotional Offers (Recommended for Your Use Case)

**Best for**: Random discounts shown when user closes paywall

### Step 1: Create Multiple Promotional Offers in App Store Connect

Create several promotional offers with different discount codes:

- `LIMITED10` - 10% off
- `LIMITED15` - 15% off  
- `LIMITED20` - 20% off
- `LIMITED25` - 25% off
- `LIMITED30` - 30% off

Each with the same configuration but different discount amounts.

### Step 2: Map Discounts to Offer Codes in RevenueCat

1. **RevenueCat Dashboard** → **Promotional Offers**
2. Create promotional offers matching each App Store Connect code
3. Map them in your code:

```typescript
// In limited-offer.tsx
const DISCOUNT_OFFER_MAP: Record<number, string> = {
  10: 'LIMITED10',
  15: 'LIMITED15',
  20: 'LIMITED20',
  25: 'LIMITED25',
  30: 'LIMITED30',
};

const handleClaim = async () => {
  const offerCode = DISCOUNT_OFFER_MAP[discount];
  
  const offerings = await Purchases.getOfferings();
  const monthlyPackage = offerings.current?.availablePackages.find(
    pkg => pkg.packageType === 'MONTHLY'
  );
  
  if (monthlyPackage && offerCode) {
    await Purchases.purchasePackage(monthlyPackage, {
      promotionalOffer: offerCode
    });
  }
};
```

---

## 📋 Recommended Setup for Your "Limited Offer" Feature

### ⚠️ Important Decision:

**Do you want the discount to:**
- **Apply to ALL new users automatically?** → Use **Option 1: Introductory Offers**
- **Only apply when user clicks X button?** → Use **Option 2: Promotional Offers** ⭐ (Recommended for your use case)

### Setup Option A: Promotional Offers (Selective Discount) ⭐

**This ensures only users who click X get the discount:**

1. **App Store Connect**:
   - Go to `gofitai_premium_monthly1` subscription
   - Click **"Promotional Offers"** (NOT Introductory Offers)
   - Create 5 promotional offers:
     - `LIMITED10` - 10% off first month
     - `LIMITED15` - 15% off first month
     - `LIMITED20` - 20% off first month
     - `LIMITED25` - 25% off first month
     - `LIMITED30` - 30% off first month
   - For each offer:
     - **Offer Type**: Pay as You Go
     - **Price**: Calculate discounted price (e.g., 20% off $9.99 = $7.99)
     - **Duration**: 1 period (first month only)
     - **Customer Eligibility**: All eligible customers

2. **RevenueCat Dashboard**:
   - Go to **Promotional Offers**
   - Create promotional offers matching each App Store Connect code
   - Map them: `limited_offer_10`, `limited_offer_15`, etc.

3. **Update Your Code** (I'll help you with this):

```typescript
// In limited-offer.tsx
const DISCOUNT_OFFER_MAP: Record<number, string> = {
  10: 'LIMITED10',
  15: 'LIMITED15',
  20: 'LIMITED20',
  25: 'LIMITED25',
  30: 'LIMITED30',
};

const handleClaim = async () => {
  const offerCode = DISCOUNT_OFFER_MAP[discount];
  // Navigate to paywall with the offer code
  router.replace(`/(paywall)?promoCode=${offerCode}&highlight=monthly`);
};
```

### Setup Option B: Introductory Offers (All Users Get Discount):

**This applies discount to ALL new subscribers automatically:**

1. **App Store Connect**:
   - Go to `gofitai_premium_monthly1` subscription
   - Add **Introductory Offer**: `$4.99` for first month (50% off)
   - Set duration: `1 period`
   - Make it available to all new subscribers

2. **RevenueCat**: 
   - No additional setup needed - it syncs automatically

3. **Update Your Code**:

```typescript
// In limited-offer.tsx
const handleClaim = () => {
  // Navigate to paywall - the intro offer will show automatically
  router.replace('/(paywall)?highlight=monthly');
};

// In PaywallScreen.tsx - display the intro price
const displayPrice = (pkg: any) => {
  if (pkg.product.introPrice) {
    return `${pkg.product.introPrice.priceString} for first month, then ${pkg.product.priceString}/month`;
  }
  return `${pkg.product.priceString}/month`;
};
```

### Advanced Setup (Random Discounts with Promotional Offers):

1. **App Store Connect**: Create 5 promotional offers (10%, 15%, 20%, 25%, 30%)
2. **RevenueCat**: Map each offer code
3. **Code**: Use the discount mapping approach above

---

## ⚠️ Important Notes

1. **Introductory Offers** are only for **new subscribers** who have never subscribed before
2. **Promotional Offers** can be for **returning subscribers** or **new subscribers** (depending on eligibility rules)
3. **Apple Review**: All offers must comply with App Store guidelines
4. **Testing**: Use Sandbox test accounts to test offers before going live
5. **RevenueCat Sync**: Changes in App Store Connect can take a few minutes to sync to RevenueCat

---

## 🧪 Testing

1. **Create Sandbox Test Account** in App Store Connect
2. **Sign out** of your Apple ID on the test device
3. **Test the purchase flow** with the sandbox account
4. **Verify** the discount is applied correctly

---

## 📚 Resources

- [Apple: Introductory Offers](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers/creating_introductory_offers)
- [Apple: Promotional Offers](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers/creating_promotional_offers)
- [RevenueCat: Promotional Offers](https://docs.revenuecat.com/docs/promotional-offers)





