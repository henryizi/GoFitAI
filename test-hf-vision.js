const axios = require('axios');
const fs = require('fs');

const HF_TOKEN = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN;

// Test with actual image data for vision models
const visionModels = [
    'facebook/detr-resnet-50',      // Object detection - showed 400 (needs image)
    'microsoft/resnet-50',          // Classification - showed 400 (needs image)
    'google/vit-base-patch16-224',  // Vision transformer - timed out but exists
    'openai/clip-vit-base-patch32', // CLIP - might work with proper format
    'Salesforce/blip-image-captioning-base' // Captioning - might work
];

async function testModelWithImage(modelId, imagePath) {
    try {
        console.log(`\n🧪 Testing model: ${modelId}`);

        // Read image as base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

        let payload;

        // Different payload formats for different model types
        if (modelId.includes('detr')) {
            // Object detection model
            payload = {
                inputs: imageDataUrl,
                parameters: {
                    threshold: 0.9
                }
            };
        } else if (modelId.includes('resnet')) {
            // Image classification model
            payload = {
                inputs: imageDataUrl
            };
        } else if (modelId.includes('clip')) {
            // CLIP model - needs both image and text
            payload = {
                inputs: {
                    image: imageDataUrl,
                    text: ["food", "meal", "plate", "dish", "restaurant"]
                }
            };
        } else if (modelId.includes('blip')) {
            // Image captioning
            payload = {
                inputs: imageDataUrl,
                parameters: {
                    max_length: 50,
                    num_beams: 4,
                    temperature: 0.7
                }
            };
        } else {
            // Generic vision model
            payload = {
                inputs: imageDataUrl
            };
        }

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${modelId}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000  // Longer timeout for image processing
            }
        );

        console.log(`✅ Model ${modelId} works with images!`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 300)}...`);

        return { modelId, available: true, response: response.data };

    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.response?.data?.message || error.message;

        console.log(`❌ Model ${modelId} failed: ${status} - ${message}`);
        return { modelId, available: false, error: { status, message } };
    }
}

// Also test with text-only models that might work
async function testTextModel(modelId) {
    try {
        console.log(`\n🧪 Testing text model: ${modelId}`);

        const payload = {
            inputs: "Describe a healthy meal with vegetables and protein",
            parameters: {
                max_length: 100,
                temperature: 0.7,
                do_sample: true
            }
        };

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${modelId}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log(`✅ Text model ${modelId} works!`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);

        return { modelId, available: true, response: response.data };

    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.response?.data?.message || error.message;

        console.log(`❌ Text model ${modelId} failed: ${status} - ${message}`);
        return { modelId, available: false, error: { status, message } };
    }
}

async function main() {
    console.log('🔍 Testing Hugging Face models with proper data formats...\n');

    if (!HF_TOKEN) {
        console.error('❌ No Hugging Face token found. Set HF_API_TOKEN or HUGGINGFACE_API_TOKEN environment variable.');
        process.exit(1);
    }

    console.log(`Using token: ${HF_TOKEN.substring(0, 10)}...\n`);

    // Check if test image exists
    const testImagePath = 'test-image.png';
    if (!fs.existsSync(testImagePath)) {
        console.log('❌ Test image not found. Please ensure test-image.png exists in the current directory.');
        console.log('💡 You can use any food image for testing.');
        return;
    }

    console.log('📸 Testing vision models with image data...');
    const visionResults = [];

    for (const modelId of visionModels) {
        const result = await testModelWithImage(modelId, testImagePath);
        visionResults.push(result);

        // Longer delay for image processing
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Also test some text generation models for fallback
    console.log('\n📝 Testing text generation models...');
    const textModels = [
        'microsoft/DialoGPT-medium',
        'gpt2',
        'distilgpt2'
    ];

    const textResults = [];
    for (const modelId of textModels) {
        const result = await testTextModel(modelId);
        textResults.push(result);

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 FINAL RESULTS:');
    console.log('================');

    const availableVisionModels = visionResults.filter(r => r.available);
    const availableTextModels = textResults.filter(r => r.available);

    console.log(`✅ Vision models working: ${availableVisionModels.length}`);
    availableVisionModels.forEach(model => {
        console.log(`   - ${model.modelId}`);
    });

    console.log(`✅ Text models working: ${availableTextModels.length}`);
    availableTextModels.forEach(model => {
        console.log(`   - ${model.modelId}`);
    });

    if (availableVisionModels.length > 0) {
        console.log('\n🎯 RECOMMENDATION:');
        console.log(`✅ YES! You can use Hugging Face!`);
        console.log(`Use ${availableVisionModels[0].modelId} for food analysis`);
        console.log('\nNext steps:');
        console.log('1. Update server/services/visionService.js to use this model');
        console.log('2. Update the image processing logic');
        console.log('3. Test with actual food images');
    } else if (availableTextModels.length > 0) {
        console.log('\n💡 PARTIAL SUCCESS:');
        console.log(`You can use Hugging Face for text-based analysis`);
        console.log(`Consider combining with a different vision service`);
    } else {
        console.log('\n❌ RECOMMENDATION:');
        console.log('Hugging Face models not accessible with current token.');
        console.log('Consider:');
        console.log('1. Cloudflare Workers AI (recommended)');
        console.log('2. OpenRouter API');
        console.log('3. Custom model hosting');
    }
}

main().catch(console.error);
