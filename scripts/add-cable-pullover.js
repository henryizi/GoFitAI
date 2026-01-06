require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCablePullover() {
  console.log('Adding Cable Pullover exercise to database...');

  // First, check if it already exists
  const { data: existing, error: findError } = await supabase
    .from('exercises')
    .select('id, name')
    .eq('name', 'Cable Pullover')
    .is('plan_id', null) // Only check global exercises (plan_id is null)
    .maybeSingle();

  if (findError) {
    console.error('Error checking for existing exercise:', findError);
    return;
  }

  if (existing) {
    console.log('✅ Cable Pullover already exists in database!');
    console.log(`   ID: ${existing.id}`);
    return;
  }

  // Insert the exercise
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: 'Cable Pullover',
      category: 'isolation',
      muscle_groups: ['chest', 'lats'],
      difficulty: 'intermediate',
      equipment_needed: ['cable machine'],
      description: 'Cable-based pullover exercise targeting chest and lats with constant tension throughout the movement.',
      form_tips: [
        'Set cable at highest position',
        'Use rope attachment or straight bar',
        'Keep slight bend in elbows',
        'Pull cable down and across body',
        'Feel stretch in chest and lats',
        'Control the return to starting position',
        'Maintain core engagement throughout'
      ],
      rpe_recommendation: 7,
      is_custom: false,
      plan_id: null // Global exercise, not tied to a specific plan
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting exercise:', error);
    console.error('   Details:', error.message);
    return;
  }

  console.log('✅ Successfully added Cable Pullover to database!');
  console.log(`   ID: ${data.id}`);
  console.log('   Name:', data.name);
  console.log('   Category:', data.category);
  console.log('   Muscle Groups:', data.muscle_groups?.join(', '));
  console.log('   Equipment:', data.equipment_needed?.join(', '));
}

addCablePullover()
  .then(() => {
    console.log('\n✨ Done! You should now see Cable Pullover in your exercise library.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


























