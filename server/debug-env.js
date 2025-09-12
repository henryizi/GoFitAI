console.log('=== Environment Variables Debug ===');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log('GEMINI_API_KEY first 10 chars:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined');
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

