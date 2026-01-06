# Free Trial Eligibility - One Time Only

## Apple's Free Trial Rules

### ✅ **One Free Trial Per User (Apple ID)**

Apple's App Store has a strict rule:
- **Each user (Apple ID) can only use the free trial ONCE per subscription product**
- If a user has already used the free trial for `gofitai_premium_monthly1`, they **cannot get it again**
- This is enforced by Apple at the App Store level, not by your app

### How It Works

#### First Time Subscribing
```
User subscribes → Apple checks: "Has this Apple ID used free trial before?"
  ↓
No → User gets 7-day free trial ✅
  ↓
Trial ends → User pays (or cancels)
```

#### Second Time Subscribing (After Cancellation/Expiration)
```
User subscribes again → Apple checks: "Has this Apple ID used free trial before?"
  ↓
Yes → User does NOT get free trial ❌
  ↓
User is charged immediately (first month price)
```

---

## How Apple Determines Eligibility

### Apple's Check Process

1. **Apple tracks free trial usage per Apple ID**
2. **Per subscription product** (e.g., `gofitai_premium_monthly1`)
3. **Once used, cannot be used again** for the same product
4. **Even if user:**
   - Cancels subscription
   - Lets subscription expire
   - Deletes and reinstalls app
   - Uses different device

### What Apple Checks

- **Apple ID** (not your app's user ID)
- **Subscription product ID** (e.g., `gofitai_premium_monthly1`)
- **Previous trial usage** in App Store Connect records

---

## In Your App

### Current Implementation

**Location:** `src/components/subscription/PaywallScreen.tsx`

The app displays the free trial information from RevenueCat:

```typescript
// Free trial is shown if product has introPrice
{hasTrial && pkg.packageType === 'MONTHLY' && (
  <View style={styles.trialWrapper}>
    <Text style={styles.trialText}>7-day free trial, then {pkg.product.priceString}/month</Text>
  </View>
)}
```

**Important:** The app doesn't control whether the user gets the trial - **Apple does**.

### What Happens

1. **App shows:** "7-day free trial" (if product has `introPrice`)
2. **User clicks subscribe**
3. **Apple checks eligibility:**
   - If eligible → User gets free trial ✅
   - If not eligible → User is charged immediately ❌
4. **Apple's payment sheet shows the actual price:**
   - Eligible: "$0.00 for 7 days, then $9.99/month"
   - Not eligible: "$9.99/month" (no trial)

---

## User Scenarios

### Scenario 1: First Time User ✅

```
User subscribes for first time
  ↓
Apple: "No previous trial usage"
  ↓
User gets 7-day free trial ✅
  ↓
Trial ends → User pays $9.99/month
```

### Scenario 2: User Cancels, Then Resubscribes ❌

```
User subscribes (first time) → Gets 7-day free trial ✅
  ↓
User cancels during trial
  ↓
Trial ends → Subscription expires
  ↓
User resubscribes later
  ↓
Apple: "This Apple ID already used free trial"
  ↓
User does NOT get free trial ❌
  ↓
User is charged $9.99 immediately
```

### Scenario 3: User Lets Trial Expire, Then Resubscribes ❌

```
User subscribes (first time) → Gets 7-day free trial ✅
  ↓
Trial ends → Payment fails (no payment method)
  ↓
Subscription expires
  ↓
User resubscribes later
  ↓
Apple: "This Apple ID already used free trial"
  ↓
User does NOT get free trial ❌
  ↓
User is charged $9.99 immediately
```

### Scenario 4: User Deletes App, Reinstalls, Resubscribes ❌

```
User subscribes (first time) → Gets 7-day free trial ✅
  ↓
User deletes app
  ↓
User reinstalls app later
  ↓
User resubscribes
  ↓
Apple: "This Apple ID already used free trial"
  ↓
User does NOT get free trial ❌
  ↓
User is charged $9.99 immediately
```

---

## How to Verify in Your App

### Check Product Data

The `introPrice` field in the product indicates if a free trial is configured, but **doesn't guarantee the user will get it**.

```typescript
// Product has introPrice configured
if (product.introPrice) {
  // This means trial is AVAILABLE, but user might not be eligible
  // Apple will determine eligibility when user tries to purchase
}
```

### What You See in RevenueCat/App Store Connect

- **Product configuration:** Shows free trial is available
- **User eligibility:** Determined by Apple at purchase time
- **You cannot check eligibility in advance** - only Apple knows

---

## Summary

### ✅ **Users CANNOT repeatedly get free trials**

**Why:**
1. **Apple enforces this** at the App Store level
2. **One free trial per Apple ID per product** (lifetime rule)
3. **Even if user cancels/expires/resubscribes** - no second trial
4. **Your app doesn't need to handle this** - Apple does it automatically

### What Happens When User Resubscribes

1. **User goes to paywall** (after trial expires)
2. **User clicks subscribe**
3. **Apple checks eligibility:**
   - First time → Free trial ✅
   - Already used → No trial, charged immediately ❌
4. **Apple's payment sheet shows correct price:**
   - Eligible: "$0.00 for 7 days, then $9.99/month"
   - Not eligible: "$9.99/month" (no trial mentioned)

### Your App's Role

- **Show free trial info** if product has `introPrice`
- **Let Apple handle eligibility** - they enforce the one-time rule
- **No special logic needed** - Apple prevents abuse automatically

---

## Key Points

✅ **One free trial per Apple ID** (enforced by Apple)
✅ **Cannot be bypassed** by deleting app, using different device, etc.
✅ **Your app doesn't need to check eligibility** - Apple does it
✅ **Payment sheet shows correct price** based on eligibility
✅ **Users cannot abuse the system** - Apple prevents it

**Bottom line:** Users can only get the 7-day free trial once. After that, they must pay immediately when resubscribing.



