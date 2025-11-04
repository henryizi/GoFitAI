import { supabase } from '../services/supabase/client';

/**
 * Ensures a profile exists for the user before saving onboarding data
 * This is critical for Google sign-in users who might not have a profile created yet
 */
async function ensureProfileExists(userId: string): Promise<boolean> {
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // If profile exists, we're good
    if (existingProfile && !checkError) {
      return true;
    }

    // If error is "not found" (PGRST116), create profile
    if (checkError?.code === 'PGRST116') {
      console.log(`📝 Profile not found for user ${userId}, creating profile...`);
      
      // Get current user metadata to populate profile
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
          avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
          username: user?.email || null,
          onboarding_completed: false 
        });

      if (createError) {
        console.error(`❌ Failed to create profile:`, createError);
        return false;
      }

      console.log(`✅ Profile created successfully for user ${userId}`);
      return true;
    }

    // Other errors
    if (checkError) {
      console.error(`❌ Error checking profile:`, checkError);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Exception while ensuring profile exists:`, error);
    return false;
  }
}

/**
 * Utility function to save onboarding data non-blocking
 * Saves data in the background without blocking navigation
 * Optionally refreshes profile after save completes
 * Now ensures profile exists before saving to fix Google sign-in issue
 */
export function saveOnboardingData(
  savePromise: Promise<{ data: any; error: any }>,
  logMessage: string,
  onComplete?: () => void | Promise<void>,
  userId?: string
): void {
  console.log(`💾 ${logMessage}`);
  
  // If userId is provided, ensure profile exists first
  const saveOperation = userId 
    ? ensureProfileExists(userId)
        .then(async (profileExists) => {
          if (!profileExists) {
            console.warn(`⚠️ Profile doesn't exist for user ${userId}, but continuing save attempt...`);
          }
          // Properly await the save promise
          return await savePromise;
        })
    : savePromise;
  
  // Fire and forget - save in background, don't block navigation
  saveOperation
    .then(async (result) => {
      console.log(`📊 Save result received:`, JSON.stringify(result, null, 2));
      if (result.error) {
        console.error(`❌ Error saving ${logMessage}:`, result.error);
        console.error(`❌ Error code:`, result.error.code);
        console.error(`❌ Error message:`, result.error.message);
        console.error(`❌ Error details:`, JSON.stringify(result.error, null, 2));
        
        // If it's a "not found" error and we have userId, try creating profile and retrying
        if (userId && (result.error.code === 'PGRST116' || result.error.message?.includes('not found'))) {
          console.log(`🔄 Retrying save after ensuring profile exists...`);
          const profileExists = await ensureProfileExists(userId);
          if (profileExists) {
            // Retry the save
            savePromise
              .then((retryResult) => {
                if (retryResult.error) {
                  console.error(`❌ Retry save still failed:`, retryResult.error);
                } else {
                  console.log(`✅ Retry save succeeded:`, retryResult.data);
                }
              })
              .catch((retryError) => {
                console.error(`❌ Retry save exception:`, retryError);
              });
          }
        }
      } else {
        console.log(`✅ Save completed successfully for: ${logMessage}`);
        if (result.data) {
          console.log(`📝 Data saved:`, JSON.stringify(result.data, null, 2));
        }
        // Call optional completion callback (e.g., refresh profile)
        if (onComplete) {
          try {
            await onComplete();
          } catch (error) {
            console.warn('⚠️ Error in onComplete callback:', error);
          }
        }
      }
    })
    .catch((error) => {
      console.error(`❌ Save failed for ${logMessage}:`, error);
      console.error(`❌ Error stack:`, error?.stack);
    });
}

