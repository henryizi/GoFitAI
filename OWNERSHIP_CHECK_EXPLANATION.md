# Who Checks If User Owns Lifetime Product?

## The Check Happens Here

The ownership check is performed by **your app's code** in `RevenueCatService.purchasePackage()` method, specifically at **lines 1577-1608** in `src/services/subscription/RevenueCatService.ts`.

## How It Works

### Step 1: Get Customer Info from RevenueCat
```typescript
const currentCustomerInfo = await Purchases.getCustomerInfo();
```

**Who does this?**
- **RevenueCat SDK** calls Apple's StoreKit/App Store Connect
- Apple returns the user's purchase history
- RevenueCat formats it as `CustomerInfo` object

### Step 2: Check Purchase History
```typescript
// Check in non-subscription transactions (for lifetime purchases)
const hasProductInTransactions = currentCustomerInfo.nonSubscriptionTransactions?.some(
  (transaction: any) => transaction.productIdentifier === productId
);

// Check in active entitlements
const hasProductInEntitlements = currentCustomerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.premium]?.productIdentifier === productId;
```

**Who does this?**
- **Your app code** checks the data returned by RevenueCat
- Looks in two places:
  1. `nonSubscriptionTransactions` - One-time purchases (like lifetime)
  2. `entitlements.active` - Active entitlements linked to the product

### Step 3: Return Early If Owned
```typescript
if (hasProduct) {
  return {
    success: false,
    error: 'You already own this product...'
  };
}
```

**Who does this?**
- **Your app code** prevents the purchase attempt
- Returns an error instead of calling `purchasePackage()`

## The Flow

```
User clicks "Buy Lifetime"
         ↓
Your App: Check if already owned
         ↓
RevenueCat SDK: getCustomerInfo()
         ↓
Apple StoreKit: Returns purchase history
         ↓
Your App: Checks nonSubscriptionTransactions
         ↓
Found: Return error (no payment sheet)
Not Found: Proceed with purchase
```

## Why This Check Exists

This is a **custom check I added** to:
1. **Prevent unnecessary API calls** - Don't call Apple if user already owns it
2. **Better user experience** - Show clear error message instead of silent failure
3. **Save time** - Don't wait for Apple to reject the purchase

## What If We Remove This Check?

If we remove this check:
- The code would still call `Purchases.purchasePackage()`
- Apple would still reject it (user already owns it)
- But the error might be less clear
- The payment sheet still wouldn't appear (Apple prevents it)

## The Data Source

The ownership information comes from:
- **Apple's StoreKit** - The source of truth
- **RevenueCat** - Fetches it from Apple and caches it
- **Your App** - Checks the data and makes decision

## Summary

**Who checks?**
- ✅ **Your app code** (the check logic)
- ✅ **RevenueCat SDK** (fetches data from Apple)
- ✅ **Apple StoreKit** (the actual purchase records)

**Where?**
- File: `src/services/subscription/RevenueCatService.ts`
- Method: `purchasePackage()`
- Lines: 1577-1608

**Why?**
- To prevent attempting to purchase something already owned
- To provide better error messages
- To avoid unnecessary API calls



