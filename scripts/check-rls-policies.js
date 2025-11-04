// Script to check RLS policies for profiles table
// This helps diagnose why profile fetching might fail for linked accounts

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure you have EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for profiles table...\n');

  try {
    // Check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT 
            tablename,
            rowsecurity as rls_enabled
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles';
        `
      });

    if (rlsError) {
      console.log('⚠️ Cannot check RLS status via RPC, trying alternative method...\n');
    } else {
      console.log('📊 RLS Status:', rlsStatus);
    }

    // Check policies using information_schema
    const { data: policies, error: policiesError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'profiles'
          ORDER BY policyname;
        `
      });

    if (policiesError) {
      console.log('⚠️ Cannot check policies via RPC, trying direct query...\n');
      
      // Alternative: Use raw SQL if RPC doesn't work
      console.log('\n📋 Expected RLS Policies for profiles table:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('✅ SELECT Policy:');
      console.log('   Name: "Users can view their own profile"');
      console.log('   Command: SELECT');
      console.log('   Using: auth.uid() = id');
      console.log('');
      console.log('✅ INSERT Policy:');
      console.log('   Name: "Users can insert their own profile"');
      console.log('   Command: INSERT');
      console.log('   With Check: auth.uid() = id');
      console.log('');
      console.log('✅ UPDATE Policy:');
      console.log('   Name: "Users can update their own profile"');
      console.log('   Command: UPDATE');
      console.log('   Using: auth.uid() = id');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    } else {
      console.log('📋 Current RLS Policies:');
      console.log(JSON.stringify(policies, null, 2));
    }

    // Check for potential issues
    console.log('\n🔍 Potential Issues to Check:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. ⚠️  Linked Accounts Issue:');
    console.log('   When accounts are linked (Google + Apple), auth.uid() should match the profile id.');
    console.log('   However, there might be a timing issue where Supabase needs time to sync.');
    console.log('');
    console.log('2. ⚠️  Profile ID Mismatch:');
    console.log('   If profile was created with user ID A, but account linking changed user ID to B,');
    console.log('   the profile won\'t be found. Supabase should preserve primary account ID, but');
    console.log('   this can happen if linking happened incorrectly.');
    console.log('');
    console.log('3. ⚠️  RLS Policy Missing:');
    console.log('   If policies don\'t exist, users won\'t be able to read their own profiles.');
    console.log('   Run the setup-profiles.sql script to create them.');
    console.log('');
    console.log('4. ⚠️  auth.uid() Returns NULL:');
    console.log('   If the session isn\'t properly authenticated, auth.uid() returns NULL,');
    console.log('   and RLS policies will block all access.');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Test query to see if we can access profiles (requires service key)
    console.log('🧪 Testing profile access with service key (should bypass RLS)...');
    const { data: testProfiles, error: testError } = await supabaseAdmin
      .from('profiles')
      .select('id, onboarding_completed')
      .limit(5);

    if (testError) {
      console.error('❌ Error accessing profiles:', testError);
    } else {
      console.log(`✅ Found ${testProfiles?.length || 0} profiles (service key bypasses RLS)`);
      if (testProfiles && testProfiles.length > 0) {
        console.log('Sample profile IDs:', testProfiles.map(p => p.id).slice(0, 3));
      }
    }

    console.log('\n💡 Recommendations:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. Verify RLS policies are correctly set up in Supabase Dashboard:');
    console.log('   → Go to Authentication > Policies');
    console.log('   → Check profiles table has the 3 policies listed above');
    console.log('');
    console.log('2. For linked accounts, add more retry logic (already implemented)');
    console.log('   → Current retry: 1s, 2s, 3s delays');
    console.log('   → Current timeout: 15s for linked accounts');
    console.log('');
    console.log('3. Add logging to verify auth.uid() matches profile id:');
    console.log('   → Log auth.uid() from session');
    console.log('   → Log profile id from database');
    console.log('   → Compare them to ensure they match');
    console.log('');
    console.log('4. If profile doesn\'t exist, check if user needs to complete onboarding');
    console.log('   → New users without profiles should go to onboarding');
    console.log('   → This is expected behavior');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error checking RLS policies:', error);
  }
}

checkRLSPolicies();


