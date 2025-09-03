/**
 * Test Gemini API directly to debug the 400 error
 */

require('dotenv').config();

const axios = require('axios');

console.log('=== Testing Gemini API Directly ===');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

async function testGeminiAPI() {
  try {
    console.log('\n=== Testing Text Analysis ===');
    
    const messages = [
      {
        role: 'system',
        content: `You are an expert nutritionist. Analyze this food description and provide nutritional information.

CRITICAL REQUIREMENTS:
1. Identify the SPECIFIC food/dish name
2. Estimate realistic nutritional information based on typical serving sizes
3. Be specific about assumptions (e.g., "assuming standard restaurant serving")
4. Focus on accuracy for typical portions

Return ONLY this JSON structure:
{
  "food_name": "Specific food/dish name",
  "calories": 350,
  "protein": 25,
  "carbs": 45,
  "fat": 15,
  "assumptions": "Any assumptions made about portion sizes",
  "confidence": "high|medium|low"
}

Example: If someone says "chicken breast", don't just say "chicken" - be specific. If uncertain, state your assumption clearly.`
      },
      {
        role: 'user',
        content: `Analyze this food: "apple"`
      }
    ];

    // Convert to Gemini format
    let geminiContents = [];
    let systemInstruction = '';

    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      systemInstruction = systemMessage.content;
    }

    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    geminiContents = nonSystemMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const geminiRequestBody = {
      contents: geminiContents,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json'
      }
    };

    if (systemInstruction) {
      geminiRequestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    console.log('Request URL:', geminiUrl);
    console.log('Request body:', JSON.stringify(geminiRequestBody, null, 2));

    const response = await axios.post(
      geminiUrl,
      geminiRequestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('✅ Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('No response from Gemini');
    }

    console.log('✅ Text response:', textResponse);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testGeminiAPI();

