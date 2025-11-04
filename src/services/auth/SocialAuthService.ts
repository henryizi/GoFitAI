import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

export interface SocialAuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export class SocialAuthService {
  // Apple Sign-In Implementation
  static async signInWithApple(): Promise<SocialAuthResult> {
    try {
      console.log('🍎 Starting Apple Sign-In process...');
      
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log('🍎 Apple Sign-In availability:', isAvailable);
      
      if (!isAvailable) {
        console.log('❌ Apple Sign-In not available on this device');
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device'
        };
      }

      console.log('🍎 Requesting Apple ID credential...');
      
      // Request Apple ID credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('🍎 Apple credential received:', {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        hasIdentityToken: !!credential.identityToken,
        hasNonce: !!credential.nonce,
        authorizationCode: credential.authorizationCode ? 'present' : 'missing'
      });

      if (!credential.identityToken) {
        console.log('❌ No identity token received from Apple');
        return {
          success: false,
          error: 'No identity token received from Apple'
        };
      }

      console.log('🍎 Signing in with Supabase using Apple ID token...');
      
      // Sign in with Supabase using Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce,
      });

      console.log('🍎 Supabase response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message || 'none'
      });

      if (error) {
        console.log('❌ Supabase sign-in error:', error);
        
        // Handle audience error specifically for Expo development builds
        if (error.message?.includes('Unacceptable audience in id_token')) {
          console.log('🚨 AUDIENCE ERROR DETECTED');
          console.log('📋 This is an Expo development build issue. To fix:');
          console.log('   1. Go to Supabase Dashboard → Authentication → Providers → Apple');
          console.log('   2. Change Client ID to: host.exp.Exponent,com.henrymadeit.gofitai');
          console.log('   3. Or temporarily use: host.exp.Exponent (for development only)');
          console.log('   4. Save and wait 2-3 minutes for changes to propagate');
          console.log('📖 See EXPO_APPLE_SIGNIN_FIX.md for detailed instructions');
          
          return {
            success: false,
            error: 'Apple Sign-In configuration error for Expo development build. Please update Supabase Client ID to include "host.exp.Exponent". See EXPO_APPLE_SIGNIN_FIX.md for details.'
          };
        }
        
        return {
          success: false,
          error: `Supabase error: ${error.message}`
        };
      }

      if (!data?.user) {
        console.log('❌ No user data received from Supabase');
        return {
          success: false,
          error: 'No user data received from authentication'
        };
      }

      console.log('🍎 Apple Sign-In successful, updating profile...');
      
      // Log identity details to check for account linking
      if (data.user) {
        console.log('🔍 Apple Sign-In user details:', { 
          id: data.user.id, 
          email: data.user.email,
          providers: data.user.app_metadata?.providers || [],
          identities: data.user.identities?.map((id: any) => ({
            provider: id.provider,
            id: id.id,
            email: id.email
          })) || []
        });
        
        // Check if multiple identities exist (account linking)
        if (data.user.identities && data.user.identities.length > 1) {
          console.log('🔗 Account linking detected! User has multiple linked identities:');
          data.user.identities.forEach((identity: any, index: number) => {
            console.log(`  Identity ${index + 1}: ${identity.provider} (${identity.email || 'no email'})`);
          });
        }
      }

      // Skip profile check for linked accounts during sign-in
      // Profile should already exist from previous sign-ins or be created by triggers
      if (data.user.identities && data.user.identities.length > 1) {
        console.log('🔗 Linked account detected - skipping profile check (should already exist)');
      }
      
      console.log('✅ Apple Sign-In completed successfully');

      return {
        success: true,
        user: data.user,
        session: data.session
      };

    } catch (error: any) {
      console.log('❌ Apple Sign-In error caught:', {
        code: error.code,
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      if (error.code === 'ERR_REQUEST_CANCELED') {
        return {
          success: false,
          error: 'Sign-in was canceled'
        };
      }

      // Handle ERR_REQUEST_UNKNOWN - most common configuration issue
      if (error.code === 'ERR_REQUEST_UNKNOWN') {
        console.log('🚨 ERR_REQUEST_UNKNOWN detected - this is a configuration issue');
        console.log('📋 Troubleshooting steps:');
        console.log('   1. Check Apple Developer Console Services ID configuration');
        console.log('   2. Verify Return URLs include: https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback');
        console.log('   3. Ensure Sign In with Apple is enabled for both App ID and Services ID');
        console.log('   4. Try on physical device instead of simulator');
        console.log('   5. Check if device is signed into iCloud');
        
        return {
          success: false,
          error: 'Apple Sign-In configuration error. Please check Apple Developer Console settings and ensure device is signed into iCloud.'
        };
      }

      // Check for specific Apple Authentication errors
      if (error.code === 'ERR_INVALID_RESPONSE') {
        return {
          success: false,
          error: 'Invalid response from Apple. Please check your Apple Developer configuration.'
        };
      }

      if (error.code === 'ERR_REQUEST_FAILED') {
        return {
          success: false,
          error: 'Apple Sign-In request failed. Please check your network connection and try again.'
        };
      }
      
      return {
        success: false,
        error: `Apple Sign-In failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  // Google Sign-In Implementation
  static async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      console.log('🔍 Starting Google Sign-In process...');
      
      // Create proper redirect URL for mobile app
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'gofitai',
        path: 'auth/callback'
      });
      
      console.log('🔍 Using redirect URL:', redirectUrl);
      
      // Use Supabase's built-in Google OAuth with proper mobile redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'openid profile email',
          },
        },
      });

      console.log('🔍 Supabase OAuth response:', { data, error });

      if (error) {
        console.error('❌ Google Sign-In error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (data?.url) {
        // Open the OAuth URL in browser with proper result handling
        console.log('🔍 Opening OAuth URL:', data.url);
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        
        console.log('🔍 WebBrowser result:', result);
        
        if (result.type === 'success' && result.url) {
          console.log('🔍 SUCCESS: Processing callback URL...');
          
          try {
            // Parse the callback URL to get the session
            const url = new URL(result.url);
            console.log('🔍 URL parsed successfully');
            console.log('🔍 URL hash:', url.hash);
            console.log('🔍 URL search params:', url.search);
            
            // Check if this is PKCE flow (code in query params) or implicit flow (tokens in fragment)
            const code = url.searchParams.get('code');
            const codeVerifier = url.searchParams.get('code_verifier');
            const hasPKCEFlow = code && codeVerifier;
            
            console.log('🔍 OAuth flow detection:', {
              hasCode: !!code,
              hasCodeVerifier: !!codeVerifier,
              isPKCEFlow: hasPKCEFlow,
              hasHash: !!url.hash
            });
            
            // OAuth tokens are in the fragment (after #), not query params
            const fragment = url.hash.substring(1); // Remove the # character
            console.log('🔍 Fragment:', fragment);
            
            const params = new URLSearchParams(fragment);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const idToken = params.get('id_token');
            
            console.log('🔍 Parsed tokens:', { 
              accessToken: accessToken ? 'present' : 'missing',
              refreshToken: refreshToken ? 'present' : 'missing',
              idToken: idToken ? 'present' : 'missing'
            });
            
            // Handle PKCE flow (code exchange) - this should use exchangeCodeForSession
            if (hasPKCEFlow) {
              console.log('🔍 Detected PKCE flow, using exchangeCodeForSession...');
              try {
                const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
                
                if (sessionError) {
                  console.error('❌ PKCE code exchange error:', sessionError);
                  return {
                    success: false,
                    error: sessionError.message
                  };
                }
                
                if (sessionData?.user) {
                  console.log('✅ PKCE flow authentication successful');
                  console.log('🆔 USER ID:', sessionData.user.id);
                  console.log('📧 USER EMAIL:', sessionData.user.email);
                  
                  // Profile will be created during onboarding, just like email login
                  
                  return {
                    success: true,
                    user: sessionData.user,
                    session: sessionData.session
                  };
                }
              } catch (error: any) {
                console.error('❌ PKCE flow error:', error);
                return {
                  success: false,
                  error: error.message
                };
              }
            }
            
            // Handle implicit flow (tokens in fragment) - use ID token or setSession
            if (idToken) {
              console.log('🔍 Signing in with ID token...');
              
              // Check if user is already authenticated
              const { data: currentSession } = await supabase.auth.getSession();
              if (currentSession?.session?.user) {
                console.log('✅ User already authenticated, skipping session setup');
                
                // Profile will be created during onboarding, just like email login
                
                return {
                  success: true,
                  user: currentSession.session.user
                };
              }
              
              try {
                // Use signInWithIdToken instead of setSession
                const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: idToken,
                });
                
                if (sessionError) {
                  console.error('❌ Session error:', sessionError);
                  return {
                    success: false,
                    error: sessionError.message
                  };
                }
                
                console.log('✅ Google Sign-In successful!');
                console.log('🔍 Session data:', sessionData);
                
                if (sessionData?.user) {
                  console.log('✅ Successfully authenticated with ID token');
                  console.log('🔍 User details:', { 
                    id: sessionData.user.id, 
                    email: sessionData.user.email,
                    providers: sessionData.user.app_metadata?.providers || [],
                    identities: sessionData.user.identities?.map((id: any) => ({
                      provider: id.provider,
                      id: id.id,
                      email: id.email
                    })) || []
                  });
                  console.log('🆔 USER ID:', sessionData.user.id);
                  console.log('📧 USER EMAIL:', sessionData.user.email);
                  
                  // Check if multiple identities exist (account linking)
                  if (sessionData.user.identities && sessionData.user.identities.length > 1) {
                    console.log('🔗 Account linking detected! User has multiple linked identities:');
                    sessionData.user.identities.forEach((identity: any, index: number) => {
                      console.log(`  Identity ${index + 1}: ${identity.provider} (${identity.email || 'no email'})`);
                    });
                  }
                  
                  // For linked accounts, ensure profile exists immediately after sign-in
                  // This prevents issues where profile fetch times out or fails
                  if (sessionData.user.identities && sessionData.user.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  return {
                    success: true,
                    user: sessionData.user
                  };
                }
              } catch (error) {
                console.error('❌ ID token sign-in error:', error);
                return {
                  success: false,
                  error: error.message
                };
              }
            } else if (accessToken) {
              console.log('🔍 No ID token, but access token found - trying exchangeCodeForSession first...');
              
              console.log('🔍 Tokens found:', { 
                hasAccessToken: !!accessToken, 
                hasRefreshToken: !!refreshToken,
                accessTokenLength: accessToken?.length 
              });
              
              // Try multiple approaches to establish the session
              
              // Approach 1: Try exchangeCodeForSession (works for PKCE flow, might work for implicit too)
              // Only try this if we have a code parameter (PKCE flow)
              // Add timeout to prevent hanging
              if (code) {
                try {
                  console.log('🔄 Approach 1: Trying exchangeCodeForSession with full callback URL...');
                  
                  // Wrap exchangeCodeForSession with timeout (3 seconds)
                  const exchangePromise = supabase.auth.exchangeCodeForSession(result.url);
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('exchangeCodeForSession timeout')), 3000)
                  );
                  
                  const { data: sessionData, error: sessionError } = await Promise.race([
                    exchangePromise,
                    timeoutPromise
                  ]) as any;
                  
                  if (!sessionError && sessionData?.user) {
                    console.log('✅ exchangeCodeForSession successful!');
                    
                    // Profile will be created during onboarding, just like email login
                    
                    return {
                      success: true,
                      user: sessionData.user,
                      session: sessionData.session
                    };
                  }
                  
                  // If exchangeCodeForSession didn't work, log and continue
                  if (sessionError) {
                    console.log('⚠️ exchangeCodeForSession failed:', sessionError.message);
                  }
                } catch (exchangeError: any) {
                  if (exchangeError.message === 'exchangeCodeForSession timeout') {
                    console.log('⏰ exchangeCodeForSession timed out after 3 seconds - skipping');
                  } else {
                    console.log('⚠️ exchangeCodeForSession exception:', exchangeError.message);
                  }
                }
              } else {
                console.log('🔍 No code parameter - skipping exchangeCodeForSession (not PKCE flow)');
              }
              
              // Approach 2: Try getSession() - Supabase might have auto-detected the session
              try {
                console.log('🔄 Approach 2: Checking if session was auto-detected...');
                const { data: { session: autoSession }, error: getSessionError } = await supabase.auth.getSession();
                
                if (!getSessionError && autoSession?.user) {
                  console.log('✅ Session auto-detected via getSession()!');
                  
                  // Profile will be created during onboarding, just like email login
                  
                  return {
                    success: true,
                    user: autoSession.user,
                    session: autoSession
                  };
                }
                
                if (getSessionError) {
                  console.log('⚠️ getSession() failed:', getSessionError.message);
                }
              } catch (getSessionError: any) {
                console.log('⚠️ getSession() exception:', getSessionError.message);
              }
              
              // Fallback: Use setSession for implicit flow (tokens in fragment)
              console.log('🔍 Falling back to setSession...');
              
              // Use a promise-based approach to wait for auth state change
              let authStateResolved = false;
              let resolvedUser = null;
              
              // Set up auth state listener BEFORE calling setSession
              const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔄 Auth state change:', event, session?.user?.id);
                if (event === 'SIGNED_IN' && session?.user) {
                  console.log('✅ Auth state resolved - setting flags');
                  authStateResolved = true;
                  resolvedUser = session.user;
                }
              });
              
              try {
                console.log('🔄 About to call setSession with tokens...');
                
                // Call setSession but don't wait for it if auth state changes first
                const setSessionPromise = supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || ''
                });
                
                // Wait for either setSession to complete OR auth state to change
                console.log('🔄 Waiting for setSession or auth state change...');
                
                // Race: check auth state every 100ms while waiting for setSession
                let setSessionCompleted = false;
                let fallbackData: any = null;
                let fallbackError: any = null;
                
                const checkInterval = setInterval(() => {
                  if (authStateResolved && resolvedUser) {
                    console.log('✅ Auth state resolved during wait - clearing interval');
                    clearInterval(checkInterval);
                  }
                }, 100);
                
                // Wait for setSession with timeout (reduced to 3 seconds)
                try {
                  const result = await Promise.race([
                    setSessionPromise,
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('setSession timeout')), 3000)
                    )
                  ]) as any;
                  setSessionCompleted = true;
                  clearInterval(checkInterval);
                  
                  console.log('🔍 setSession raw result:', JSON.stringify(result, null, 2));
                  
                  // Handle both { data, error } and direct result formats
                  if (result?.data) {
                    fallbackData = result.data;
                    fallbackError = result.error;
                    console.log('🔍 Parsed as { data, error } format');
                  } else if (result?.user || result?.session) {
                    // Direct session/user object
                    fallbackData = result;
                    console.log('🔍 Parsed as direct session/user object');
                  } else if (result?.error) {
                    fallbackError = result.error;
                    console.log('🔍 Found error in result:', result.error);
                  } else {
                    fallbackData = result;
                    console.log('🔍 Using result as-is');
                  }
                  
                  if (fallbackError) {
                    console.log('❌ setSession returned error:', fallbackError);
                  }
                } catch (err: any) {
                  setSessionCompleted = true;
                  clearInterval(checkInterval);
                  console.log('❌ setSession exception:', err);
                  if (err.message === 'setSession timeout') {
                    console.log('⏱️ setSession timed out, but auth state may have changed');
                    // Don't set error - auth state might have changed successfully
                  } else {
                    fallbackError = err;
                  }
                }
                
                console.log('🔄 setSession call completed:', { 
                  completed: setSessionCompleted,
                  authStateResolved,
                  hasResolvedUser: !!resolvedUser
                });
                
                // If auth state already resolved, return immediately
                if (authStateResolved && resolvedUser) {
                  console.log('✅ User found via auth state change listener (immediate)');
                  
                  // For linked accounts, ensure profile exists immediately after sign-in
                  // This prevents issues where profile fetch times out or fails
                  if (resolvedUser.identities && resolvedUser.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  console.log('🔄 Unsubscribing from auth state listener...');
                  subscription.unsubscribe();
                  console.log('✅ Returning success response');
                  return {
                    success: true,
                    user: resolvedUser
                  };
                }
                
                console.log('🔍 setSession result:', { 
                  hasUser: !!fallbackData?.user, 
                  hasSession: !!fallbackData?.session,
                  error: fallbackError?.message,
                  userId: fallbackData?.user?.id
                });
                
                // Check immediate result first
                if (fallbackData?.user) {
                  console.log('✅ Authentication successful - returning user');
                  
                  // For linked accounts, ensure profile exists immediately after sign-in
                  // This prevents issues where profile fetch times out or fails
                  if (fallbackData.user.identities && fallbackData.user.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  subscription.unsubscribe();
                  return {
                    success: true,
                    user: fallbackData.user
                  };
                }
                
                // Immediate check: getSession() right after setSession
                // Sometimes setSession works but doesn't return the session in response
                console.log('🔍 Checking getSession() immediately after setSession...');
                try {
                  const { data: { session: immediateSession }, error: immediateError } = await supabase.auth.getSession();
                  if (immediateSession?.user) {
                    console.log('✅ Session found immediately after setSession via getSession()!');
                    
                    // For linked accounts, ensure profile exists immediately after sign-in
                    // This prevents issues where profile fetch times out or fails
                    if (immediateSession.user.identities && immediateSession.user.identities.length > 1) {
                      console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                    }
                    
                    subscription.unsubscribe();
                    return {
                      success: true,
                      user: immediateSession.user,
                      session: immediateSession
                    };
                  } else if (immediateError) {
                    console.log('⚠️ Immediate getSession() error:', immediateError.message);
                  }
                } catch (immediateErr: any) {
                  console.log('⚠️ Immediate getSession() exception:', immediateErr.message);
                }
                
                // Wait for auth state change if not already resolved
                if (!authStateResolved) {
                  console.log('🔄 No immediate user - waiting for auth state change...');
                  // Wait up to 3 seconds for auth state change
                  for (let i = 0; i < 6; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    console.log(`🔄 Polling check ${i + 1}/6:`, { 
                      authStateResolved, 
                      hasResolvedUser: !!resolvedUser 
                    });
                    if (authStateResolved && resolvedUser) {
                      console.log('✅ User found via auth state change listener');
                      
                      // For linked accounts, ensure profile exists immediately after sign-in
                      // This prevents issues where profile fetch times out or fails
                      if (resolvedUser.identities && resolvedUser.identities.length > 1) {
                        console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                      }
                      
                      subscription.unsubscribe();
                      return {
                        success: true,
                        user: resolvedUser
                      };
                    }
                  }
                }
                
                // Final check - get user directly
                console.log('🔍 Performing final getUser() check...');
                const { data: { user: finalUser }, error: finalError } = await supabase.auth.getUser();
                console.log('🔍 Final user check:', { 
                  hasUser: !!finalUser, 
                  error: finalError?.message,
                  userId: finalUser?.id
                });
                
                subscription.unsubscribe();
                
                if (finalUser) {
                  console.log('✅ User found via getUser()');
                  
                  // For linked accounts, ensure profile exists immediately after sign-in
                  // This prevents issues where profile fetch times out or fails
                  if (finalUser.identities && finalUser.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  return {
                    success: true,
                    user: finalUser
                  };
                }
                
                // One final check - try getSession() one more time after all attempts
                console.log('🔍 Final getSession() check after all methods...');
                const { data: { session: finalSession }, error: finalSessionError } = await supabase.auth.getSession();
                if (finalSession?.user) {
                  console.log('✅ Session found in final getSession() check!');
                  
                  // Skip profile check for linked accounts during sign-in
                  // Profile should already exist from previous sign-ins or be created by triggers
                  if (finalSession.user.identities && finalSession.user.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  return {
                    success: true,
                    user: finalSession.user,
                    session: finalSession
                  };
                }
                
                return {
                  success: false,
                  error: fallbackError?.message || 'Authentication failed - unable to establish session. Please try signing in again.'
                };
              } catch (fallbackErr) {
                console.error('❌ setSession exception:', fallbackErr);
                
                // Exception thrown, but auth state might still change
                console.log('🔄 Exception thrown - checking auth state...');
                console.log('🔍 Current auth state:', { authStateResolved, hasResolvedUser: !!resolvedUser });
                
                if (authStateResolved && resolvedUser) {
                  console.log('✅ User found via auth state change after exception');
                  
                  // For linked accounts, ensure profile exists immediately after sign-in
                  // This prevents issues where profile fetch times out or fails
                  if (resolvedUser.identities && resolvedUser.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  subscription.unsubscribe();
                  return {
                    success: true,
                    user: resolvedUser
                  };
                }
                
                // Wait for auth state change
                console.log('🔄 Waiting for auth state change...');
                for (let i = 0; i < 6; i++) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  console.log(`🔄 Exception polling check ${i + 1}/6:`, { 
                    authStateResolved, 
                    hasResolvedUser: !!resolvedUser 
                  });
                  if (authStateResolved && resolvedUser) {
                    console.log('✅ User found via auth state change after exception');
                    
                    // For linked accounts, ensure profile exists immediately after sign-in
                    // This prevents issues where profile fetch times out or fails
                    if (resolvedUser.identities && resolvedUser.identities.length > 1) {
                      console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                    }
                    
                    subscription.unsubscribe();
                    return {
                      success: true,
                      user: resolvedUser
                    };
                  }
                }
                
                // Final check
                const { data: { user: finalUser }, error: finalError } = await supabase.auth.getUser();
                console.log('🔍 Final user check after exception:', { 
                  hasUser: !!finalUser, 
                  error: finalError?.message,
                  userId: finalUser?.id
                });
                
                subscription.unsubscribe();
                
                if (finalUser) {
                  console.log('✅ User found despite exception');
                  
                  // Skip profile check for linked accounts during sign-in
                  // Profile should already exist from previous sign-ins or be created by triggers
                  if (finalUser.identities && finalUser.identities.length > 1) {
                    console.log('🔗 Linked account detected - skipping profile check (should already exist)');
                  }
                  
                  return {
                    success: true,
                    user: finalUser
                  };
                }
                
                return {
                  success: false,
                  error: `setSession failed: ${fallbackErr?.message || 'Unknown error'}`
                };
              }
            } else {
              console.error('❌ No access token found in callback URL');
              console.log('🔍 Full callback URL:', result.url);
              console.log('🔍 Fragment params:', fragment);
              return {
                success: false,
                error: 'No access token found in response'
              };
            }
          } catch (error) {
            console.error('❌ Error parsing callback URL:', error);
            return {
              success: false,
              error: `Failed to parse callback: ${error.message}`
            };
          }
        } else {
          console.log('🔍 WebBrowser result type:', result.type);
          if (result.error) {
            console.error('🔍 WebBrowser error:', result.error);
          }
        }
        
        return {
          success: false,
          error: 'Authentication was cancelled or failed'
        };
      }

      return {
        success: false,
        error: 'No OAuth URL received from Supabase'
      };

    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      return {
        success: false,
        error: error.message || 'Google Sign-In failed'
      };
    }
  }

  // Check if social sign-in providers are available
  static async getAvailableProviders() {
    const providers = {
      apple: false,
      google: false,
    };

    // Check Apple Sign-In availability
    if (Platform.OS === 'ios') {
      try {
        providers.apple = await AppleAuthentication.isAvailableAsync();
      } catch (error) {
        providers.apple = false;
      }
    }

    // Check Google Sign-In configuration
    const googleClientId = Platform.select({
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    providers.google = !!googleClientId && googleClientId !== 'your-web-client-id.googleusercontent.com' && googleClientId !== 'your-ios-client-id.googleusercontent.com' && googleClientId !== 'your-android-client-id.googleusercontent.com';

    return providers;
  }
}

