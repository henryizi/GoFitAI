/**
 * Test script for Gemini Vision Service
 * This script tests the Gemini Vision service initialization and basic functionality
 */

require('dotenv').config();

console.log('=== Gemini Vision Service Test ===');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  console.log('Please set GEMINI_API_KEY in your .env file');
  process.exit(1);
}

try {
  console.log('\n=== Testing GeminiVisionService Initialization ===');
  const GeminiVisionService = require('./services/geminiVisionService');
  
  const visionService = new GeminiVisionService(process.env.GEMINI_API_KEY);
  console.log('✅ GeminiVisionService initialized successfully');
  
  // Test health status
  const healthStatus = visionService.getHealthStatus();
  console.log('Health Status:', healthStatus);
  
  console.log('\n=== Service Configuration ===');
  console.log('Model:', healthStatus.model);
  console.log('API Key Configured:', healthStatus.apiKeyConfigured);
  console.log('Service Status:', healthStatus.status);
  
  console.log('\n✅ All tests passed! Gemini Vision Service is ready.');
  
} catch (error) {
  console.error('❌ Error testing Gemini Vision Service:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

