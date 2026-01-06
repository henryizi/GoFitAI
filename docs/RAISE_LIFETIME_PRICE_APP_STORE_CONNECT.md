# 💰 How to Raise Lifetime Price in App Store Connect (In-App Purchase)

## Step-by-Step Guide

### Step 1: Navigate to Your App

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Sign in** with your Apple Developer account
3. **Click "My Apps"** in the top navigation
4. **Select "GoFitAI"** from your apps list

### Step 2: Access In-App Purchases

1. In your app's dashboard, look for **"Features"** in the left sidebar
2. **Click "Features"**
3. **Click "In-App Purchases"** (under Features section)
4. You should see your in-app purchases listed

### Step 3: Select Lifetime Product

1. Find **`gofitai_premium_lifetime1`** in the list
2. **Click on it** to open the product details

### Step 4: Change Price

1. In the product detail page, look for the **"Pricing"** section
2. You'll see the current price (e.g., "$79.99")
3. **Click "Edit"** or the price itself
4. A price tier selector will appear

### Step 5: Select New Price Tier

1. **Scroll through available price tiers** or use the search
2. **Select your new price tier**:
   - For $149.99: Look for "Tier 150" or search "$149.99"
   - For $199.99: Look for "Tier 200" or search "$199.99"
   - For $99.99: Look for "Tier 100" or search "$99.99"
3. **Click "Save"** or **"Done"**

### Step 6: Review and Confirm

1. Review the price change:
   - Old price: $79.99
   - New price: $149.99 (or your selected price)
2. **Click "Save"** to confirm

---

## 📍 Visual Navigation Path

```
App Store Connect
  └─ My Apps
      └─ GoFitAI (your app)
          └─ Features (left sidebar)
              └─ In-App Purchases
                  └─ gofitai_premium_lifetime1
                      └─ Pricing Section
                          └─ Edit / Change Price
                              └─ Select New Price Tier
                                  └─ Save
```

---

## 💡 Important Notes

### ⚠️ Existing Customers

- **Existing lifetime purchasers are NOT affected**
- They already purchased at the old price ($79.99)
- Only **new purchases** will use the new price ($149.99)
- No refunds or additional charges for existing customers

### ⏱️ Processing Time

- Price changes usually take effect **immediately** or within a few hours
- RevenueCat will automatically sync the new price (15-30 minutes)
- No App Store review required for price changes

### 🌍 Currency Conversion

- Apple automatically converts prices to local currencies
- Based on your base price tier (USD)
- Users see prices in their local currency

---

## 🎯 Common Price Tiers

| Tier | USD Price | Use Case |
|------|-----------|----------|
| Tier 10 | $9.99 | - |
| Tier 20 | $19.99 | - |
| Tier 30 | $29.99 | - |
| Tier 50 | $49.99 | - |
| Tier 80 | $79.99 | Current lifetime price |
| Tier 100 | $99.99 | - |
| Tier 150 | $149.99 | **Lifetime (recommended)** |
| Tier 200 | $199.99 | Premium lifetime |
| Tier 300 | $299.99 | Ultimate lifetime |

---

## ✅ Verification Steps

After changing the price:

1. **Check App Store Connect**:
   - Go back to `gofitai_premium_lifetime1`
   - Verify the price shows as your new price
   - Check "Pricing" section

2. **Wait for RevenueCat Sync** (15-30 minutes):
   - Go to RevenueCat Dashboard
   - Products → `gofitai_premium_lifetime1`
   - Verify price updated

3. **Test in Your App**:
   - Open the paywall
   - Check if lifetime shows the new price
   - Verify with sandbox account (optional)

---

## 🚨 Troubleshooting

### "I can't find In-App Purchases"
- Make sure you're in the **Features** section (not Subscriptions)
- In-App Purchases is a sub-section under Features
- If you don't see it, your app might not have any IAPs configured yet

### "I can't find the Pricing section"
- Make sure you clicked on the specific product (`gofitai_premium_lifetime1`)
- Pricing should be visible in the product detail page
- If it's not editable, the product might be in review or pending

### "Price didn't update in my app"
- Wait 15-30 minutes for RevenueCat to sync
- Restart your app
- Check RevenueCat Dashboard to verify sync
- Clear app cache if needed

### "What about existing users?"
- They keep their original purchase price
- No action needed on your part
- Apple handles this automatically

---

## 📋 Quick Checklist

- [ ] Navigate to App Store Connect → My Apps → GoFitAI
- [ ] Go to Features → In-App Purchases
- [ ] Click on `gofitai_premium_lifetime1`
- [ ] Find "Pricing" section
- [ ] Click "Edit" or the price
- [ ] Select new price tier (e.g., Tier 150 = $149.99)
- [ ] Click "Save"
- [ ] Wait 15-30 minutes for RevenueCat sync
- [ ] Verify in app that price updated

---

## 🎯 Recommended Price

For your setup:
- **Monthly**: $9.99/month
- **Yearly**: $79.99/year (best value)
- **Lifetime**: **$149.99** (recommended - 2x yearly price)

This makes yearly clearly the best value while lifetime is a premium option.

---

## 📚 Additional Resources

- [Apple: Managing In-App Purchase Prices](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/manage-in-app-purchase-prices)
- [App Store Connect Help: In-App Purchases](https://help.apple.com/app-store-connect/#/devb57be10e7)





