console.log('=== Environment Variables Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log('GEMINI_API_KEY first 10 chars:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined');

// Test GeminiVisionService initialization
try {
  const GeminiVisionService = require('./services/geminiVisionService');
  console.log('\n=== Testing GeminiVisionService ===');
  
  if (process.env.GEMINI_API_KEY) {
    const service = new GeminiVisionService(process.env.GEMINI_API_KEY);
    console.log('✅ GeminiVisionService initialized successfully');
  } else {
    console.log('❌ GEMINI_API_KEY not found in environment');
  }
} catch (error) {
  console.error('❌ Error initializing GeminiVisionService:', error.message);
}

console.log('\n=== All Environment Variables ===');
Object.keys(process.env).forEach(key => {
  if (key.includes('API') || key.includes('KEY') || key.includes('TOKEN')) {
    console.log(`${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  }
});























































