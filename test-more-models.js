const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testVisionModels() {
    console.log('🔍 Testing additional vision models that should work...\n');

    const token = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN;

    if (!token) {
        console.error('❌ No Hugging Face API token found');
        return;
    }

    // Read test image
    const imagePath = path.join(__dirname, 'test-image.png');
    if (!fs.existsSync(imagePath)) {
        console.error('❌ Test image not found at:', imagePath);
        return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Models that are typically available on HF Inference API
    const models = [
        'Salesforce/blip-image-captioning-base',  // Smaller version that might work
        'nlpconnect/vit-gpt2-image-captioning',   // Another captioning model
        'google/vit-base-patch16-224',           // Vision transformer
        'openai/clip-vit-base-patch32',          // CLIP model
        'microsoft/beit-base-patch16-224-pt22k', // BEiT model
        'facebook/deit-base-distilled-patch16-224' // DeiT model
    ];

    console.log('📸 Using token:', token.substring(0, 10) + '...');

    for (const modelId of models) {
        console.log(`\n🧪 Testing model: ${modelId}`);

        try {
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${modelId}`,
                {
                    inputs: base64Image
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            console.log('✅ Model works successfully!');
            console.log('📝 Response type:', typeof response.data);
            if (Array.isArray(response.data)) {
                console.log('📝 First result:', JSON.stringify(response.data[0], null, 2));
            } else {
                console.log('📝 Response:', JSON.stringify(response.data, null, 2));
            }

        } catch (error) {
            console.error('❌ Model failed:');
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            } else {
                console.error('   Error:', error.message);
            }
        }
    }
}

testVisionModels();
