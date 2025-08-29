import 'dotenv/config';
import fetch from 'node-fetch';

async function testLLaVA() {
  const CF_API_TOKEN = process.env.CF_API_TOKEN;
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_VISION_MODEL = process.env.CF_VISION_MODEL;

  if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !CF_VISION_MODEL) {
    console.error('Missing environment variables. Please check your .env file.');
    return;
  }

  console.log('🧪 Testing Cloudflare Workers AI LLaVA Model...\n');

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_VISION_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'What food items do you see in this image? Please provide a detailed nutritional analysis including estimated calories, macronutrients, and portion sizes.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/vAAx//Z'
                  }
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Error details:', errorData);
      return;
    }

    const data = await response.json();
    console.log('✅ Success! LLaVA model is working.');
    console.log('Response:', data.result?.response || 'No response content');

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your API token has Workers AI permissions');
    console.log('3. Confirm your Account ID is correct');
    console.log('4. Ensure the model name is valid');
  }
}

testLLaVA();
