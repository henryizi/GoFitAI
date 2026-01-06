# Lifetime User Routing - How It Works

## Normal Flow (What Should Happen)

When a user has **lifetime purchase**:

1. **User logs in** → RevenueCat identifies user
2. **RevenueCat checks entitlements** → Finds lifetime purchase in `entitlements.active`
3. **`isPremiumActive()` returns `true`** → User is marked as premium
4. **Routing logic** → User goes directly to dashboard (skips paywall)

## Current Code Flow

### Step 1: Premium Status Check
```typescript
// In SubscriptionContext.tsx
const premium = await RevenueCatService.isPremiumActive();
```

### Step 2: isPremiumActive() Logic
```typescript
// In RevenueCatService.ts (lines 1213-1261)
const customerInfo = await Purchases.getCustomerInfo();
const premiumEntitlement = customerInfo.entitlements.active[premiumEntitlementId];

if (premiumEntitlement) {
  return true; // ✅ User has premium (including lifetime)
}
```

**For lifetime purchases:**
- RevenueCat automatically grants the `premium` entitlement
- The entitlement stays in `entitlements.active` forever
- `isPremiumActive()` should return `true`

### Step 3: Routing Decision
```typescript
// In app/index.tsx (line 242)
if (session && profile && isPremium && !forceOnboarding && !forcePaywallTesting) {
  // ✅ Skip paywall, go to dashboard
  return <Redirect href="/(main)/dashboard" />;
}
```

## Why Lifetime Users Might See Paywall

### Issue 1: `forcePaywallTesting = true` (Currently Enabled)
```typescript
// Line 236 in app/index.tsx
const forcePaywallTesting = true; // ENABLED FOR TESTING
```

**Problem:** This forces ALL users (including lifetime) to see the paywall.

**Solution:** Set to `false` for production.

### Issue 2: RevenueCat Not Synced Yet
If RevenueCat hasn't finished checking entitlements:
- `subscriptionLoading = true`
- `isPremium` might be `false` temporarily
- User might see paywall briefly

**Solution:** The code already waits for `subscriptionLoading` to complete (lines 269-280).

### Issue 3: RevenueCat Configuration
If lifetime product is not properly linked to the `premium` entitlement in RevenueCat:
- Purchase exists in `nonSubscriptionTransactions`
- But entitlement is not granted
- `isPremiumActive()` returns `false`

**Solution:** Check RevenueCat Dashboard:
1. Product `gofitai_premium_lifetime1` exists
2. Product is linked to `premium` entitlement
3. Entitlement is active

## The Ownership Check (Different Issue)

The ownership check in `purchasePackage()` (lines 1577-1608) is **separate** from routing:

- **Purpose:** Prevent attempting to purchase something already owned
- **When it runs:** Only when user clicks "Buy Lifetime" button
- **Does NOT affect:** Normal routing after login

## Summary

**Normal flow for lifetime users:**
1. ✅ Login → RevenueCat identifies user
2. ✅ `isPremiumActive()` checks `entitlements.active`
3. ✅ Finds lifetime entitlement → Returns `true`
4. ✅ Routing skips paywall → Goes to dashboard

**Current issue:**
- `forcePaywallTesting = true` is overriding the normal flow
- This is for testing only
- Should be `false` in production

**To fix:**
1. Set `forcePaywallTesting = false` in `app/index.tsx`
2. Ensure RevenueCat is properly configured
3. Lifetime users will never see paywall again



