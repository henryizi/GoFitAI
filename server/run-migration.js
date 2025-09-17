const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
    try {
        // Initialize Supabase client with service key for admin access
        const supabaseUrl = 'https://lmfdgnxertwrhbjhrcby.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_KEY environment variable not found');
        }
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        console.log('🔧 Checking if metabolic_calculations column exists...');
        
        // First, let's check if the column already exists by trying to select from it
        const { data: testData, error: testError } = await supabase
            .from('nutrition_plans')
            .select('metabolic_calculations')
            .limit(1);
            
        if (testError && testError.code === 'PGRST116') {
            console.log('❌ Column does not exist. This confirms we need to add it.');
            console.log('🚨 ERROR: The metabolic_calculations column is missing from the nutrition_plans table.');
            console.log('');
            console.log('📋 MANUAL STEPS REQUIRED:');
            console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
            console.log('2. Navigate to your project: lmfdgnxertwrhbjhrcby');
            console.log('3. Go to the SQL Editor');
            console.log('4. Run this SQL command:');
            console.log('');
            console.log('   ALTER TABLE public.nutrition_plans');
            console.log('   ADD COLUMN IF NOT EXISTS metabolic_calculations JSONB;');
            console.log('');
            console.log('5. After running the SQL, redeploy the application');
            console.log('');
            process.exit(1);
        } else if (testError) {
            console.error('❌ Unexpected error checking column:', testError);
            process.exit(1);
        } else {
            console.log('✅ Column already exists! No migration needed.');
            console.log('📊 Sample data:', testData);
        }
        
    } catch (error) {
        console.error('💥 Migration script failed:', error.message);
        process.exit(1);
    }
}

runMigration();
