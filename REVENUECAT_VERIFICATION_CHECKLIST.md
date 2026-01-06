# ✅ RevenueCat Product Verification Checklist

If products are already in RevenueCat but you're still getting the warning, check these:

---

## 🔍 Step 1: Verify Product Exists

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Navigate to**: Products tab
3. **Search for**: `gofitai_premium_yearly1`
4. **Check**:
   - ✅ Product exists
   - ✅ Status is "Active" or "Available" (not "Pending" or "Error")
   - ✅ Platform shows iOS (or your platform)
   - ✅ Product ID matches exactly: `gofitai_premium_yearly1`

**If product doesn't exist or has errors**: Add/fix it first.

---

## 🔍 Step 2: Verify Package Exists and is Linked

1. **Go to**: Packages tab
2. **Search for**: Package containing `gofitai_premium_yearly1`
3. **Check**:
   - ✅ Package exists
   - ✅ Package is linked to product `gofitai_premium_yearly1`
   - ✅ Package Type is "Annual" or "Yearly"
   - ✅ Package status is "Active"

**If no package exists**: Create one and link it to the product.

**If package exists but not linked**: Edit package and select `gofitai_premium_yearly1` as the product.

---

## 🔍 Step 3: Verify Package is in Offering

1. **Go to**: Offerings tab
2. **Open**: "default" offering (or your main offering)
3. **Check**:
   - ✅ Yearly package is listed in the offering
   - ✅ Offering status is "Active"
   - ✅ Offering is set as "Current Offering" (if applicable)

**If package not in offering**: Add it to the offering.

**If no "default" offering**: Create one and add all packages.

---

## 🔍 Step 4: Verify App Store Connect Link

1. **Go to RevenueCat Dashboard** → Products → `gofitai_premium_yearly1`
2. **Check**:
   - ✅ Product shows "Linked" to App Store Connect
   - ✅ No error messages
   - ✅ Price information is visible

**If not linked**: Click "Link to App Store Connect" and select the product.

---

## 🔍 Step 5: Check Sync Status

1. **Go to RevenueCat Dashboard** → Products → `gofitai_premium_yearly1`
2. **Look for**:
   - Last sync timestamp
   - Any sync errors
   - Status indicators

**If sync is pending**: Wait 5-10 minutes and check again.

**If sync failed**: Check error message and fix the issue.

---

## 🔍 Step 6: Verify Code Configuration

**File**: `src/config/revenuecat.ts`

```typescript
products: {
  premium: {
    monthly: 'gofitai_premium_monthly1',
    yearly: 'gofitai_premium_yearly1',  // ← Must match exactly
    lifetime: 'gofitai_premium_lifetime1',
  },
}
```

**Check**:
- ✅ Product ID matches exactly: `gofitai_premium_yearly1`
- ✅ No typos or extra spaces
- ✅ Same casing (all lowercase)

---

## 🔍 Step 7: Test in App

1. **Completely close your app** (force quit)
2. **Reopen the app**
3. **Check console logs** for:
   - `[RevenueCat] 📦 Offerings response`
   - `[RevenueCat] ✅ Using current offering`
   - Package count and types

4. **Open paywall** and verify:
   - Yearly subscription option appears
   - Price is correct
   - No errors

---

## 🐛 Common Issues Even When Product Exists

### Issue 1: Product Not Linked to Package
**Symptom**: Product exists but warning persists
**Fix**: Create package and link it to the product

### Issue 2: Package Not in Offering
**Symptom**: Package exists but app can't see it
**Fix**: Add package to "default" offering

### Issue 3: Offering Not Set as Current
**Symptom**: Offering exists but not being used
**Fix**: Set "default" offering as current offering

### Issue 4: Sync Delay
**Symptom**: Everything looks correct but still not working
**Fix**: Wait 10-15 minutes, then restart app

### Issue 5: Product ID Mismatch
**Symptom**: Product exists but with different ID
**Fix**: Check exact product ID in RevenueCat vs code

### Issue 6: Platform Mismatch
**Symptom**: Product exists but for wrong platform
**Fix**: Ensure product is configured for iOS (or your platform)

---

## 🔄 Force Refresh

If everything looks correct but still not working:

1. **In RevenueCat Dashboard**:
   - Go to Products → `gofitai_premium_yearly1`
   - Click "Refresh" or "Sync" button
   - Wait 2-3 minutes

2. **In your app**:
   - Force quit completely
   - Clear app cache (if possible)
   - Restart app
   - Check console logs

---

## 📊 Debug Logs to Check

When you open the app, look for these logs:

```
[RevenueCat] 📦 Offerings response: { current: true, allCount: 1 }
[RevenueCat] ✅ Using current offering with X packages
[RevenueCat] Package types: [{ identifier: '...', type: 'ANNUAL', productId: 'gofitai_premium_yearly1' }]
```

**If you see**:
- `allCount: 0` → No offerings configured
- `availablePackages.length: 0` → No packages in offering
- Package type not showing → Package not linked correctly

---

## ✅ Quick Verification Script

Run this in your app console (or add temporary logging):

```javascript
// Check what RevenueCat sees
const offerings = await RevenueCatService.getOfferings();
console.log('Offerings:', offerings);
console.log('Packages:', offerings[0]?.availablePackages);
console.log('Yearly package:', offerings[0]?.availablePackages.find(p => 
  p.packageType === 'ANNUAL' || p.identifier.includes('yearly')
));
```

This will show you exactly what RevenueCat is returning.

---

## 🆘 Still Not Working?

If you've verified all the above and it's still not working:

1. **Check RevenueCat Dashboard** → Logs/Events for any errors
2. **Verify API key** is correct in your `.env` file
3. **Check RevenueCat status page** for any service issues
4. **Contact RevenueCat support** with:
   - Product ID: `gofitai_premium_yearly1`
   - Your app bundle ID
   - Screenshots of RevenueCat dashboard configuration

---

## 📝 Summary

The most common issue when products exist in RevenueCat is:
- **Package not created** or **not linked to product**
- **Package not added to offering**
- **Sync delay** (wait 10-15 minutes)

Double-check Steps 2 and 3 - these are the most common culprits!



