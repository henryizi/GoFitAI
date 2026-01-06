# Promotional Offer "User is Ineligible" - Fix Guide

## What's Happening

The logs show:
1. ✅ Discount code `LIMITED10` is found correctly
2. ✅ Discount details retrieved: `{"identifier": "LIMITED10", "price": 8.99}`
3. ❌ Apple returns: "The User is ineligible for that action"
4. ⚠️ Code falls back to regular purchase (user gets free trial instead)

## Why "User is Ineligible"

Apple's promotional offers have **eligibility criteria**. Common reasons:

### 1. **Already Used This Offer** (Most Common)
- You've already used the `LIMITED10` promotional offer before
- Promotional offers can only be used once per Apple ID
- Even if you cancel and resubscribe, you can't use the same offer again

### 2. **Already Subscribed**
- You're currently subscribed to the monthly plan
- Promotional offers are typically for **new subscribers only**
- If you're already a subscriber, you're not eligible

### 3. **Test Account Restrictions**
- Sandbox/TestFlight accounts may have restrictions
- Some promotional offers don't work in test environments
- Need to use a fresh test account that hasn't subscribed before

### 4. **Eligibility Rules in App Store Connect**
- The promotional offer may have specific eligibility rules set
- Examples: "New customers only", "Lapsed subscribers only", etc.
- Check the offer settings in App Store Connect

## How to Fix

### Option 1: Use a Fresh Test Account (Recommended for Testing)

1. **Create a new Apple ID** (sandbox test account)
2. **Sign out** of current account in Settings → App Store
3. **Sign in** with the new test account
4. **Try purchasing** - should be eligible for promotional offer

### Option 2: Check Promotional Offer Eligibility Settings

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **My Apps** → **GoFitAI** → **Subscriptions**
3. **Click** `gofitai_premium_monthly1`
4. **Promotional Offers** → **Click** `LIMITED10`
5. **Check "Customer Eligibility"**:
   - If set to "All eligible customers" → Should work for new users
   - If set to specific rules → May exclude your test account
6. **Update eligibility** if needed and save

### Option 3: Use a Different Discount Code

If you've already used `LIMITED10`, try:
- `LIMITED15` (15% off)
- `LIMITED20` (20% off)
- `LIMITED25` (25% off)
- `LIMITED30` (30% off)

Each code can only be used once per Apple ID.

### Option 4: Cancel Current Subscription First

If you're already subscribed:
1. **Cancel** your current subscription
2. **Wait** for it to expire
3. **Then** try using the promotional offer
4. Note: This may not work if offer is "new customers only"

## Current Behavior (Working as Designed)

The code is working correctly:
1. ✅ Finds the discount code
2. ✅ Attempts to apply it
3. ⚠️ Apple says user is ineligible
4. ✅ Falls back to regular purchase (with free trial)

This is the **correct behavior** - the app gracefully handles ineligibility.

## For Production Users

In production, this will work for:
- ✅ New users who haven't subscribed before
- ✅ Users who meet the eligibility criteria
- ❌ Users who already used the offer (they'll get free trial instead)

## Testing Recommendations

To properly test promotional offers:
1. Use a **fresh test account** that has never subscribed
2. Make sure the account **hasn't used any promotional offers** before
3. Test with different discount codes (LIMITED10, LIMITED15, etc.)
4. Verify the discounted price appears in the payment sheet

## Summary

- **The code is working correctly** - it finds and attempts to apply the discount
- **Apple is blocking it** because the user doesn't meet eligibility criteria
- **Most likely cause**: You've already used this promotional offer or are already subscribed
- **Solution**: Use a fresh test account to test the promotional offer flow



