// Apple Sign-In Diagnostic Script
// Add this to your app temporarily to diagnose the ERR_REQUEST_UNKNOWN issue

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export const runAppleSignInDiagnostic = async () => {
  console.log('🔍 === APPLE SIGN-IN DIAGNOSTIC STARTED ===');
  
  // Step 1: Platform Check
  console.log('📱 Platform:', Platform.OS);
  if (Platform.OS !== 'ios') {
    console.log('❌ Apple Sign-In only works on iOS');
    return;
  }

  // Step 2: Availability Check
  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    console.log('✅ Apple Sign-In Available:', isAvailable);
    
    if (!isAvailable) {
      console.log('❌ ISSUE FOUND: Apple Sign-In not available');
      console.log('   Possible causes:');
      console.log('   - Running on iOS Simulator without Apple ID setup');
      console.log('   - Device not signed into iCloud');
      console.log('   - iOS version < 13.0');
      console.log('   - Missing entitlements');
      return;
    }
  } catch (error) {
    console.log('❌ Error checking availability:', error);
    return;
  }

  // Step 3: Minimal Authentication Test
  console.log('🔍 Testing minimal Apple authentication...');
  
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('✅ SUCCESS: Apple authentication worked!');
    console.log('📋 Credential received:', {
      user: credential.user,
      email: credential.email || 'No email (private relay or first-time)',
      fullName: credential.fullName,
      hasIdentityToken: !!credential.identityToken,
      hasAuthCode: !!credential.authorizationCode,
      tokenLength: credential.identityToken?.length || 0
    });

    console.log('🎉 DIAGNOSIS: Apple Sign-In is working correctly!');
    console.log('   The issue might be in Supabase integration, not Apple auth itself.');

  } catch (error) {
    console.log('❌ FAILED: Apple authentication error');
    console.log('📋 Error details:', {
      code: error.code,
      message: error.message,
      name: error.name
    });

    // Specific error analysis
    switch (error.code) {
      case 'ERR_REQUEST_UNKNOWN':
        console.log('🚨 DIAGNOSIS: ERR_REQUEST_UNKNOWN');
        console.log('   This is a configuration issue. Check:');
        console.log('   1. Apple Developer Console - Services ID configuration');
        console.log('   2. Bundle ID: com.henrymadeit.gofitai');
        console.log('   3. Services ID: com.henrymadeit.gofitai.signin');
        console.log('   4. Return URL: https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback');
        console.log('   5. Device signed into iCloud');
        console.log('   6. Try on physical device instead of simulator');
        break;

      case 'ERR_REQUEST_CANCELED':
        console.log('🚨 DIAGNOSIS: User canceled the request');
        console.log('   This is normal user behavior, not an error');
        break;

      case 'ERR_INVALID_RESPONSE':
        console.log('🚨 DIAGNOSIS: Invalid response from Apple');
        console.log('   Check Apple Developer Console configuration');
        break;

      case 'ERR_REQUEST_FAILED':
        console.log('🚨 DIAGNOSIS: Network or server error');
        console.log('   Check internet connection and Apple services status');
        break;

      default:
        console.log('🚨 DIAGNOSIS: Unknown error');
        console.log('   This might be a new or rare error case');
    }
  }

  console.log('🔍 === APPLE SIGN-IN DIAGNOSTIC COMPLETED ===');
};

// Usage: Call this function in your app to diagnose the issue
// runAppleSignInDiagnostic();




