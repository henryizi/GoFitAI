# 🚨 Apple Sign-In ERR_REQUEST_UNKNOWN - Complete Fix Guide

## Problem
Getting `ERR_REQUEST_UNKNOWN` error when calling `AppleAuthentication.signInAsync()` - this happens **before** reaching Apple's servers.

## Root Cause Analysis
The error occurs at the iOS system level, not in your app code. Common causes:

### 1. 🔧 Apple Developer Console Issues (Most Common)
- Services ID not properly configured
- Missing or incorrect Return URLs
- App ID missing Sign In with Apple capability

### 2. 📱 Device/Simulator Issues
- Running on iOS Simulator without proper Apple ID setup
- Device not signed into iCloud
- iOS version compatibility

### 3. ⚙️ Build Configuration Issues
- Entitlements not properly linked
- Bundle ID mismatch
- Development team not set

## 🛠️ Step-by-Step Fix

### Step 1: Apple Developer Console Configuration

#### A. Check App ID (`com.henrymadeit.gofitai`)
1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Find `com.henrymadeit.gofitai`
4. Ensure **"Sign In with Apple"** is checked ✅
5. Click **Save**

#### B. Configure Services ID (`com.henrymadeit.gofitai.signin`)
1. Find `com.henrymadeit.gofitai.signin` in Identifiers
2. Ensure **"Sign In with Apple"** is checked ✅
3. Click **"Configure"** next to "Sign In with Apple"
4. **CRITICAL**: Add this exact Return URL:
   ```
   https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback
   ```
5. Click **Save** → **Continue** → **Save**

### Step 2: Verify Local Configuration

Your current config looks correct:
- ✅ Bundle ID: `com.henrymadeit.gofitai`
- ✅ Entitlements: `com.apple.developer.applesignin: ["Default"]`
- ✅ Expo plugin: `expo-apple-authentication`

### Step 3: Test Environment Setup

#### For iOS Simulator:
1. Open **Settings** app in simulator
2. Go to **Sign-In & Security** → **Sign In with Apple**
3. Make sure you're signed in with a valid Apple ID
4. Enable **Use Sign In with Apple**

#### For Physical Device:
1. Ensure device is signed into iCloud
2. Go to **Settings** → **Sign-In & Security** → **Sign In with Apple**
3. Enable the feature

### Step 4: Build Configuration Check

Run this command to verify entitlements are properly linked:
```bash
cd ios
xcodebuild -project GoFitAI.xcodeproj -showBuildSettings -target GoFitAI | grep CODE_SIGN_ENTITLEMENTS
```

Should show: `CODE_SIGN_ENTITLEMENTS = GoFitAI/GoFitAI.entitlements`

### Step 5: Clean Build

```bash
# Clean everything
cd ios
rm -rf build/
rm -rf DerivedData/
cd ..
npx expo run:ios --clear
```

## 🧪 Testing Strategy

### 1. Use the Test Script
Add this to your app temporarily:

```javascript
import * as AppleAuthentication from 'expo-apple-authentication';

const testAppleAuth = async () => {
  try {
    console.log('🔍 Testing Apple Authentication...');
    
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    console.log('✅ Available:', isAvailable);
    
    if (!isAvailable) {
      console.log('❌ Apple Sign-In not available');
      return;
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('✅ SUCCESS! Credential received:', {
      user: credential.user,
      email: credential.email,
      hasToken: !!credential.identityToken
    });

  } catch (error) {
    console.log('❌ ERROR:', {
      code: error.code,
      message: error.message
    });
  }
};
```

### 2. Test Progression
1. **First**: Test on physical device with iCloud signed in
2. **Second**: Test on simulator with Apple ID configured
3. **Third**: Test the full Supabase integration

## 🚨 Common Mistakes to Avoid

1. **Wrong Client ID in Supabase**: Use `com.henrymadeit.gofitai.signin` (Services ID), NOT `com.henrymadeit.gofitai` (Bundle ID)

2. **Missing Return URL**: Must include exact Supabase callback URL in Services ID configuration

3. **Simulator Issues**: Always test on physical device first - simulator can be unreliable

4. **Timing**: Apple Developer Console changes can take 5-10 minutes to propagate

## 🎯 Expected Results

After fixing, you should see:
```
🍎 Starting Apple Sign-In process...
🍎 Apple Sign-In availability: true
🍎 Requesting Apple ID credential...
🍎 Apple credential received: {...}
```

Instead of `ERR_REQUEST_UNKNOWN`.

## 🆘 If Still Failing

1. **Check Apple System Status**: https://developer.apple.com/system-status/
2. **Try Different Apple ID**: Some Apple IDs have restrictions
3. **Check iOS Version**: Ensure iOS 13+ on device
4. **Contact Apple Developer Support**: If configuration looks correct but still failing

## 📞 Next Steps

1. Follow Step 1 (Apple Developer Console) first
2. Wait 10 minutes for changes to propagate  
3. Test with the provided script
4. If successful, test full app integration




