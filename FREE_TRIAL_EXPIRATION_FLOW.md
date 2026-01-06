# 7-Day Free Trial Expiration Flow (Paid Users Only)

## Overview

**Important:** This app is **paid-only** - there is no free tier. Users must subscribe to use the app.

When a user subscribes to the monthly plan, they get a **7-day free trial**. If they don't pay after the trial ends, here's what happens:

---

## Timeline

### Day 0: User Subscribes
- User clicks "Subscribe" on monthly plan
- Apple starts 7-day free trial
- User gets **immediate premium access** ✅
- `isPremium = true`
- User can use all app features

### Day 1-7: Free Trial Period
- User has full premium access
- No charge yet
- Apple will charge automatically on Day 7 (if payment method is valid)

### Day 7: Trial Ends - Two Scenarios

#### Scenario A: Payment Successful ✅
- Apple charges user's payment method
- Subscription continues
- User keeps premium access
- Next charge: Day 37 (30 days after trial end)

#### Scenario B: Payment Failed / User Cancelled ❌
- Apple cannot charge (no payment method, card declined, or user cancelled)
- Subscription **expires**
- User **loses premium access**
- `isPremium = false`

---

## What Happens When Trial Expires (No Payment)

### 1. RevenueCat Detection

**Location:** `src/services/subscription/RevenueCatService.ts` (line 1213-1261)

```typescript
const customerInfo = await Purchases.getCustomerInfo();
const premiumEntitlement = customerInfo.entitlements.active[premiumEntitlementId];

if (premiumEntitlement) {
  return true; // User has premium
}

return false; // User does NOT have premium
```

**Result:** 
- `isPremiumActive()` returns `false`
- `isPremium` state becomes `false`

### 2. Grace Period (Optional)

**Location:** `src/services/subscription/RevenueCatService.ts` (line 1222-1240)

Apple provides a **16-day grace period** for billing issues:

```typescript
// RevenueCat automatically includes entitlements in 'active' during grace period
if (premiumEntitlement.periodType === 'GRACE_PERIOD') {
  console.log('[RevenueCat] ✅ User has active entitlement in App Store billing grace period (16 days)');
  return true; // User still has access during grace period
}
```

**What this means:**
- If payment fails due to billing issue (not cancellation), user gets **16 more days** of access
- Apple will retry payment during this period
- If payment succeeds → subscription continues
- If payment still fails after 16 days → subscription expires

### 3. App Behavior After Expiration

#### A. Routing Logic (App Entry Point)

**Location:** `app/index.tsx` (line 264-319)

```typescript
// If user is not premium, redirect to paywall
if (session && profile && profile.onboarding_completed && !isPremium && !bypassPaywall) {
  // Wait for subscription loading...
  if (isPremium && !forcePaywallTesting) {
    // User is premium → go to dashboard
    return <Redirect href="/(main)/dashboard" />;
  }
  
  // User is NOT premium - redirect to paywall (NO FREE TIER)
  console.log('🔍 User completed onboarding but not premium, redirecting to paywall');
  return <Redirect href="/(paywall)" />;
}
```

**Result:**
- User is **immediately redirected to paywall** 🚫
- **No free tier access** - app is paid-only

#### B. Main Layout Check

**Location:** `app/(main)/_layout.tsx` (line 69-73)

```typescript
// If user is not premium, redirect to paywall (paid users only)
if (!isPremium && !bypassPaywall) {
  console.log('🎯 Main Layout: Redirecting to paywall - user not premium (paid users only)');
  return <Redirect href="/(paywall)" />;
}
```

**Result:**
- If user tries to access main app without premium → **Immediately redirected to paywall** 🚫
- **No access to any features** - app is paid-only

#### C. Feature Restrictions

**Location:** `src/contexts/SubscriptionContext.tsx` (line 252-281)

```typescript
const useRecipe = useCallback((): boolean => {
  // Only premium users can use recipes
  if (isPremium || bypassPaywall) return true;
  return false; // Non-premium users cannot use features
}, [isPremium, bypassPaywall]);

const useChatMessage = useCallback((): boolean => {
  // Only premium users can use chat
  if (isPremium || bypassPaywall) return true;
  return false; // Non-premium users cannot use features
}, [isPremium, bypassPaywall]);
```

**Result:**
- **All features are locked** for non-premium users
- Recipes: ❌ Not available
- AI Chat: ❌ Not available
- All premium features: ❌ Not available

---

## Complete Flow Diagram

```
User subscribes (Day 0)
  ↓
7-day free trial starts
  ↓
User has premium access ✅
  ↓
Day 7: Trial ends
  ↓
┌─────────────────────┬─────────────────────┐
│ Payment Successful  │ Payment Failed      │
│                     │ OR User Cancelled   │
├─────────────────────┼─────────────────────┤
│                     │                     │
│ Subscription        │ Subscription        │
│ continues           │ expires             │
│                     │                     │
│ isPremium = true ✅ │ isPremium = false ❌│
│                     │                     │
│ Full access ✅      │ ┌─────────────────┐ │
│                     │ │ Grace Period?   │ │
│                     │ │ (16 days)       │ │
│                     │ └─────────────────┘ │
│                     │         │           │
│                     │    ┌────┴────┐      │
│                     │    │         │      │
│                     │  Yes        No     │
│                     │    │         │      │
│                     │    │         ↓      │
│                     │    │   Expired ❌   │
│                     │    │         │      │
│                     │    │         ↓      │
│                     │    │   Redirect    │
│                     │    │   to Paywall  │
│                     │    │   🚫          │
│                     │    │         │      │
│                     │    │         ↓      │
│                     │    │   NO ACCESS   │
│                     │    │   (Paid Only) │
│                     │    └───────────────┘ │
└─────────────────────┴─────────────────────┘
```

---

## User Experience

### If User Cancelled Before Trial End

1. **During Trial (Day 1-7):**
   - User still has premium access ✅
   - Can use all features
   - Trial ends on Day 7
   - No charge (because cancelled)

2. **After Trial Ends (Day 7+):**
   - `isPremium = false` ❌
   - **Immediately redirected to paywall** 🚫
   - **Cannot access any features**
   - **Must subscribe to continue using app**

### If Payment Failed (Billing Issue)

1. **During Trial (Day 1-7):**
   - User has premium access ✅

2. **Trial Ends, Payment Fails (Day 7):**
   - **16-day grace period starts** 🛡️
   - User still has premium access ✅
   - Apple retries payment

3. **During Grace Period (Day 7-23):**
   - If payment succeeds → Subscription continues ✅
   - If payment still fails → Grace period ends

4. **After Grace Period (Day 23+):**
   - Subscription expires ❌
   - `isPremium = false`
   - **Immediately redirected to paywall** 🚫
   - **Cannot access any features**
   - **Must subscribe to continue using app**

---

## Summary

**If user doesn't pay after 7-day free trial:**

1. ✅ **Subscription expires** (unless in grace period)
2. ✅ **`isPremium` becomes `false`**
3. ✅ **User loses premium access**
4. ✅ **App immediately redirects to paywall** 🚫
5. ✅ **User cannot access any features** (paid-only app)
6. ✅ **User must subscribe to continue using app**

**Grace Period:**
- 16 days if payment failed (billing issue)
- User keeps access during grace period
- Apple retries payment
- If still fails → expires after grace period → redirected to paywall

**Key Points:**
- **No free tier** - app is paid-only
- **No feature access** without subscription
- **Immediate redirect to paywall** when subscription expires
- **User must resubscribe** to continue using app

**User can resubscribe:**
- At any time from paywall
- Will get new 7-day free trial (if eligible)
- Or pay immediately (if not eligible for trial)
