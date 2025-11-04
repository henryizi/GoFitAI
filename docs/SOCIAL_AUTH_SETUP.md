# Social Authentication Setup Guide

This guide will help you set up Apple Sign-In and Google Sign-In for your GoFitAI app.

## 🍎 Apple Sign-In Setup

### 1. Apple Developer Console Configuration

1. **Go to Apple Developer Console**: https://developer.apple.com/account/
2. **Navigate to**: Certificates, Identifiers & Profiles → Identifiers
3. **Select your App ID**: `com.henrymadeit.gofitai`
4. **Enable Sign in with Apple**:
   - Check "Sign in with Apple" capability
   - Configure as Primary App ID
   - Save changes

### 2. Apple Developer Console - Create Service ID & Key

#### Create a Services ID:
1. **Go to**: Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers
2. **Click**: "+" to create new identifier
3. **Select**: "Services IDs" → Continue
4. **Configure**:
   - **Description**: GoFitAI Sign In
   - **Identifier**: `com.henrymadeit.gofitai.signin` (must be different from your app bundle ID)
   - **Enable**: "Sign in with Apple"
5. **Configure Sign in with Apple**:
   - **Primary App ID**: Select your app ID (`com.henrymadeit.gofitai`)
   - **Web Domain**: `lmfdgnxertwrhbjhrcby.supabase.co`
   - **Return URLs**: `https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback`
6. **Save** and **Continue**

#### Create a Private Key:
1. **Go to**: Apple Developer Console → Keys
2. **Click**: "+" to create new key
3. **Configure**:
   - **Key Name**: GoFitAI Apple Sign In Key
   - **Enable**: "Sign in with Apple"
   - **Configure**: Select your Primary App ID
4. **Download** the `.p8` file (you can only download once!)
5. **Note down**: Key ID (10-character string)

#### Get Your Team ID:
1. **Go to**: Apple Developer Console → Membership
2. **Copy**: Team ID (10-character string)

### 3. Supabase Configuration

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Authentication → Providers
3. **Enable Apple Provider**:
   - Toggle "Enable sign in with Apple"
   - **Client ID**: `com.henrymadeit.gofitai.signin` (your Services ID, NOT your app bundle ID)
   - **Secret Key**: Generate JWT using the script below
   - **Allow users without an email**: Toggle OFF (recommended for better user experience)

### 4. Generate Apple JWT Secret Key

1. **Install JWT dependency**:
   ```bash
   npm install jsonwebtoken
   ```

2. **Update the configuration** in `scripts/generate-apple-jwt.js`:
   ```javascript
   const APPLE_CONFIG = {
     teamId: 'YOUR_10_CHAR_TEAM_ID',        // From Apple Developer Console → Membership
     clientId: 'com.henrymadeit.gofitai.signin', // Your Services ID
     keyId: 'YOUR_10_CHAR_KEY_ID',          // From your created key
     privateKeyPath: './AuthKey_YOUR_KEY_ID.p8' // Path to downloaded .p8 file
   };
   ```

3. **Place your .p8 file** in the project root directory

4. **Generate the JWT**:
   ```bash
   node scripts/generate-apple-jwt.js
   ```

5. **Copy the generated JWT** and paste it into Supabase as the "Secret Key"

## 🚨 Common Issues & Troubleshooting

### Issue 1: "Invalid Client ID" Error
**Problem**: Using app bundle ID instead of Services ID
**Solution**: Make sure you're using `com.henrymadeit.gofitai.signin` (Services ID) as Client ID, NOT `com.henrymadeit.gofitai` (app bundle ID)

### Issue 2: "Invalid JWT" Error  
**Problem**: Incorrect JWT format or expired token
**Solutions**:
- Regenerate JWT using the script above
- Verify your Team ID, Key ID, and .p8 file are correct
- Ensure the .p8 file is properly formatted (starts with `-----BEGIN PRIVATE KEY-----`)

### Issue 3: "Domain Not Verified" Error
**Problem**: Supabase domain not added to Apple Services ID configuration
**Solution**: In Apple Developer Console → Services ID → Configure Sign in with Apple:
- **Web Domain**: `lmfdgnxertwrhbjhrcby.supabase.co`
- **Return URLs**: `https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback`

### Issue 4: Users Can't Sign In
**Problem**: Missing email scope or configuration mismatch
**Solutions**:
- In Supabase, toggle OFF "Allow users without an email"
- Ensure your iOS app requests email scope in the sign-in request

## 🔑 Getting Your Apple Private Key (.p8 file)

**IMPORTANT**: You need to download the Apple private key (.p8 file) from Apple Developer Console to generate the JWT secret.

### Step-by-Step Instructions:

1. **Go to Apple Developer Console**: https://developer.apple.com/account/resources/authkeys/list
2. **Create a new key**:
   - Click the "+" button to create a new key
   - Enter a key name (e.g., "GoFitAI Sign in with Apple")
   - Check "Sign in with Apple" under Key Services
   - Click "Continue" then "Register"
3. **Download the key**:
   - **CRITICAL**: Download the `.p8` file immediately - you can only download it once!
   - Note the Key ID (10-character string like `ABC123DEFG`)
   - Save the file as `AuthKey_[KeyID].p8` in your project root
4. **Update the JWT generator**:
   - Open `scripts/generate-apple-jwt.js`
   - Replace `YOUR_TEAM_ID` with your Team ID (found in Membership section)
   - Replace `YOUR_KEY_ID` with the Key ID from step 3
   - Replace `YOUR_P8_FILE_PATH` with `./AuthKey_[KeyID].p8`

### Example file structure after setup:
```
GoFitAI/
├── AuthKey_ABC123DEFG.p8  ← Your downloaded private key
├── scripts/
│   └── generate-apple-jwt.js  ← Updated with your credentials
└── ...
```

## ✅ Setup Checklist

Before testing Apple Sign-In, verify:

- [ ] **Apple Developer Console**:
  - [ ] App ID created with "Sign in with Apple" capability enabled
  - [ ] Services ID created (`com.henrymadeit.gofitai.signin`)
  - [ ] Services ID configured with Supabase domain and return URL
  - [ ] Private key (.p8) downloaded and Key ID noted
  - [ ] Team ID copied from Membership section

- [ ] **Supabase Configuration**:
  - [ ] Apple provider enabled
  - [ ] Client ID set to Services ID (`com.henrymadeit.gofitai.signin`)
  - [ ] Secret Key set to generated JWT
  - [ ] "Allow users without an email" toggled OFF

- [ ] **iOS App Configuration**:
  - [ ] `expo-apple-authentication` installed
  - [ ] Bundle ID matches Apple Developer Console
  - [ ] Sign-in implementation requests email scope
  - [ ] Apple Sign-In entitlement added to app.json ✅

### 3. iOS Configuration

The Apple Sign-In is already configured in your `app.json`:
```json
"plugins": [
  ["expo-apple-authentication"]
]
```

## 🔍 Google Sign-In Setup

### 1. Google Cloud Console Configuration

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: GoFitAI
3. **Enable Google+ API**:
   - Navigate to APIs & Services → Library
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → OAuth 2.0 Client IDs
   - Create credentials for:
     - **Web application** (for Expo development)
     - **iOS application** (for production iOS app)
     - **Android application** (for production Android app)

### 2. Get Your Client IDs

After creating credentials, you'll get:
- **Web Client ID**: `your-web-client-id.googleusercontent.com`
- **iOS Client ID**: `your-ios-client-id.googleusercontent.com`
- **Android Client ID**: `your-android-client-id.googleusercontent.com`

### 3. Environment Configuration

Add these to your `.env.local` file:
```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.googleusercontent.com
```

### 4. Supabase Configuration

1. **Go to Supabase Dashboard**: Authentication → Providers
2. **Enable Google Provider**:
   - Toggle "Enable sign in with Google"
   - **Client ID**: Use your Web Client ID
   - **Client Secret**: Get from Google Cloud Console
   - **Redirect URL**: Copy the provided URL and add it to Google Cloud Console

### 5. iOS Configuration (for production)

Add to your `ios/GoFitAI/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>GoogleAuth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>your-ios-client-id</string>
    </array>
  </dict>
</array>
```

## 🔧 Testing the Integration

### 1. Development Testing

```bash
# Start the development server
npx expo start --clear

# Test on iOS Simulator or Device
# The Apple Sign-In will only work on physical devices
# Google Sign-In works on both simulator and device
```

### 2. Verify Authentication Flow

1. **Apple Sign-In**:
   - Should show Apple's native sign-in sheet
   - User can choose to share or hide email
   - Creates user profile in Supabase

2. **Google Sign-In**:
   - Opens Google's OAuth flow in browser
   - Returns to app with user data
   - Creates user profile in Supabase

## 🚨 Important Notes

### Apple Sign-In Requirements
- **iOS 13+**: Apple Sign-In only works on iOS 13 and later
- **Physical Device**: Testing requires a physical iOS device (not simulator)
- **App Store Requirement**: If you offer any third-party sign-in, Apple Sign-In is mandatory

### Security Considerations
- **Never commit client secrets** to version control
- **Use environment variables** for all sensitive configuration
- **Test thoroughly** on both development and production environments

### Troubleshooting

#### Apple Sign-In Issues
- Ensure Apple Developer account is in good standing
- Verify bundle identifier matches exactly
- Check that Sign in with Apple is enabled for your App ID

#### Google Sign-In Issues
- Verify client IDs are correct for each platform
- Check redirect URLs in Google Cloud Console
- Ensure Google+ API is enabled

## 📱 User Experience

With social authentication enabled:
- **Faster Registration**: Users can sign up in seconds
- **Better Security**: Leverage Apple/Google's robust authentication
- **Seamless Experience**: No password management required
- **Higher Conversion**: Studies show 3x higher sign-up rates

## 🔄 Account Linking

The system automatically:
- Creates new user profiles for first-time social sign-ins
- Links social accounts to existing profiles if email matches
- Maintains user data consistency across authentication methods

## 📊 Analytics

Track social authentication success with:
- Sign-up conversion rates by provider
- User preference analytics
- Authentication error monitoring

---

**Need Help?** Check the Expo documentation for Apple Authentication and Google Sign-In, or the Supabase documentation for social authentication providers.

This guide will help you set up Apple Sign-In and Google Sign-In for your GoFitAI app.

## 🍎 Apple Sign-In Setup

### 1. Apple Developer Console Configuration

1. **Go to Apple Developer Console**: https://developer.apple.com/account/
2. **Navigate to**: Certificates, Identifiers & Profiles → Identifiers
3. **Select your App ID**: `com.henrymadeit.gofitai`
4. **Enable Sign in with Apple**:
   - Check "Sign in with Apple" capability
   - Configure as Primary App ID
   - Save changes

### 2. Apple Developer Console - Create Service ID & Key

#### Create a Services ID:
1. **Go to**: Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers
2. **Click**: "+" to create new identifier
3. **Select**: "Services IDs" → Continue
4. **Configure**:
   - **Description**: GoFitAI Sign In
   - **Identifier**: `com.henrymadeit.gofitai.signin` (must be different from your app bundle ID)
   - **Enable**: "Sign in with Apple"
5. **Configure Sign in with Apple**:
   - **Primary App ID**: Select your app ID (`com.henrymadeit.gofitai`)
   - **Web Domain**: `lmfdgnxertwrhbjhrcby.supabase.co`
   - **Return URLs**: `https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback`
6. **Save** and **Continue**

#### Create a Private Key:
1. **Go to**: Apple Developer Console → Keys
2. **Click**: "+" to create new key
3. **Configure**:
   - **Key Name**: GoFitAI Apple Sign In Key
   - **Enable**: "Sign in with Apple"
   - **Configure**: Select your Primary App ID
4. **Download** the `.p8` file (you can only download once!)
5. **Note down**: Key ID (10-character string)

#### Get Your Team ID:
1. **Go to**: Apple Developer Console → Membership
2. **Copy**: Team ID (10-character string)

### 3. Supabase Configuration

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Authentication → Providers
3. **Enable Apple Provider**:
   - Toggle "Enable sign in with Apple"
   - **Client ID**: `com.henrymadeit.gofitai.signin` (your Services ID, NOT your app bundle ID)
   - **Secret Key**: Generate JWT using the script below
   - **Allow users without an email**: Toggle OFF (recommended for better user experience)

### 4. Generate Apple JWT Secret Key

1. **Install JWT dependency**:
   ```bash
   npm install jsonwebtoken
   ```

2. **Update the configuration** in `scripts/generate-apple-jwt.js`:
   ```javascript
   const APPLE_CONFIG = {
     teamId: 'YOUR_10_CHAR_TEAM_ID',        // From Apple Developer Console → Membership
     clientId: 'com.henrymadeit.gofitai.signin', // Your Services ID
     keyId: 'YOUR_10_CHAR_KEY_ID',          // From your created key
     privateKeyPath: './AuthKey_YOUR_KEY_ID.p8' // Path to downloaded .p8 file
   };
   ```

3. **Place your .p8 file** in the project root directory

4. **Generate the JWT**:
   ```bash
   node scripts/generate-apple-jwt.js
   ```

5. **Copy the generated JWT** and paste it into Supabase as the "Secret Key"

## 🚨 Common Issues & Troubleshooting

### Issue 1: "Invalid Client ID" Error
**Problem**: Using app bundle ID instead of Services ID
**Solution**: Make sure you're using `com.henrymadeit.gofitai.signin` (Services ID) as Client ID, NOT `com.henrymadeit.gofitai` (app bundle ID)

### Issue 2: "Invalid JWT" Error  
**Problem**: Incorrect JWT format or expired token
**Solutions**:
- Regenerate JWT using the script above
- Verify your Team ID, Key ID, and .p8 file are correct
- Ensure the .p8 file is properly formatted (starts with `-----BEGIN PRIVATE KEY-----`)

### Issue 3: "Domain Not Verified" Error
**Problem**: Supabase domain not added to Apple Services ID configuration
**Solution**: In Apple Developer Console → Services ID → Configure Sign in with Apple:
- **Web Domain**: `lmfdgnxertwrhbjhrcby.supabase.co`
- **Return URLs**: `https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback`

### Issue 4: Users Can't Sign In
**Problem**: Missing email scope or configuration mismatch
**Solutions**:
- In Supabase, toggle OFF "Allow users without an email"
- Ensure your iOS app requests email scope in the sign-in request

## 🔑 Getting Your Apple Private Key (.p8 file)

**IMPORTANT**: You need to download the Apple private key (.p8 file) from Apple Developer Console to generate the JWT secret.

### Step-by-Step Instructions:

1. **Go to Apple Developer Console**: https://developer.apple.com/account/resources/authkeys/list
2. **Create a new key**:
   - Click the "+" button to create a new key
   - Enter a key name (e.g., "GoFitAI Sign in with Apple")
   - Check "Sign in with Apple" under Key Services
   - Click "Continue" then "Register"
3. **Download the key**:
   - **CRITICAL**: Download the `.p8` file immediately - you can only download it once!
   - Note the Key ID (10-character string like `ABC123DEFG`)
   - Save the file as `AuthKey_[KeyID].p8` in your project root
4. **Update the JWT generator**:
   - Open `scripts/generate-apple-jwt.js`
   - Replace `YOUR_TEAM_ID` with your Team ID (found in Membership section)
   - Replace `YOUR_KEY_ID` with the Key ID from step 3
   - Replace `YOUR_P8_FILE_PATH` with `./AuthKey_[KeyID].p8`

### Example file structure after setup:
```
GoFitAI/
├── AuthKey_ABC123DEFG.p8  ← Your downloaded private key
├── scripts/
│   └── generate-apple-jwt.js  ← Updated with your credentials
└── ...
```

## ✅ Setup Checklist

Before testing Apple Sign-In, verify:

- [ ] **Apple Developer Console**:
  - [ ] App ID created with "Sign in with Apple" capability enabled
  - [ ] Services ID created (`com.henrymadeit.gofitai.signin`)
  - [ ] Services ID configured with Supabase domain and return URL
  - [ ] Private key (.p8) downloaded and Key ID noted
  - [ ] Team ID copied from Membership section

- [ ] **Supabase Configuration**:
  - [ ] Apple provider enabled
  - [ ] Client ID set to Services ID (`com.henrymadeit.gofitai.signin`)
  - [ ] Secret Key set to generated JWT
  - [ ] "Allow users without an email" toggled OFF

- [ ] **iOS App Configuration**:
  - [ ] `expo-apple-authentication` installed
  - [ ] Bundle ID matches Apple Developer Console
  - [ ] Sign-in implementation requests email scope
  - [ ] Apple Sign-In entitlement added to app.json ✅

### 3. iOS Configuration

The Apple Sign-In is already configured in your `app.json`:
```json
"plugins": [
  ["expo-apple-authentication"]
]
```

## 🔍 Google Sign-In Setup

### 1. Google Cloud Console Configuration

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: GoFitAI
3. **Enable Google+ API**:
   - Navigate to APIs & Services → Library
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → OAuth 2.0 Client IDs
   - Create credentials for:
     - **Web application** (for Expo development)
     - **iOS application** (for production iOS app)
     - **Android application** (for production Android app)

### 2. Get Your Client IDs

After creating credentials, you'll get:
- **Web Client ID**: `your-web-client-id.googleusercontent.com`
- **iOS Client ID**: `your-ios-client-id.googleusercontent.com`
- **Android Client ID**: `your-android-client-id.googleusercontent.com`

### 3. Environment Configuration

Add these to your `.env.local` file:
```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.googleusercontent.com
```

### 4. Supabase Configuration

1. **Go to Supabase Dashboard**: Authentication → Providers
2. **Enable Google Provider**:
   - Toggle "Enable sign in with Google"
   - **Client ID**: Use your Web Client ID
   - **Client Secret**: Get from Google Cloud Console
   - **Redirect URL**: Copy the provided URL and add it to Google Cloud Console

### 5. iOS Configuration (for production)

Add to your `ios/GoFitAI/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>GoogleAuth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>your-ios-client-id</string>
    </array>
  </dict>
</array>
```

## 🔧 Testing the Integration

### 1. Development Testing

```bash
# Start the development server
npx expo start --clear

# Test on iOS Simulator or Device
# The Apple Sign-In will only work on physical devices
# Google Sign-In works on both simulator and device
```

### 2. Verify Authentication Flow

1. **Apple Sign-In**:
   - Should show Apple's native sign-in sheet
   - User can choose to share or hide email
   - Creates user profile in Supabase

2. **Google Sign-In**:
   - Opens Google's OAuth flow in browser
   - Returns to app with user data
   - Creates user profile in Supabase

## 🚨 Important Notes

### Apple Sign-In Requirements
- **iOS 13+**: Apple Sign-In only works on iOS 13 and later
- **Physical Device**: Testing requires a physical iOS device (not simulator)
- **App Store Requirement**: If you offer any third-party sign-in, Apple Sign-In is mandatory

### Security Considerations
- **Never commit client secrets** to version control
- **Use environment variables** for all sensitive configuration
- **Test thoroughly** on both development and production environments

### Troubleshooting

#### Apple Sign-In Issues
- Ensure Apple Developer account is in good standing
- Verify bundle identifier matches exactly
- Check that Sign in with Apple is enabled for your App ID

#### Google Sign-In Issues
- Verify client IDs are correct for each platform
- Check redirect URLs in Google Cloud Console
- Ensure Google+ API is enabled

## 📱 User Experience

With social authentication enabled:
- **Faster Registration**: Users can sign up in seconds
- **Better Security**: Leverage Apple/Google's robust authentication
- **Seamless Experience**: No password management required
- **Higher Conversion**: Studies show 3x higher sign-up rates

## 🔄 Account Linking

The system automatically:
- Creates new user profiles for first-time social sign-ins
- Links social accounts to existing profiles if email matches
- Maintains user data consistency across authentication methods

## 📊 Analytics

Track social authentication success with:
- Sign-up conversion rates by provider
- User preference analytics
- Authentication error monitoring

---

**Need Help?** Check the Expo documentation for Apple Authentication and Google Sign-In, or the Supabase documentation for social authentication providers.










