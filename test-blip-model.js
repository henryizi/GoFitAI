const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testBLIPModel() {
    console.log('🔍 Testing Salesforce/blip-image-captioning-large model...\n');

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

    const modelId = 'Salesforce/blip-image-captioning-large';

    console.log('🧪 Testing model:', modelId);
    console.log('📸 Using token:', token.substring(0, 10) + '...');

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
                timeout: 60000
            }
        );

        console.log('✅ Model works successfully!');
        console.log('📝 Response:', JSON.stringify(response.data, null, 2));

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

testBLIPModel();
