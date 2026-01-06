# 🎁 Promotional Offers vs. Free Trial: How They Interact

## ⚠️ Important Answer: **NO, users do NOT get the 7-day free trial when they apply the promotional discount**

---

## 📋 Current Behavior

### When User Uses Promotional Discount (Lucky Draw):

1. **User clicks X button** → Sees limited offer page
2. **User spins lucky draw** → Gets discount (10%, 15%, 20%, 25%, or 30%)
3. **User applies discount** → Promotional offer is used
4. **Result**: User pays the **discounted price immediately** (e.g., $7.99 instead of $9.99)
5. **NO free trial** - The promotional offer **replaces** the introductory offer (free trial)

### When User Subscribes Normally (Without Discount):

1. **User goes directly to paywall** → Sees monthly subscription
2. **User subscribes** → Gets **7-day free trial** automatically
3. **After 7 days** → Charged $9.99/month

---

## 🔍 How It Works

### App Store Subscription Offers Hierarchy:

1. **Introductory Offers** (Free Trial):
   - Automatically applied to **new subscribers**
   - User gets 7 days free, then pays full price
   - Only for users who **never subscribed before**

2. **Promotional Offers** (Your Discount):
   - Applied **programmatically** when user claims the discount
   - **Replaces** the introductory offer for that purchase
   - User pays discounted price **immediately** (no free trial)

### Why Promotional Offers Replace Free Trials:

- **Apple's Design**: Promotional offers are meant to be **explicit discounts** that take precedence
- **When you apply a promotional offer**, it overrides the introductory offer
- **You cannot stack both** - it's one or the other

---

## 💡 Options & Recommendations

### Option 1: Keep Current Behavior (Recommended) ✅

**What happens:**
- Users who claim discount → Pay discounted price immediately (no free trial)
- Users who subscribe normally → Get 7-day free trial, then pay full price

**Pros:**
- Discount is immediate value (users see savings right away)
- Clear value proposition ("Get 20% off your first month!")
- Simpler implementation

**Cons:**
- Users miss out on free trial if they use discount
- Might feel like they're "losing" the free trial

**User Experience:**
```
Lucky Draw User:
- Spins → Gets 20% off
- Pays $7.99 immediately
- No free trial
- After 1 month → Pays $9.99/month

Normal User:
- Subscribes directly
- Gets 7 days free
- After 7 days → Pays $9.99/month
```

---

### Option 2: Apply Discount AFTER Free Trial

**What happens:**
- User gets 7-day free trial (same as normal)
- After trial ends, first charge is discounted
- Then full price after that

**How to implement:**
1. **Don't use promotional offers** for the discount
2. **Use Introductory Offers** with a discounted price for the first paid period
3. **But this applies to ALL users** (can't restrict to X button users)

**Pros:**
- Users get both free trial AND discount
- Better perceived value

**Cons:**
- **Cannot restrict to only X button users** - would apply to everyone
- More complex to implement
- Requires different approach (introductory offers instead of promotional)

**Not Recommended** because you want the discount to only apply to users who click X.

---

### Option 3: Change Promotional Offer Duration

**What happens:**
- User gets discount for **multiple periods** (e.g., first 3 months)
- Still no free trial, but longer discount period

**How to implement:**
1. In App Store Connect, change promotional offer **Duration** from "1 period" to "3 periods"
2. User pays discounted price for first 3 months
3. Then full price after that

**Pros:**
- More value for users (3 months of discount vs. 1 month)
- Still immediate discount (no free trial)

**Cons:**
- Less revenue (3 months discounted vs. 1 month)
- Still no free trial

**Example:**
```
User gets 20% off for first 3 months:
- Month 1: $7.99 (20% off)
- Month 2: $7.99 (20% off)
- Month 3: $7.99 (20% off)
- Month 4+: $9.99 (full price)
```

---

## 🎯 Recommended Approach

### Keep Current Setup (Option 1) ✅

**Reasoning:**
1. **Clear value proposition**: "Get 20% off your first month" is straightforward
2. **Immediate savings**: Users see the discount right away
3. **Selective application**: Only users who click X get the discount
4. **Simple implementation**: Already working as designed

### Update UI/UX to Set Expectations:

**In your lucky draw screen**, update the text to clarify:

```typescript
// Current text:
<Text style={styles.revealNote}>Apply this to your first month</Text>

// Updated text (more clear):
<Text style={styles.revealNote}>
  Get {finalDiscount}% off your first month. 
  Pay ${discountedPrice} now, then ${regularPrice}/month after.
</Text>
```

**In your paywall**, when promotional offer is active:

```typescript
// Show clear messaging:
<Text>
  Limited Offer: {discountPercent}% off first month
  Pay ${discountedPrice} now (no free trial with this offer)
</Text>
```

---

## 📊 Comparison Table

| Scenario | Free Trial? | First Payment | After First Payment |
|---------|------------|---------------|---------------------|
| **Normal Subscription** | ✅ Yes (7 days) | $0 (trial) | $9.99/month |
| **With Promotional Discount** | ❌ No | $7.99 (discounted) | $9.99/month |
| **With 3-Month Discount** | ❌ No | $7.99/month × 3 | $9.99/month |

---

## ⚙️ Technical Details

### How Promotional Offers Work:

1. **In App Store Connect:**
   - Promotional offer is configured with discounted price
   - Duration: 1 period (first month only)
   - Applied programmatically via code

2. **In Your Code:**
   ```typescript
   // When user applies discount:
   await Purchases.purchasePackage(monthlyPackage, {
     promotionalOffer: promotionalOfferObject // This replaces intro offer
   });
   ```

3. **Result:**
   - Introductory offer (free trial) is **bypassed**
   - Promotional offer price is charged **immediately**
   - After discount period, full price applies

---

## ✅ Action Items

1. **Decide on approach**: Keep current (Option 1) or change to Option 3 (longer discount)
2. **Update UI text** to clarify no free trial with discount
3. **Test both flows**:
   - Normal subscription (should get free trial)
   - Discounted subscription (should pay immediately)
4. **Monitor user feedback** to see if users are confused about missing free trial

---

## 🧪 Testing Checklist

- [ ] Test normal subscription → Verify 7-day free trial works
- [ ] Test discounted subscription → Verify discount applies immediately (no trial)
- [ ] Verify UI text clearly explains the difference
- [ ] Test with sandbox account to confirm behavior
- [ ] Check RevenueCat dashboard to verify offer application

---

## 📚 References

- [Apple: Promotional Offers](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers/creating_promotional_offers)
- [Apple: Introductory Offers](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers/creating_introductory_offers)
- [RevenueCat: Promotional Offers](https://docs.revenuecat.com/docs/promotional-offers)





