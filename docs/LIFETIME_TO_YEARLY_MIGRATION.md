# 🔄 Complete Guide: Switching from Lifetime to Yearly Subscription

## Overview

This guide will help you replace the lifetime purchase option with a yearly subscription. This involves changes in App Store Connect, RevenueCat Dashboard, and your codebase.

---

## 📱 Step 1: Create Yearly Subscription in App Store Connect

### A. Create New Subscription Product

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **My Apps** → Select **GoFitAI**
3. **Subscriptions** (left sidebar)
4. **Click your subscription group** (e.g., "GoFitAI Premium")
5. **Click "+"** to add a new subscription

### B. Configure Yearly Subscription

**Product Information:**
- **Product ID**: `gofitai_premium_yearly1` ⚠️ **Must match exactly in code**
- **Reference Name**: `GoFitAI Premium Yearly` (internal name)
- **Subscription Duration**: **1 Year**
- **Price**: Set your yearly price (e.g., `$79.99/year` or `$99.99/year`)
  - **Tip**: Yearly is typically 2-3x monthly price for better value
  - Example: If monthly is $9.99, yearly could be $79.99 (saves ~33%)

**Subscription Details:**
- **Subscription Group**: Same group as your monthly subscription
- **Review Information**: Fill out required fields
- **Localizations**: Add descriptions for all supported languages

### C. Submit for Review

1. **Save** the subscription product
2. **Submit for Review** (if required)
3. **Wait for approval** (usually 24-48 hours)

---

## 🎯 Step 2: Configure in RevenueCat Dashboard

### A. Add New Product

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Select your project** (GoFitAI)
3. **Products** → **Add Product**
4. **Product ID**: `gofitai_premium_yearly1`
5. **Platform**: iOS (and Android if applicable)
6. **Click "Add"**

### B. Create Yearly Package

1. **Go to Packages** tab
2. **Click "+ New Package"**
3. **Configure:**
   - **Package ID**: `yearly_premium` (or `yearly_premium1`)
   - **Product**: Select `gofitai_premium_yearly1`
   - **Package Type**: **Annual** (or **Yearly**)
4. **Click "Create"**

### C. Update Offerings

1. **Go to Offerings** → **"default"** offering
2. **Remove** the lifetime package (if you want to completely replace it)
3. **Add** the new yearly package
4. **Save**

---

## 💻 Step 3: Update Your Code

### A. Update RevenueCat Config

**File**: `src/config/revenuecat.ts`

```typescript
// Change from:
products: {
  premium: {
    monthly: 'gofitai_premium_monthly1',
    lifetime: 'gofitai_premium_lifetime1',  // ❌ Remove this
  },
},

// To:
products: {
  premium: {
    monthly: 'gofitai_premium_monthly1',
    yearly: 'gofitai_premium_yearly1',  // ✅ Add this
  },
},
```

### B. Update PaywallScreen Component

**File**: `src/components/subscription/PaywallScreen.tsx`

**Find and replace all instances:**

1. **Package Finding Logic** (around line 96):
```typescript
// Change from:
const lifetimePkg = availableOfferings[0].availablePackages.find((pkg: any) => 
  pkg.packageType === 'LIFETIME' || pkg.identifier.includes('lifetime')
);

// To:
const yearlyPkg = availableOfferings[0].availablePackages.find((pkg: any) => 
  pkg.packageType === 'ANNUAL' || pkg.identifier.includes('yearly')
);
```

2. **Default Package Selection** (around line 104):
```typescript
// Change from:
if (monthlyPkg) {
  setSelectedPackage(monthlyPkg);
} else if (lifetimePkg) {
  setSelectedPackage(lifetimePkg);
}

// To:
if (monthlyPkg) {
  setSelectedPackage(monthlyPkg);
} else if (yearlyPkg) {
  setSelectedPackage(yearlyPkg);
}
```

3. **Package Variable Declaration** (around line 213):
```typescript
// Change from:
const lifetimePackage = offerings?.[0]?.availablePackages?.find((pkg: any) => 
  pkg.packageType === 'LIFETIME' || pkg.identifier.includes('lifetime')
);

// To:
const yearlyPackage = offerings?.[0]?.availablePackages?.find((pkg: any) => 
  pkg.packageType === 'ANNUAL' || pkg.identifier.includes('yearly')
);
```

4. **Plan Card Rendering** (around line 235):
```typescript
// Change from:
{pkg.packageType === 'LIFETIME' ? 'Lifetime Access' : 'Monthly Plan'}

// To:
{pkg.packageType === 'ANNUAL' ? 'Yearly Plan' : 'Monthly Plan'}
```

5. **Price Display** (around line 246):
```typescript
// Change from:
{pkg.packageType === 'LIFETIME' ? 'One-time payment' : '/month'}

// To:
{pkg.packageType === 'ANNUAL' ? '/year' : '/month'}
```

6. **Description Text** (around line 258):
```typescript
// Change from:
{pkg.packageType === 'LIFETIME' && (
  <Text style={styles.planDescription}>Pay once, own it forever. No recurring fees.</Text>
)}

// To:
{pkg.packageType === 'ANNUAL' && (
  <Text style={styles.planDescription}>Best value - save more with yearly billing.</Text>
)}
```

7. **Render Plan Call** (around line 372):
```typescript
// Change from:
{renderPlan(lifetimePackage, true)}

// To:
{renderPlan(yearlyPackage, true)}
```

8. **CTA Button Text** (around line 409):
```typescript
// Change from:
selectedPackage.product.priceString}${selectedPackage.packageType === 'LIFETIME' ? '' : '/month'}

// To:
selectedPackage.product.priceString}${selectedPackage.packageType === 'ANNUAL' ? '/year' : '/month'}
```

### C. Update RevenueCatService

**File**: `src/services/subscription/RevenueCatService.ts`

1. **Update Type Definition** (around line 45):
```typescript
// Change from:
periodType?: 'monthly' | 'lifetime';

// To:
periodType?: 'monthly' | 'yearly';
```

2. **Update Period Type Detection** (around line 702):
```typescript
// Change from:
let periodType: 'monthly' | 'lifetime' = 'monthly';
if (premiumEntitlement.productIdentifier.includes('lifetime')) {
  periodType = 'lifetime';
}

// To:
let periodType: 'monthly' | 'yearly' = 'monthly';
if (premiumEntitlement.productIdentifier.includes('yearly')) {
  periodType = 'yearly';
}
```

3. **Update Mock Service** (around line 457):
```typescript
// Change from:
{
  identifier: '$rc_lifetime',
  packageType: 'LIFETIME',
  product: {
    identifier: 'gofitai_premium_lifetime1',
    description: 'Premium Lifetime Access - One-time payment, yours forever!',
    title: 'GoFitAI Premium Lifetime',
    price: 79.99,
    priceString: '$79.99',
    currencyCode: 'USD'
  },
  offeringIdentifier: 'default'
}

// To:
{
  identifier: '$rc_yearly',
  packageType: 'ANNUAL',
  product: {
    identifier: 'gofitai_premium_yearly1',
    description: 'Premium Yearly Subscription - Best value, save more!',
    title: 'GoFitAI Premium Yearly',
    price: 79.99,
    priceString: '$79.99',
    currencyCode: 'USD'
  },
  offeringIdentifier: 'default'
}
```

4. **Update Mock Offerings Return** (around line 475):
```typescript
// Change from:
return [{
  identifier: 'default',
  description: 'GoFitAI Premium Plans',
  availablePackages: mockPackages,
  lifetime: mockPackages[1],
  monthly: mockPackages[0]
}];

// To:
return [{
  identifier: 'default',
  description: 'GoFitAI Premium Plans',
  availablePackages: mockPackages,
  annual: mockPackages[1],
  yearly: mockPackages[1],
  monthly: mockPackages[0]
}];
```

### D. Update SubscriptionContext (if exists)

**File**: `src/contexts/SubscriptionContext.tsx` (if this file exists)

Find and replace:
```typescript
// Change from:
periodType: 'lifetime',

// To:
periodType: 'yearly',
```

---

## 🧪 Step 4: Testing Checklist

### A. App Store Connect Verification

- [ ] Yearly subscription product created
- [ ] Product ID matches: `gofitai_premium_yearly1`
- [ ] Price set correctly
- [ ] Product status is "Ready to Submit" or "Active"

### B. RevenueCat Dashboard Verification

- [ ] Product `gofitai_premium_yearly1` added
- [ ] Package created with type "Annual" or "Yearly"
- [ ] Package added to "default" offering
- [ ] Lifetime package removed (if desired)

### C. Code Verification

- [ ] All `lifetime` references changed to `yearly`
- [ ] All `LIFETIME` package types changed to `ANNUAL`
- [ ] Product ID updated to `gofitai_premium_yearly1`
- [ ] UI text updated (e.g., "Yearly Plan" instead of "Lifetime Access")
- [ ] Price display shows "/year" instead of "One-time payment"

### D. Functional Testing

1. **Test Paywall Display**:
   - [ ] Yearly plan appears instead of lifetime
   - [ ] Price shows correctly (e.g., "$79.99/year")
   - [ ] Description text is correct
   - [ ] "BEST VALUE" badge appears on yearly plan

2. **Test Purchase Flow**:
   - [ ] Select yearly plan
   - [ ] Click subscribe button
   - [ ] Apple payment dialog shows correct price
   - [ ] Purchase completes successfully
   - [ ] Subscription activates correctly

3. **Test with Sandbox Account**:
   - [ ] Create/use sandbox test account
   - [ ] Complete purchase flow
   - [ ] Verify subscription is active
   - [ ] Check subscription details in RevenueCat dashboard

---

## ⚠️ Important Considerations

### ❌ DO NOT DELETE the Lifetime Product

**You CANNOT actually delete an in-app purchase product in App Store Connect** once it's been created or used. However, here's what you should do:

### Option 1: If You Have Existing Lifetime Subscribers

**You MUST keep the lifetime product active:**

1. ✅ **Keep the lifetime product** in App Store Connect (status: "Ready to Submit" or "Active")
2. ✅ **Keep lifetime package in RevenueCat** (for existing users)
3. ✅ **Update code to handle both**:
   - Show yearly for new users
   - Still recognize lifetime for existing users

**Code approach for supporting both:**
```typescript
// Check for both yearly and lifetime
const yearlyPkg = packages.find(pkg => 
  pkg.packageType === 'ANNUAL' || pkg.identifier.includes('yearly')
);
const lifetimePkg = packages.find(pkg => 
  pkg.packageType === 'LIFETIME' || pkg.identifier.includes('lifetime')
);

// Show yearly if available, otherwise show lifetime (for backward compatibility)
const bestValuePkg = yearlyPkg || lifetimePkg;
```

### Option 2: If You Have NO Existing Lifetime Subscribers

**You can remove it from sale (but don't delete):**

1. **In App Store Connect:**
   - Go to your subscription product
   - Click **"Remove from Sale"** (not delete)
   - This hides it from new purchases but keeps it in the system
   - Existing purchases (if any) will still work

2. **In RevenueCat:**
   - Remove the lifetime package from your offerings
   - Keep the product in RevenueCat (for historical data)

3. **In Your Code:**
   - Remove all lifetime references
   - Only show yearly and monthly

### Why You Can't Delete:

- **App Store Connect** doesn't allow deletion of products that have been submitted or used
- **Even if unused**, it's safer to "Remove from Sale" rather than trying to delete
- **Historical data** in RevenueCat and analytics may reference the product ID
- **Future compatibility** - keeping it allows you to re-enable it later if needed

### Recommended Approach:

**For most cases, keep both products active:**
- Show **yearly** as the "best value" option for new users
- Keep **lifetime** available but hidden (or show it as a secondary option)
- This gives you flexibility and doesn't break anything

### Pricing Strategy

**Recommended Yearly Pricing:**
- **Monthly**: $9.99/month = $119.88/year
- **Yearly**: $79.99/year (saves ~33%) or $99.99/year (saves ~17%)
- **Best Value**: Usually 2-3x monthly price

---

## 📋 Quick Reference: All Files to Update

1. ✅ `src/config/revenuecat.ts` - Product IDs
2. ✅ `src/components/subscription/PaywallScreen.tsx` - UI and package logic
3. ✅ `src/services/subscription/RevenueCatService.ts` - Service logic and types
4. ✅ `src/contexts/SubscriptionContext.tsx` - Context types (if exists)
5. ✅ `src/services/subscription/MockRevenueCatService.ts` - Mock data (if exists)

---

## 🚀 Deployment Steps

1. **Complete App Store Connect setup** (create yearly product)
2. **Complete RevenueCat setup** (add product and package)
3. **Update all code files** (use search & replace for efficiency)
4. **Test thoroughly** with sandbox account
5. **Submit app update** to App Store (if needed)
6. **Monitor** for any issues after deployment

---

## 🔍 Search & Replace Quick Commands

Use these patterns to find all occurrences:

**Find:**
- `lifetime` (case-insensitive)
- `LIFETIME`
- `gofitai_premium_lifetime1`
- `'lifetime'` or `"lifetime"`

**Replace with:**
- `yearly` or `annual`
- `ANNUAL` or `YEARLY`
- `gofitai_premium_yearly1`
- `'yearly'` or `"yearly"`

---

## ✅ Final Checklist

- [ ] Yearly subscription created in App Store Connect
- [ ] Yearly package created in RevenueCat
- [ ] All code files updated
- [ ] Tested with sandbox account
- [ ] UI displays correctly
- [ ] Purchase flow works
- [ ] Existing lifetime users still work (if applicable)
- [ ] Ready for production





