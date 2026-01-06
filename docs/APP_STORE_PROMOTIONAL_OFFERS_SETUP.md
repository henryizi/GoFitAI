# 📱 How to Create Promotional Offers in App Store Connect

## Step-by-Step Guide

### Step 1: Navigate to Your App

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Sign in** with your Apple Developer account
3. **Click "My Apps"** in the top navigation
4. **Select your GoFitAI app**

### Step 2: Access Subscriptions

1. In your app's dashboard, look for the **"Subscriptions"** section in the left sidebar
2. **Click "Subscriptions"**
3. You should see your subscription group (e.g., "GoFitAI Premium")
4. **Click on your subscription group** to expand it

### Step 3: Select Your Monthly Subscription

1. You should see your subscription products:
   - `gofitai_premium_monthly1` (Monthly)
   - `gofitai_premium_lifetime1` (Lifetime)
2. **Click on `gofitai_premium_monthly1`** (the monthly subscription)

### Step 4: Create Promotional Offers

1. In the subscription detail page, look for the **"Promotional Offers"** section
2. **Click the "+" button** or **"Create Promotional Offer"** button

### Step 5: Configure Each Promotional Offer

You'll need to create **5 separate promotional offers**, one for each discount percentage:

#### Offer 1: LIMITED10 (10% Off)

1. **Reference Name**: `Limited Time 10% Off` (internal name, for your reference)
2. **Promotional Offer Code**: `LIMITED10` ⚠️ **This must match exactly what's in your code**
3. **Offer Type**: Select **"Pay as You Go"**
4. **Price**: 
   - Calculate: $9.99 × 0.90 = **$8.99**
   - Enter: `8.99`
5. **Duration**: 
   - Select **"1 period"** (first month only)
6. **Customer Eligibility**: 
   - Select **"All eligible customers"** (or configure specific rules)
7. **Start Date**: Today's date (or when you want it to become active)
8. **End Date**: Leave blank (or set an expiration date if desired)
9. **Click "Create"** or **"Save"**

#### Offer 2: LIMITED15 (15% Off)

Repeat the same process:
- **Reference Name**: `Limited Time 15% Off`
- **Promotional Offer Code**: `LIMITED15`
- **Offer Type**: Pay as You Go
- **Price**: $9.99 × 0.85 = **$8.49**
- **Duration**: 1 period
- **Customer Eligibility**: All eligible customers

#### Offer 3: LIMITED20 (20% Off)

- **Reference Name**: `Limited Time 20% Off`
- **Promotional Offer Code**: `LIMITED20`
- **Offer Type**: Pay as You Go
- **Price**: $9.99 × 0.80 = **$7.99**
- **Duration**: 1 period
- **Customer Eligibility**: All eligible customers

#### Offer 4: LIMITED25 (25% Off)

- **Reference Name**: `Limited Time 25% Off`
- **Promotional Offer Code**: `LIMITED25`
- **Offer Type**: Pay as You Go
- **Price**: $9.99 × 0.75 = **$7.49**
- **Duration**: 1 period
- **Customer Eligibility**: All eligible customers

#### Offer 5: LIMITED30 (30% Off)

- **Reference Name**: `Limited Time 30% Off`
- **Promotional Offer Code**: `LIMITED30`
- **Offer Type**: Pay as You Go
- **Price**: $9.99 × 0.70 = **$6.99**
- **Duration**: 1 period
- **Customer Eligibility**: All eligible customers

---

## 📍 Visual Navigation Path

```
App Store Connect
  └─ My Apps
      └─ GoFitAI (your app)
          └─ Subscriptions (left sidebar)
              └─ [Your Subscription Group]
                  └─ gofitai_premium_monthly1
                      └─ Promotional Offers (tab/section)
                          └─ + Create Promotional Offer
```

---

## ⚠️ Important Notes

1. **Offer Codes Must Match**: The promotional offer codes (`LIMITED10`, `LIMITED15`, etc.) must **exactly match** what's in your code:
   ```typescript
   const DISCOUNT_OFFER_MAP: Record<number, string> = {
     10: 'LIMITED10',
     15: 'LIMITED15',
     20: 'LIMITED20',
     25: 'LIMITED25',
     30: 'LIMITED30',
   };
   ```

2. **Price Calculation**: Make sure to calculate the discounted price correctly:
   - 10% off $9.99 = $8.99
   - 15% off $9.99 = $8.49
   - 20% off $9.99 = $7.99
   - 25% off $9.99 = $7.49
   - 30% off $9.99 = $6.99

3. **Duration**: Set to **"1 period"** so the discount only applies to the first month

4. **Review Required**: After creating promotional offers, they may need to be reviewed by Apple before going live (usually quick, but can take a few hours)

5. **Testing**: Use Sandbox test accounts to test the promotional offers before they go live

---

## 🔄 After Creating in App Store Connect

### Step 1: Wait for Sync
- Promotional offers typically sync to RevenueCat within **5-15 minutes**
- You can check in RevenueCat Dashboard → Products → Your Product → Promotional Offers

### Step 2: Verify in RevenueCat (Optional)
1. Go to **RevenueCat Dashboard** → Your Project
2. Navigate to **Products** → `gofitai_premium_monthly1`
3. Check **Promotional Offers** section
4. You should see your offers listed (they sync automatically)

### Step 3: Test in Your App
1. Use a **Sandbox test account**
2. Navigate to the paywall
3. Click the **X button** to see the limited offer page
4. Click **"Claim your limited offer now!"**
5. Verify the discounted price shows correctly
6. Complete the purchase to verify the discount is applied

---

## 🆘 Troubleshooting

### "I can't find Promotional Offers section"
- Make sure you're looking at the **subscription product** (not the subscription group)
- Promotional Offers are only available for **auto-renewable subscriptions**
- Make sure your subscription is **approved and active**

### "The offer code doesn't work"
- Double-check the code matches exactly (case-sensitive): `LIMITED10` not `limited10`
- Wait a few minutes for App Store Connect to sync
- Make sure the offer is **active** (check start/end dates)

### "RevenueCat doesn't show the offers"
- Wait 5-15 minutes for sync
- Refresh the RevenueCat dashboard
- Make sure your App Store Connect credentials are properly configured in RevenueCat

---

## 📚 Additional Resources

- [Apple: Creating Promotional Offers](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers/creating_promotional_offers)
- [RevenueCat: Promotional Offers Guide](https://docs.revenuecat.com/docs/promotional-offers)





