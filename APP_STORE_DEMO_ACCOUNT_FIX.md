# App Store Demo Account Fix Guide

## Issue
Apple reviewers cannot sign in with the provided demo account credentials:
- Email: `gofitai520@gmail.com`
- Password: `756286Henry`

## Solution Steps

### Step 1: Verify Account Exists
1. Go to Supabase Dashboard → Authentication → Users
2. Search for `gofitai520@gmail.com`
3. If the account doesn't exist, create it (see Step 2)
4. If it exists, verify it's confirmed and active

### Step 2: Create New Demo Account (If Needed)

#### Option A: Use the Script
Run the provided script to create a reviewer account:

```bash
node create_reviewer.js
```

This will create:
- Email: `apple.reviewer@gofitai.com`
- Password: `Reviewer2024!`

#### Option B: Create Manually in Supabase
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create New User"
3. Enter:
   - Email: `gofitai520@gmail.com` (or a new email)
   - Password: `756286Henry` (or a new secure password)
   - Auto Confirm User: ✅ **CHECK THIS BOX** (Important!)
4. Click "Create User"

#### Option C: Create via App
1. Open the app
2. Sign up with email: `gofitai520@gmail.com`
3. Use password: `756286Henry`
4. Complete email verification if required
5. Complete onboarding flow
6. Subscribe to premium (use sandbox account)

### Step 3: Verify Account Status
After creating the account, verify:

1. **Email Confirmation:**
   - Go to Supabase Dashboard → Authentication → Users
   - Find the user account
   - Ensure "Email Confirmed" is ✅ (green checkmark)
   - If not, click "Confirm Email" button

2. **Account Active:**
   - Ensure user is not banned/disabled
   - Status should be "Active"

3. **Test Login:**
   - Try logging in with the credentials in the app
   - Ensure login works successfully

### Step 4: Update App Store Connect
1. Go to App Store Connect → Your App → App Information
2. Scroll to "App Review Information"
3. Update the demo account credentials:
   - **Username:** `gofitai520@gmail.com` (or the account you created)
   - **Password:** `756286Henry` (or the password you set)
4. Add notes:
   ```
   This demo account has been verified and confirmed. 
   Email confirmation is enabled, so the account is ready to use.
   The account has completed onboarding and has premium access for full feature testing.
   ```

### Step 5: Alternative - Create Fresh Account for Reviewers
If you want to create a fresh account specifically for reviewers:

1. **Create Account:**
   - Email: `appstore.reviewer@gofitai.com`
   - Password: `Reviewer2024!GoFitAI`
   - Auto-confirm in Supabase

2. **Complete Setup:**
   - Log in to the app with this account
   - Complete onboarding (or skip if you want reviewers to see it)
   - Subscribe to premium (use sandbox test account)

3. **Update App Store Connect:**
   - Username: `appstore.reviewer@gofitai.com`
   - Password: `Reviewer2024!GoFitAI`
   - Notes: "Fresh account created for App Store review. Account is confirmed and ready to use."

## Recommended Demo Account Setup

### For Full Feature Testing:
- ✅ Account created and confirmed
- ✅ Email verified
- ✅ Onboarding completed
- ✅ Premium subscription active (sandbox)
- ✅ All features accessible

### For Onboarding Flow Testing:
- ✅ Account created and confirmed
- ✅ Email verified
- ❌ Onboarding NOT completed (so reviewers can see the flow)
- ❌ Premium NOT subscribed (so reviewers can see paywall)

## Quick Fix Script

If you need to quickly create and verify an account, use this:

```bash
# Make sure you have .env file with Supabase credentials
node create_reviewer.js

# Then manually confirm in Supabase Dashboard:
# 1. Go to Authentication → Users
# 2. Find the created user
# 3. Click "Confirm Email" if needed
```

## Verification Checklist

Before resubmitting, verify:

- [ ] Account exists in Supabase
- [ ] Email is confirmed (green checkmark)
- [ ] Account is active (not banned)
- [ ] Can log in successfully in the app
- [ ] Credentials are correct in App Store Connect
- [ ] Notes added explaining account status
- [ ] Account has appropriate access (onboarding completed or not, premium or not)

## Common Issues

### Issue: "Invalid login credentials"
**Solution:** 
- Verify password is correct
- Check if email confirmation is required
- Ensure account exists in Supabase

### Issue: "Email not confirmed"
**Solution:**
- Go to Supabase Dashboard → Authentication → Users
- Find the user and click "Confirm Email"
- Or disable email confirmation in Supabase Auth settings (not recommended for production)

### Issue: "Account doesn't exist"
**Solution:**
- Create the account using one of the methods above
- Ensure you use the exact email/password in App Store Connect

## Next Steps After Fix

1. ✅ Create/verify demo account
2. ✅ Update App Store Connect with correct credentials
3. ✅ Add notes explaining account status
4. ✅ Test login yourself to ensure it works
5. ✅ Resubmit app for review

---

**Important:** Always test the credentials yourself before submitting to ensure they work!














