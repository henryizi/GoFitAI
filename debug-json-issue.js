#!/usr/bin/env node

const axios = require('axios');

async function testJsonParsing() {
  console.log('🔍 Testing JSON parsing issue...\n');
  
  try {
    const response = await axios.post('http://192.168.0.116:4000/api/generate-recipe', {
      mealType: 'breakfast',
      targets: { calories: 400, protein: 25, carbs: 30, fat: 15 },
      ingredients: ['eggs', 'bread', 'avocado'],
      strict: false
    }, {
      timeout: 120000 // 2 minutes
    });
    
    console.log('✅ Recipe generated successfully');
    console.log('📝 Recipe name:', response.data.recipe.name);
    console.log('🔢 Nutrition values:', response.data.recipe.nutrition);
    console.log('✨ AI Generated:', response.data.aiGenerated);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out - this is expected during JSON parsing issues');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testJsonParsing();

