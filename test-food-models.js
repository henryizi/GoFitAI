const axios = require('axios');

const HF_TOKEN = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN;

// Better food/vision models that are more likely to work
const foodVisionModels = [
    'nlpconnect/vit-gpt2-image-captioning',
    'microsoft/DialoGPT-medium',
    'facebook/blenderbot-400M-distill',
    'microsoft/DialoGPT-small'
];

async function testModel(modelId, imageInput = null) {
    try {
        console.log(`\n🧪 Testing model: ${modelId}`);

        let payload;
        let contentType = 'application/json';

        // Different payload formats for different model types
        if (modelId.includes('vit-gpt2-image-captioning')) {
            // Image captioning model
            if (imageInput) {
                payload = {
                    inputs: imageInput,
                    parameters: {
                        max_length: 50,
                        num_beams: 4,
                        temperature: 0.7
                    }
                };
            } else {
                payload = {
                    inputs: "A photo of food on a plate",
                    parameters: {
                        max_length: 50,
                        num_beams: 4,
                        temperature: 0.7
                    }
                };
            }
        } else if (modelId.includes('DialoGPT') || modelId.includes('blenderbot')) {
            // Text generation models
            payload = {
                inputs: "What kind of food is this?",
                parameters: {
                    max_length: 100,
                    temperature: 0.7,
                    do_sample: true
                }
            };
        } else {
            // Generic format
            payload = {
                inputs: "Analyze this food image",
                parameters: {
                    max_length: 100,
                    temperature: 0.7
                }
            };
        }

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${modelId}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': contentType
                },
                timeout: 30000
            }
        );

        console.log(`✅ Model ${modelId} is available`);
        console.log(`   Response preview: ${JSON.stringify(response.data).substring(0, 200)}...`);

        return { modelId, available: true, response: response.data };

    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.response?.data?.message || error.message;

        console.log(`❌ Model ${modelId} failed: ${status} - ${message}`);
        return { modelId, available: false, error: { status, message } };
    }
}

async function testAllModels() {
    console.log('🔍 Testing food analysis models...\n');

    if (!HF_TOKEN) {
        console.error('❌ No Hugging Face token found. Set HF_API_TOKEN or HUGGINGFACE_API_TOKEN environment variable.');
        process.exit(1);
    }

    console.log(`Using token: ${HF_TOKEN.substring(0, 10)}...\n`);

    const results = [];

    for (const modelId of foodVisionModels) {
        const result = await testModel(modelId);
        results.push(result);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
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
        console.log('\nTo update the server, run:');
        console.log(`railway variables --set "FOOD_ANALYZE_PROVIDER=huggingface"`);
    } else {
        console.log('\n💡 RECOMMENDATION:');
        console.log('Set up Cloudflare Workers AI instead:');
        console.log('./setup-cloudflare.sh');
    }
}

testAllModels().catch(console.error);
