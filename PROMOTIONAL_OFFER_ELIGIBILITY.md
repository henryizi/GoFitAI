# Promotional Offer Eligibility - Who Can Use It?

## Short Answer

**Not necessarily only new users!** It depends on how you configure the promotional offer in App Store Connect.

## Eligibility Options in App Store Connect

When creating a promotional offer in App Store Connect, you can choose from:

### 1. **All Eligible Customers** (Most Flexible)
- ✅ **New subscribers** (never subscribed before)
- ✅ **Lapsed subscribers** (previously subscribed but subscription expired)
- ✅ **Current subscribers** (already subscribed, can switch to discounted plan)
- ✅ **Users who haven't used this specific offer before**

**Best for:** General promotions, attracting new users, re-engaging lapsed users

### 2. **New Customers Only**
- ✅ **Only new subscribers** (never subscribed to this product before)
- ❌ **Not eligible:** Current subscribers, lapsed subscribers

**Best for:** First-time user acquisition campaigns

### 3. **Lapsed Subscribers Only**
- ✅ **Only users whose subscription expired**
- ❌ **Not eligible:** New users, current subscribers

**Best for:** Win-back campaigns for churned users

### 4. **Specific Eligibility Rules**
- Custom rules based on subscription history
- Can combine multiple conditions

## Common Scenarios

### Scenario 1: User Already Used This Offer
```
User tries to use: LIMITED10
Result: ❌ "User is ineligible"
Reason: Already used this specific promotional offer code before
Solution: Use a different code (LIMITED15, LIMITED20, etc.)
```

### Scenario 2: User Currently Subscribed
```
User status: Active monthly subscriber
Tries to use: LIMITED10
Result: ✅ Works IF "All Eligible Customers" is selected
Result: ❌ Fails IF "New Customers Only" is selected
```

### Scenario 3: User Never Subscribed (New User)
```
User status: Never subscribed before
Tries to use: LIMITED10
Result: ✅ Works with ANY eligibility setting
```

### Scenario 4: User's Subscription Expired (Lapsed)
```
User status: Previously subscribed, but subscription expired
Tries to use: LIMITED10
Result: ✅ Works IF "All Eligible Customers" OR "Lapsed Subscribers Only"
Result: ❌ Fails IF "New Customers Only"
```

## How to Check Your Current Settings

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **My Apps** → **GoFitAI** → **Subscriptions**
3. **Click** `gofitai_premium_monthly1`
4. **Promotional Offers** → **Click** `LIMITED10` (or any offer)
5. **Check "Customer Eligibility"** section

## Recommendations

### For Maximum Flexibility
**Use "All Eligible Customers"** - This allows:
- New users to get discount
- Lapsed users to come back with discount
- Current users to switch to discounted plan
- Maximum reach for your promotion

### For First-Time User Acquisition
**Use "New Customers Only"** - This ensures:
- Only truly new users get the discount
- Prevents existing users from gaming the system
- Focuses promotion budget on new acquisition

### For Win-Back Campaigns
**Use "Lapsed Subscribers Only"** - This targets:
- Users who churned
- Encourages them to return with discount
- Doesn't affect current subscribers

## Current Issue in Your App

Based on the logs, the user is getting "ineligible" error. This could be because:

1. **Already used this offer** (most likely)
   - Solution: Use a different promotional offer code
   - Or: Create a new promotional offer with a different code

2. **Eligibility set to "New Customers Only"**
   - But user is already subscribed or has subscribed before
   - Solution: Change to "All Eligible Customers" in App Store Connect

3. **Test account restrictions**
   - Sandbox accounts may have limitations
   - Solution: Use a fresh test account that hasn't subscribed

## Testing Recommendations

To test promotional offers properly:

1. **Create multiple promotional offers** with different codes:
   - `LIMITED10` - 10% off
   - `LIMITED15` - 15% off
   - `LIMITED20` - 20% off
   - Each can be used once per Apple ID

2. **Set eligibility to "All Eligible Customers"** for testing flexibility

3. **Use fresh test accounts** for each test:
   - Account 1: Test new user flow
   - Account 2: Test lapsed user flow
   - Account 3: Test current subscriber flow

4. **Test with different scenarios**:
   - New user (never subscribed)
   - Current subscriber (active subscription)
   - Lapsed subscriber (expired subscription)

## Summary

**Not only new users can use promotional offers!**

It depends on your App Store Connect configuration:
- ✅ **"All Eligible Customers"** → New, lapsed, and current users (if they haven't used this specific offer)
- ✅ **"New Customers Only"** → Only completely new users
- ✅ **"Lapsed Subscribers Only"** → Only users whose subscription expired

**Most flexible option:** "All Eligible Customers" - allows maximum reach while still preventing abuse (each code can only be used once per Apple ID).



