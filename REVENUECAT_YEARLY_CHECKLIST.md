# RevenueCat Yearly Product Checklist

## ✅ App Store Connect (Should be done)
- [x] Product ID: `gofitai_premium_yearly1` exists
- [x] Product is approved/ready
- [x] Same subscription group as monthly
- [x] Reference name can be same or different (doesn't matter)

## 🔍 RevenueCat Dashboard (Check these)

### Step 1: Products Tab
- [ ] Product `gofitai_premium_yearly1` is added
- [ ] Platform: iOS is selected
- [ ] Product is linked to App Store Connect

### Step 2: Packages Tab
- [ ] Package exists with Product: `gofitai_premium_yearly1`
- [ ] Package Type: **Annual** or **Yearly** (not Monthly!)
- [ ] Package ID: something like `yearly_premium` or `$rc_annual`

### Step 3: Offerings Tab
- [ ] Go to "default" offering
- [ ] The yearly package is added to the offering
- [ ] Offering is saved

## 🚨 Common Issues

### Issue 1: Package Type Wrong
- ❌ If Package Type is "Monthly" → Change to "Annual"
- ✅ Package Type must be "Annual" or "Yearly" for yearly subscription

### Issue 2: Package Not in Offering
- ❌ Package exists but not in any offering
- ✅ Add package to "default" offering

### Issue 3: Product Not Linked
- ❌ Product exists in RevenueCat but not linked to App Store Connect
- ✅ Click "Link to App Store Connect" in Products tab

## 🧪 Test After Fixing

1. Restart app completely
2. Open paywall
3. Check console logs for:
   - `[RevenueCat] Found package with type: ANNUAL`
   - No warnings about `gofitai_premium_yearly1` not found



