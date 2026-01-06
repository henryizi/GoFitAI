# StoreKit Products Explanation

## What is StoreKit?

**StoreKit** is Apple's native framework for handling in-app purchases and subscriptions on iOS. It's the underlying system that Apple uses to process payments.

## What are StoreKit Products?

**StoreKit Products** are the actual products you configure in **App Store Connect**. These are the products that Apple recognizes and can process payments for.

### In Your App:

Your StoreKit products are:
- `gofitai_premium_monthly1` - Monthly subscription
- `gofitai_premium_yearly1` - Yearly subscription  
- `gofitai_premium_lifetime1` - Lifetime (one-time purchase)

These are defined in:
- **App Store Connect** (where Apple stores them)
- **RevenueCat Dashboard** (where you configure which ones to use)
- **Your code** (where you reference them)

## How StoreKit Products Work with RevenueCat

### The Flow:

```
App Store Connect (StoreKit Products)
         ↓
RevenueCat Dashboard (Packages)
         ↓
Your App (RevenueCat SDK)
         ↓
Apple Payment Sheet
```

### 1. **StoreKit Products** (App Store Connect)
- These are the actual products Apple recognizes
- Configured in App Store Connect
- Have prices, descriptions, etc.
- Examples: `gofitai_premium_monthly1`, `gofitai_premium_lifetime1`

### 2. **RevenueCat Packages** (RevenueCat Dashboard)
- These are wrappers around StoreKit products
- You create packages in RevenueCat Dashboard
- Each package links to a StoreKit product
- Examples: `$rc_monthly`, `$rc_lifetime`, `$rc_annual`

### 3. **Your App Code**
- Uses RevenueCat SDK to fetch packages
- RevenueCat fetches the underlying StoreKit products
- When user purchases, RevenueCat calls StoreKit to show payment sheet

## Why the Log Says "StoreKit products"

When you see:
```
💳 RevenueCat: StoreKit products: gofitai_premium_monthly1, gofitai_premium_lifetime1
```

This means:
- RevenueCat is telling you which **StoreKit products** it's configured to use
- These are the products that will trigger Apple's payment system
- These products must exist in App Store Connect and be approved

## Key Points

1. **StoreKit Products** = The actual products in App Store Connect
2. **RevenueCat Packages** = Wrappers that link to StoreKit products
3. **Your App** = Uses RevenueCat packages, which use StoreKit products underneath

## Example Flow for Lifetime Purchase

1. User clicks "Lifetime Plan" in your app
2. Your app calls `Purchases.purchasePackage($rc_lifetime)`
3. RevenueCat looks up `$rc_lifetime` package
4. RevenueCat finds it's linked to `gofitai_premium_lifetime1` (StoreKit product)
5. RevenueCat calls Apple's StoreKit to show payment sheet
6. User confirms payment in Apple's payment sheet
7. StoreKit processes the payment
8. RevenueCat receives confirmation and updates entitlements

## Why This Matters

- If a StoreKit product doesn't exist in App Store Connect → Payment won't work
- If a StoreKit product isn't linked in RevenueCat → Package won't work
- If a StoreKit product isn't approved → Can't be purchased
- If you already own a StoreKit product → Payment sheet won't appear (you already own it)

## In Your Case

The log shows RevenueCat is configured to use:
- `gofitai_premium_monthly1` (monthly subscription)
- `gofitai_premium_lifetime1` (lifetime purchase)

These are the **StoreKit products** that Apple will process payments for when users make purchases.



