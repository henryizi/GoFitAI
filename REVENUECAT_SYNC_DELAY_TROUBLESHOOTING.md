# RevenueCat Sync Delay Troubleshooting

## Issue
Everything is configured correctly in RevenueCat Dashboard:
- ✅ Product `gofitai_premium_yearly1` exists
- ✅ Package `$rc_annual` exists and is linked to `gofitai_premium_yearly1`
- ✅ Package is in "default" offering
- ✅ Lifetime price updated to $149.99 in App Store Connect

But the app still can't find the yearly product or see the updated lifetime price.

## Root Cause: RevenueCat Server Sync Delay

**RevenueCat servers sync with App Store Connect every 5-10 minutes.**

Even if everything is configured correctly in the Dashboard, there's a delay before changes appear in your app.

## Solution Steps

### Step 1: Force Sync in RevenueCat Dashboard

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Navigate to**: Products → `gofitai_premium_yearly1`
3. **Look for**: "Refresh" or "Sync" button
4. **Click it** to force RevenueCat to sync with App Store Connect
5. **Wait 5-10 minutes** for sync to complete

### Step 2: Force Sync for Lifetime Product

1. **Go to**: Products → `gofitai_premium_lifetime1`
2. **Click**: "Refresh" or "Sync" button
3. **Wait 5-10 minutes** for sync to complete

### Step 3: Verify Sync Status

In RevenueCat Dashboard, check:
- **Last sync timestamp** - Should be recent (within last 10 minutes)
- **Status indicators** - Should show "Active" or "Synced"
- **No error messages** - If there are errors, fix them first

### Step 4: Test in App

1. **Wait 10-15 minutes** after clicking sync in Dashboard
2. **Completely close your app** (force quit)
3. **Reopen the app**
4. **Open paywall** and click refresh button
5. **Check console logs** - Should show products found

## What the Logs Will Show

### If Sync is Complete:
```
[RevenueCat] ✅ Found $rc_annual in all packages:
[RevenueCat]   Product ID: gofitai_premium_yearly1
[RevenueCat]   ✅ $rc_annual is correctly linked to gofitai_premium_yearly1
```

### If Still Syncing:
```
[RevenueCat] ❌ gofitai_premium_yearly1: NOT FOUND
[RevenueCat]   ⚠️ Product exists in RevenueCat Dashboard but not in any offering!
```

## Alternative: Use Native StoreKit Module

If RevenueCat sync is taking too long, the native StoreKit module will fetch directly from App Store Connect, bypassing RevenueCat's cache.

**To use it:**
1. Rebuild the iOS app (so the native module compiles)
2. The app will automatically use StoreKit 2 for direct fetches
3. This bypasses RevenueCat's sync delay

## Timeline

- **0-5 minutes**: RevenueCat servers are syncing (products may not appear)
- **5-10 minutes**: Sync should complete (products should appear)
- **10-15 minutes**: If still not working, check Dashboard for errors

## Still Not Working?

If after 15 minutes products still don't appear:

1. **Check RevenueCat Dashboard**:
   - Products tab → Verify products show "Active" status
   - Packages tab → Verify `$rc_annual` is linked correctly
   - Offerings tab → Verify package is in offering

2. **Check App Store Connect**:
   - Verify products are "Approved" or "Ready to Submit"
   - Verify prices are correct
   - Verify products are in the same subscription group

3. **Check Console Logs**:
   - Look for `[RevenueCat] 🔍 EXTENSIVE DEBUG` section
   - See what products RevenueCat actually found
   - Check if `$rc_annual` exists and what it's linked to

4. **Contact RevenueCat Support**:
   - If everything is configured correctly but still not working
   - They can check server-side sync status



