# 🚨 Apple Sign-In Quick Fix

## Root Cause: Apple Developer Console Configuration
The error `ERR_REQUEST_UNKNOWN` occurs **before** Supabase - it's an Apple Developer Console issue.

## 🔧 Immediate Fix Steps

### 1. Go to Apple Developer Console
- Visit: https://developer.apple.com/account
- Navigate to: **Certificates, Identifiers & Profiles** → **Identifiers**

### 2. Configure Services ID
- Find: `com.henrymadeit.gofitai.signin`
- Click to edit
- Ensure **"Sign In with Apple"** is checked ✅
- Click **"Configure"** next to "Sign In with Apple"

### 3. Add Return URLs (CRITICAL)
In the Services ID configuration, add this EXACT Return URL:
```
https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback
```

**Your Supabase Project Details:**
- Project URL: `https://lmfdgnxertwrhbjhrcby.supabase.co`
- Subdomain: `lmfdgnxertwrhbjhrcby`
- Full Callback URL: `https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback`

### 4. Verify App ID
- Find: `com.henrymadeit.gofitai`
- Ensure **"Sign In with Apple"** capability is enabled ✅

### 5. Save All Changes
- Click **"Save"** on Services ID configuration
- Click **"Continue"** and **"Save"** again

## 🔄 After Making Changes

1. **Wait 5-10 minutes** for Apple's servers to propagate changes
2. **Test Apple Sign-In** in your app again
3. The error should be resolved

## 📱 Alternative Test (If Still Failing)

If the issue persists, try testing on a **physical iOS device** instead of simulator:
- Apple Sign-In sometimes behaves differently on simulator vs. real device
- Ensure you're signed into iCloud on the test device

## ✅ Expected Result

After fixing the configuration, you should see:
```
🍎 Starting Apple Sign-In process...
🍎 Apple Sign-In availability: true
🍎 Requesting Apple ID credential...
🍎 Apple credential received: {...}
```

Instead of the `ERR_REQUEST_UNKNOWN` error.
