const axios = require('axios');

const HF_TOKEN = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN;

// Test different vision models that might be available
const visionModels = [
    'google/vit-base-patch16-224',
    'facebook/detr-resnet-50',
    'microsoft/resnet-50',
    'openai/clip-vit-base-patch32',
    'Salesforce/blip-image-captioning-base',
    'microsoft/DialoGPT-medium',
    'microsoft/DialoGPT-small'
];

async function testModel(modelId) {
    try {
        console.log(`\n🧪 Testing model: ${modelId}`);

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${modelId}`,
            {
                inputs: "What is this?",
                options: { wait_for_model: true }
            },
            {
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`✅ Model ${modelId} is available`);
        return { modelId, available: true, response: response.data };

    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;

        console.log(`❌ Model ${modelId} failed: ${status} - ${message}`);
        return { modelId, available: false, error: { status, message } };
    }
}

async function testAllModels() {
    console.log('🔍 Testing available Hugging Face models...\n');

    if (!HF_TOKEN) {
        console.error('❌ No Hugging Face token found. Set HF_API_TOKEN or HUGGINGFACE_API_TOKEN environment variable.');
        process.exit(1);
    }

    console.log(`Using token: ${HF_TOKEN.substring(0, 10)}...\n`);

    const results = [];

    for (const modelId of visionModels) {
        const result = await testModel(modelId);
        results.push(result);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📊 SUMMARY:');
    console.log('===========');

    const availableModels = results.filter(r => r.available);
    const failedModels = results.filter(r => !r.available);

    console.log(`✅ Available models: ${availableModels.length}`);
    availableModels.forEach(model => {
        console.log(`   - ${model.modelId}`);
    });

    console.log(`❌ Failed models: ${failedModels.length}`);
    failedModels.forEach(model => {
        console.log(`   - ${model.modelId} (${model.error.status})`);
    });

    if (availableModels.length > 0) {
        console.log('\n🎯 RECOMMENDATION:');
        console.log(`Update your visionService.js to use: ${availableModels[0].modelId}`);
    }
}

testAllModels().catch(console.error);
