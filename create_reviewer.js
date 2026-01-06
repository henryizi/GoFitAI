
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Ensure env vars are loaded if running locally with dotenv
// Or just use the hardcoded URL/Key if that's easier for this script, 
// but typically we read from process.env. 
// Since I don't have your .env file content, I will use the values from your project structure if available
// or assume they are in the environment.
// 
// To be safe, I'll try to read them from the file system first or ask you to run it with the env vars.
// Actually, for a script like this, I'll use the existing Supabase client setup pattern.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// NOTE: We need the SERVICE_ROLE key to bypass email verification if possible, 
// or we just create it and hope email confirmation is off or we can verify manually.
// Since I don't have the service role key easily, I'll use the standard signup 
// and you might need to confirm it if you have email confirmations on.

async function createReviewerAccount() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const email = 'apple.reviewer@gofitai.com';
  const password = 'Reviewer2024!';

  console.log(`Creating account for ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Apple Reviewer',
        display_name: 'Reviewer',
      }
    }
  });

  if (error) {
    console.error('Error creating account:', error.message);
  } else {
    console.log('Account created successfully!');
    console.log('User ID:', data.user?.id);
    console.log('-------------------------------------------');
    console.log('CREDENTIALS FOR APP REVIEW:');
    console.log('Username:', email);
    console.log('Password:', password);
    console.log('-------------------------------------------');
    
    if (data.session) {
        console.log('Session created automatically (Email confirmation might be off).');
    } else {
        console.log('Check if email confirmation is required in your Supabase dashboard.');
        console.log('If enabled, you may need to manually confirm this user in the Supabase Auth dashboard.');
    }
  }
}

createReviewerAccount();






























