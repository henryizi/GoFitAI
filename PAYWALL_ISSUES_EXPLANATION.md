# Paywall Issues - Root Cause Analysis

## Problem 1: Lifetime Plan Not Triggering Payment Prompt

### What Happened
When users clicked the lifetime plan, the payment dialog from Apple did not appear.

### Root Cause
The code was trying to apply promotional offer logic to **all package types**, including lifetime products. However:

1. **Promotional offers only work for subscriptions** (monthly, annual)
2. **Lifetime products are "non-consumable" products**, not subscriptions
3. When the code tried to process promotional offers for lifetime products, it was looking for discounts that don't exist for one-time purchases
4. This caused the purchase flow to fail silently or get stuck, preventing the payment dialog from appearing

### Technical Details
- Lifetime products (`LIFETIME` package type) are one-time purchases, not recurring subscriptions
- Apple's promotional offer system is designed only for subscription products
- The code was checking for discounts even on lifetime products, which don't support discounts
- When no discounts were found, it fell back to regular purchase, but the flow was already disrupted

### Solution
Added a check to **skip promotional offer logic entirely for lifetime products**:
```typescript
const isLifetime = packageType === 'LIFETIME';
if (promotionalOfferCode && !isLifetime) {
  // Apply promotional offer (only for subscriptions)
} else {
  // Regular purchase (for lifetime or when no promo code)
}
```

---

## Problem 2: Discount Not Applied to Final Payment Amount

### What Happened
When users applied a discount code (e.g., 20% off), the discount was shown in the UI but **not applied to the actual payment** at checkout.

### Root Cause
The code was trying to access discount information from the **wrong source**:

1. **Wrong approach**: The code was trying to get discounts directly from `packageToPurchase.product.discounts`
2. **Problem**: RevenueCat packages don't always have discount information populated in this property
3. **Result**: The code couldn't find the matching discount, so it fell back to regular purchase without the discount

### Technical Details
- RevenueCat packages are wrapper objects around StoreKit products
- Discount/promotional offer information needs to be fetched using RevenueCat's API
- The original code assumed discounts would be available directly on the product object
- When discounts weren't found, it silently fell back to regular purchase, charging the full price

### Solution
Changed the approach to **explicitly fetch products with discounts**:
```typescript
// Get products with discount information from RevenueCat
const products = await Purchases.getProducts([productId]);
const storeProduct = products[0];
const discounts = storeProduct.discounts || [];

// Find matching discount
const matchingDiscount = discounts.find(d => d.identifier === promotionalOfferCode);

// Apply promotional offer
const promotionalOffer = await Purchases.getPromotionalOffer(storeProduct, matchingDiscount);
await Purchases.purchasePackage(packageToPurchase, promotionalOffer);
```

---

## Why These Issues Occurred

### Design Flaw 1: Assumption About Product Types
- **Assumption**: All packages can use promotional offers
- **Reality**: Only subscription packages support promotional offers
- **Fix**: Added type checking to distinguish between subscriptions and one-time purchases

### Design Flaw 2: Incorrect Data Access Pattern
- **Assumption**: Discount information is always available on the package product object
- **Reality**: Discount information needs to be fetched explicitly using RevenueCat's API
- **Fix**: Changed to use `Purchases.getProducts()` to fetch fresh product data with discounts

### Missing Error Handling
- The code had fallback logic, but it was too silent
- When discounts weren't found, it would fall back to regular purchase without clear logging
- This made it difficult to diagnose why discounts weren't working

---

## Lessons Learned

1. **Understand platform limitations**: Not all product types support all features (promotional offers only work for subscriptions)

2. **Use proper APIs**: Don't assume data is available on objects; use the SDK's methods to fetch what you need

3. **Add explicit type checking**: Check product types before applying type-specific logic

4. **Improve logging**: Better logging helps diagnose issues when things go wrong

5. **Test edge cases**: Lifetime products and promotional offers are edge cases that need specific handling



