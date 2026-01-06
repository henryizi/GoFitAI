# ✅ Next Steps After Creating Promotional Offers

## Step 1: Wait for App Store Connect to Process (5-15 minutes)

Promotional offers need to be processed by Apple before they become active:
- **Status**: Check that all offers show as **"Ready to Submit"** or **"Active"**
- **Wait time**: Usually 5-15 minutes, but can take up to 24 hours
- **Location**: App Store Connect → Subscriptions → Your Subscription → Promotional Offers

---

## Step 2: Verify in RevenueCat Dashboard (Optional but Recommended)

RevenueCat should automatically sync promotional offers from App Store Connect:

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Select your project** (GoFitAI)
3. **Navigate to**: Products → `gofitai_premium_monthly1`
4. **Check**: Look for "Promotional Offers" section
5. **Verify**: You should see your 5 offers (LIMITED10, LIMITED15, LIMITED20, LIMITED25, LIMITED30)

**Note**: If offers don't appear immediately:
- Wait 10-15 minutes for sync
- Refresh the page
- Make sure your App Store Connect credentials are properly configured in RevenueCat

---

## Step 3: Test the Implementation

### A. Test with Sandbox Account

1. **Create/Use Sandbox Test Account**:
   - App Store Connect → Users and Access → Sandbox Testers
   - Create a new test account or use an existing one

2. **Sign Out of Regular Apple ID**:
   - On your test device, sign out of your regular Apple ID
   - Settings → [Your Name] → Media & Purchases → Sign Out

3. **Test the Flow**:
   - Open your app
   - Navigate to the paywall
   - **Click the X button** (close button) to trigger the limited offer screen
   - You should see: "One Time Offer" with a random discount (10%, 15%, 20%, 25%, or 30%)
   - Click **"Claim your limited offer now!"**
   - Verify the paywall shows the **discounted price** (e.g., "$7.99" for 20% off)
   - Complete the purchase with your sandbox account
   - **Verify**: The purchase should show the discounted price in the Apple payment dialog

### B. Verify Discount is Applied

When testing, check:
- ✅ Limited offer page shows correct discount percentage
- ✅ Paywall shows discounted price (e.g., "$7.99" instead of "$9.99")
- ✅ "Limited Offer" badge appears on the monthly plan card
- ✅ CTA button shows discounted price
- ✅ Apple's purchase dialog shows the discounted price
- ✅ After purchase, subscription is active with the discount applied

---

## Step 4: Verify Code Integration

Your code should already be set up, but verify these files:

### Check `limited-offer.tsx`:
```typescript
const DISCOUNT_OFFER_MAP: Record<number, string> = {
  10: 'LIMITED10',
  15: 'LIMITED15',
  20: 'LIMITED20',
  25: 'LIMITED25',
  30: 'LIMITED30',
};
```

### Check `app/(paywall)/index.tsx`:
- Should receive `promoCode` and `discount` from URL params
- Should pass them to `PaywallScreen`

### Check `PaywallScreen.tsx`:
- Should display discounted price when `promotionalOfferCode` is provided
- Should pass the code to `RevenueCatService.purchasePackage()`

### Check `RevenueCatService.ts`:
- `purchasePackage()` should accept `promotionalOfferCode` parameter
- Should use `Purchases.getPromotionalOffer()` to get the offer
- Should apply it when purchasing

---

## Step 5: Monitor and Debug

### Check Console Logs

When testing, look for these log messages:

```
[Paywall] Promotional offer code received: LIMITED20
[Paywall] Discount percentage: 20
[RevenueCat] Applying promotional offer: LIMITED20
[RevenueCat] Purchase successful: { promotionalOfferCode: 'LIMITED20', ... }
```

### Common Issues and Solutions

#### Issue: "Promotional offer code not found"
- **Solution**: Wait a few more minutes for App Store Connect to fully process
- **Check**: Verify the offer code matches exactly (case-sensitive)

#### Issue: "No discounts available for this product"
- **Solution**: Make sure the promotional offers are **active** in App Store Connect
- **Check**: RevenueCat dashboard to see if offers synced

#### Issue: Discount not showing in paywall
- **Solution**: Check that URL parameters are being passed correctly
- **Debug**: Add `console.log` to see if `promotionalOfferCode` is received

#### Issue: Purchase shows full price
- **Solution**: Verify the promotional offer is being applied in `RevenueCatService.purchasePackage()`
- **Check**: Make sure `getPromotionalOffer()` is finding the matching discount

---

## Step 6: Production Deployment

Once testing is successful:

1. **Submit for Review** (if needed):
   - If your app is already in review, promotional offers should work automatically
   - No separate submission needed for promotional offers

2. **Monitor Analytics**:
   - Track how many users click the X button
   - Track conversion rates with vs. without discount
   - Monitor which discount percentages are most effective

3. **Set Expiration Dates** (Optional):
   - You can set end dates for promotional offers in App Store Connect
   - Useful if you want to run time-limited campaigns

---

## ✅ Checklist

- [ ] All 5 promotional offers created in App Store Connect
- [ ] Offers show as "Active" or "Ready to Submit"
- [ ] Waited 5-15 minutes for processing
- [ ] Verified offers in RevenueCat dashboard (optional)
- [ ] Tested with sandbox account
- [ ] Verified discount shows correctly in paywall
- [ ] Verified discount applies in purchase flow
- [ ] Checked console logs for any errors
- [ ] Ready for production use

---

## 🎉 You're Done!

Once you've completed testing, the promotional offers are ready to use. Users who click the X button on the paywall will see a random discount and can claim it for their first month subscription.





