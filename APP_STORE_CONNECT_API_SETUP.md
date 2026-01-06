# App Store Connect API Key Setup for EAS

## Current Configuration
- ✅ Key ID: `BGB44QUU2A`
- ✅ Issuer ID: `c47cbb7b-15c5-41b8-b602-e6bbb595007a`
- ✅ Key File: `AuthKey_7LGAJP9C7W.p8` (exists in project root - verify this matches Key ID)
- ✅ EAS Status: "App Store Connect API Key already set up"
- ❌ Error: 401 Authentication credentials are missing or invalid

## Troubleshooting 401 Error (Key Already Configured)

Since EAS says the key is already set up but you're getting a 401 error, try these steps:

### Step 1: Verify Key Status in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Navigate to **Users and Access** → **Keys** → **App Store Connect API**
3. Find the key with ID `7LGAJP9C7W`
4. Check:
   - ✅ Key is **Active** (not revoked)
   - ✅ Key has **Admin** or **App Manager** role
   - ✅ Key was created for the correct Apple Developer account

### Step 2: Reconfigure the API Key in EAS

Even though it says it's set up, reconfigure it to refresh the credentials:

```bash
eas credentials
```

When prompted:
1. Select **iOS**
2. Select **production** (or the profile you're using)
3. Choose **Set up App Store Connect API Key** (or **Update App Store Connect API Key**)
4. Enter:
   - **Key ID**: `BGB44QUU2A`
   - **Issuer ID**: `c47cbb7b-15c5-41b8-b602-e6bbb595007a`
   - **Key File Path**: `/Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8` (verify this matches the Key ID)

### Step 3: Check Key File

Verify the key file is valid:

```bash
# Check if file exists and is readable
ls -la /Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8

# Verify it's a valid private key
head -1 /Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8
# Should output: -----BEGIN PRIVATE KEY-----
```

### Step 4: Clear and Reconfigure (If Still Failing)

If the above doesn't work, try clearing the credentials and setting them up fresh:

```bash
# Option 1: Use environment variables to override
export EXPO_APPLE_API_KEY_PATH="/Users/ngkwanho/Desktop/GoFitAI/AuthKey_7LGAJP9C7W.p8"
export EXPO_APPLE_API_KEY_ID="BGB44QUU2A"
export EXPO_APPLE_API_ISSUER_ID="c47cbb7b-15c5-41b8-b602-e6bbb595007a"

# Then run your EAS command
eas submit --platform ios --profile production
```

### Step 5: Regenerate Key (Last Resort)

If nothing works, the key might be corrupted or have permission issues:

1. Go to App Store Connect → **Users and Access** → **Keys**
2. **Revoke** the old key (`7LGAJP9C7W`)
3. **Create a new key**:
   - Name: "EAS Submit Key"
   - Access: **Admin** or **App Manager**
   - Download the new `.p8` file
   - Note the new **Key ID** and **Issuer ID**
4. Replace `AuthKey_7LGAJP9C7W.p8` with the new key file
5. Reconfigure in EAS with the new Key ID

## Common Causes of 401 Error

1. **Key was revoked** in App Store Connect
2. **Wrong Issuer ID** configured in EAS
3. **Key file path** is incorrect or file is corrupted
4. **Key permissions** are insufficient (needs Admin/App Manager)
5. **Key belongs to different Apple Developer account** than the app

## Verify After Fixing

After reconfiguring, test with a build/submit command to verify it works.

