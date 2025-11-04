# Google OAuth Setup for GoFitAI

## Prerequisites
- Any Google account (Gmail, etc.)
- No special developer status required
- No payment required for basic OAuth setup

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click "Select a project" → "New Project"
4. Enter project name: `GoFitAI` or similar
5. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API" 
3. Click on it and press "Enable"
4. Also enable "Google Identity" if available

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace)
3. Fill in required fields:
   - App name: `GoFitAI`
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. Skip "Scopes" for now (click "Save and Continue")
6. Add test users (your email) if in testing mode
7. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Create **3 separate credentials**:

### Web Application
- Application type: "Web application"
- Name: "GoFitAI Web"
- Authorized redirect URIs: `https://auth.expo.io/@your-expo-username/GoFitAI`

### iOS Application  
- Application type: "iOS"
- Name: "GoFitAI iOS"
- Bundle ID: `com.yourcompany.gofitai` (match your app.json)

### Android Application
- Application type: "Android"  
- Name: "GoFitAI Android"
- Package name: `com.yourcompany.gofitai` (match your app.json)
- SHA-1: Get from `expo credentials:manager` or use development key

## Step 5: Update Your .env File

```bash
# Add these to your .env file
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.googleusercontent.com  
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.googleusercontent.com
```

## Step 6: Test the Setup

```bash
# Run the auth status test
node test-auth-status.js

# Start your app
npx expo start
```

## Important Notes

- **Free**: OAuth setup is completely free
- **Testing**: You can test with up to 100 users before verification
- **Production**: For 100+ users, you'll need Google verification (but still free)
- **No Payment**: Google doesn't charge for OAuth unless you exceed massive quotas

## Troubleshooting

### Common Issues:
1. **"OAuth client not found"** - Check client IDs match exactly
2. **"Redirect URI mismatch"** - Ensure redirect URIs are configured correctly
3. **"App not verified"** - Add your email as a test user

### Getting Bundle ID:
```bash
# Check your current bundle ID
grep -r "bundleIdentifier\|package" app.json eas.json
```

## Security Notes

- Keep client IDs in `.env` file (already in `.gitignore`)
- Web client ID can be public (it's meant to be)
- iOS/Android client IDs should stay private
- Never commit actual client IDs to version control

## Next Steps After Setup

1. Test Google Sign-In in Expo Go
2. Test on physical device
3. Prepare for app store submission
4. Consider Google verification for production (optional, still free)




