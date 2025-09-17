const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateMealPlanSuggestionsTable() {
  console.log('Starting migration of meal_plan_suggestions table...');

  try {
    // First, check if table exists by trying to select from it
    const { error: tableCheckError } = await supabase
      .from('meal_plan_suggestions')
      .select('*')
      .limit(1);

    if (tableCheckError && tableCheckError.code === 'PGRST116') {
      console.log('Table meal_plan_suggestions does not exist.');
      console.log('Please run the following SQL commands in your Supabase SQL editor:');
      console.log(`
CREATE TABLE meal_plan_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  suggestion_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  recipe_name VARCHAR(255),
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  ingredients TEXT,
  instructions TEXT,
  meal_description TEXT,
  calories INTEGER,
  protein_grams DECIMAL(5,1),
  carbs_grams DECIMAL(5,1),
  fat_grams DECIMAL(5,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nutrition_plan_id, suggestion_date, meal_type)
);

CREATE INDEX idx_meal_suggestion_plan_date ON meal_plan_suggestions(nutrition_plan_id, suggestion_date);
      `);
      return;
    }

    console.log('Table exists. Now testing if we can insert with the expected columns...');

    // Try to insert a test record with all the expected columns
    const testInsert = await supabase
      .from('meal_plan_suggestions')
      .insert({
        nutrition_plan_id: '00000000-0000-0000-0000-000000000000',
        suggestion_date: '2000-01-01',
        meal_type: 'test',
        recipe_name: 'test recipe',
        prep_time: 5,
        cook_time: 10,
        servings: 1,
        ingredients: '["test ingredient"]',
        instructions: '["test instruction"]',
        calories: 100,
        protein_grams: 10,
        carbs_grams: 20,
        fat_grams: 5
      });

    if (testInsert.error) {
      console.log('Insert failed. Missing columns detected. Please run these SQL commands in Supabase:');
      console.log(`
ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS recipe_name VARCHAR(255);
ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS prep_time INTEGER;
ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS cook_time INTEGER;
ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS servings INTEGER;
ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE meal_plan_suggestions ADD COLUMN IF NOT EXISTS instructions TEXT;
      `);
      console.log('Error details:', testInsert.error);
    } else {
      console.log('✅ All required columns exist! The table is ready for meal plan insertions.');
      // Clean up test record
      await supabase
        .from('meal_plan_suggestions')
        .delete()
        .eq('nutrition_plan_id', '00000000-0000-0000-0000-000000000000');
    }

  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateMealPlanSuggestionsTable();
