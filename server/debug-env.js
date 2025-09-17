// Load environment variables like the main server does
const path = require('path');
const dotenv = require('dotenv');

// Load root .env first
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Then load server/.env to override if needed
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('=== Environment Variables Debug ===');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log('GEMINI_API_KEY first 10 chars:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined');
console.log('EXPO_PUBLIC_GEMINI_API_KEY exists:', !!process.env.EXPO_PUBLIC_GEMINI_API_KEY);
console.log('FOOD_ANALYZE_PROVIDER:', process.env.FOOD_ANALYZE_PROVIDER);

// Test GeminiVisionService initialization
console.log('\n=== Testing GeminiVisionService ===');
const GeminiVisionService = require('./services/geminiVisionService');

if (process.env.GEMINI_API_KEY) {
  try {
    const service = new GeminiVisionService(process.env.GEMINI_API_KEY);
    console.log('✅ GeminiVisionService initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing GeminiVisionService:', error.message);
  }
} else {
  console.error('❌ GEMINI_API_KEY not found in environment');
}

