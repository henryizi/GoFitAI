# Quick Fix: App Store Connect API 401 Error

## ✅ Your Credentials
- **Key ID**: `BGB44QUU2A`
- **Issuer ID**: `c47cbb7b-15c5-41b8-b602-e6bbb595007a`
- **Key File**: `/Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8` (verify this matches Key ID)

## 🚀 Quick Fix (Temporary - for this session)

Run this before your EAS commands:

```bash
source setup-apple-api-key.sh
```

Or manually:

```bash
export EXPO_APPLE_API_KEY_PATH="/Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8"
export EXPO_APPLE_API_KEY_ID="BGB44QUU2A"
export EXPO_APPLE_API_ISSUER_ID="c47cbb7b-15c5-41b8-b602-e6bbb595007a"
```

Then run your EAS command:

```bash
eas submit --platform ios --profile production
```

## 🔧 Permanent Fix (Recommended)

To permanently configure EAS with the correct credentials:

1. **Run the interactive command:**
   ```bash
   eas credentials
   ```

2. **Follow these steps:**
   - Select: **iOS**
   - Select: **production** (or your build profile)
   - Select: **Set up App Store Connect API Key** (or **Update** if it exists)
   - Enter **Key ID**: `BGB44QUU2A`
   - Enter **Issuer ID**: `c47cbb7b-15c5-41b8-b602-e6bbb595007a`
   - Enter **Key File Path**: `/Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8`

3. **Verify it worked:**
   After configuration, try your EAS command again - it should work without needing environment variables.

## 🧪 Test It

After setting up (either method), test with:

```bash
eas submit --platform ios --profile production
```

The 401 error should be resolved! 🎉

