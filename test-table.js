const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testTable() {
  try {
    console.log('Testing meal_plan_suggestions table...');
    const { data, error } = await supabase
      .from('meal_plan_suggestions')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Table error:', error.message);
      console.log('Full error:', error);
      return;
    }

    console.log('✅ Table exists! Found', data.length, 'rows');

    // Try to insert a test row to see if schema is correct
    const testData = {
      nutrition_plan_id: '84065a24-14da-44f0-8521-16cd3ae82877',
      suggestion_date: '2025-09-13',
      meal_type: 'test',
      recipe_name: 'Test Recipe',
      prep_time: 5,
      cook_time: 10,
      servings: 1,
      ingredients: '["test ingredient"]',
      instructions: '["test instruction"]',
      calories: 100,
      protein_grams: 10,
      carbs_grams: 10,
      fat_grams: 5
    };

    const { data: insertData, error: insertError } = await supabase
      .from('meal_plan_suggestions')
      .insert(testData)
      .select();

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('Full insert error:', insertError);
    } else {
      console.log('✅ Test insert successful!');
      console.log('Inserted row:', insertData);

      // Clean up test data
      await supabase
        .from('meal_plan_suggestions')
        .delete()
        .eq('meal_type', 'test');
    }

  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }
}

testTable();

