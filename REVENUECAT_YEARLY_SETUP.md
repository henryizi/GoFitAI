# ✅ RevenueCat Yearly Subscription Setup Guide

## Issue
RevenueCat warning: `Could not find products with identifiers: ["gofitai_premium_yearly1"]`

This means the product exists in App Store Connect (approved ✅) but needs to be configured in RevenueCat.

---

## 🔧 Step-by-Step Fix

### Step 1: Add Product to RevenueCat Dashboard

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Select your project** (GoFitAI)
3. **Navigate to**: Products → **Add Product**
4. **Enter Product ID**: `gofitai_premium_yearly1`
   - ⚠️ **Must match exactly** - no spaces, no typos
5. **Select Platform**: iOS (and Android if applicable)
6. **Click "Add"**

### Step 2: Create Package for Yearly Subscription

1. **Go to**: Packages tab
2. **Click**: "+ New Package"
3. **Configure Package**:
   - **Package ID**: `yearly_premium` (or `yearly_premium1`)
   - **Product**: Select `gofitai_premium_yearly1` from dropdown
   - **Package Type**: **Annual** (or **Yearly**)
4. **Click**: "Create"

### Step 3: Add Package to Offering

1. **Go to**: Offerings → **"default"** offering
2. **Click**: "Edit" or "Add Package"
3. **Add** the yearly package you just created
4. **Save** the offering

### Step 4: Verify Configuration

Your offering should now have:
- ✅ Monthly package (`gofitai_premium_monthly1`)
- ✅ Yearly package (`gofitai_premium_yearly1`) ← **NEW**
- ✅ Lifetime package (`gofitai_premium_lifetime1`)

---

## 🧪 Test the Configuration

After completing the above steps:

1. **Restart your app** (close completely and reopen)
2. **Check the console** - the warning should disappear
3. **Open the paywall** - you should see the yearly option
4. **Verify pricing** - the yearly price should match App Store Connect

---

## 📋 Quick Checklist

- [ ] Product `gofitai_premium_yearly1` added to RevenueCat Products
- [ ] Package created with Product `gofitai_premium_yearly1`
- [ ] Package added to "default" offering
- [ ] App restarted and tested
- [ ] Warning no longer appears in console
- [ ] Yearly subscription appears in paywall

---

## 🔍 Verify Product IDs Match

**In your code** (`src/config/revenuecat.ts`):
```typescript
yearly: 'gofitai_premium_yearly1',
```

**In App Store Connect**:
- Product ID should be: `gofitai_premium_yearly1`

**In RevenueCat Dashboard**:
- Product ID should be: `gofitai_premium_yearly1`

**All three must match exactly!**

---

## 💡 Lifetime Price Update

If you also updated the lifetime subscription price in App Store Connect:

1. **RevenueCat will automatically sync** the new price from App Store Connect
2. **No code changes needed** - RevenueCat fetches prices dynamically
3. **Wait 5-10 minutes** for sync to complete
4. **Restart app** to see updated price

---

## 🆘 Still Having Issues?

If the warning persists after completing all steps:

1. **Check RevenueCat Dashboard** → Products → Verify product exists
2. **Check RevenueCat Dashboard** → Packages → Verify package exists and is linked
3. **Check RevenueCat Dashboard** → Offerings → Verify package is in offering
4. **Wait 5-10 minutes** for changes to propagate
5. **Clear app cache** and restart
6. **Check RevenueCat logs** in dashboard for any errors

---

## 📞 Support Resources

- **RevenueCat Docs**: https://docs.revenuecat.com/docs/entitlements
- **Product Configuration**: https://docs.revenuecat.com/docs/creating-products
- **Package Setup**: https://docs.revenuecat.com/docs/offerings




