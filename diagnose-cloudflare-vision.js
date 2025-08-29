// Cloudflare Workers AI Vision Diagnostic Script
const axios = require('axios');

class CloudflareVisionDiagnostic {
    constructor() {
        this.accountId = process.env.CF_ACCOUNT_ID;
        this.apiToken = process.env.CF_API_TOKEN;
        this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai`;

        // Common vision models to test
        this.visionModels = [
            '@cf/llava-hf/llava-1.5-7b-hf',
            '@cf/meta/llama-3.2-90b-vision-instruct',
            '@cf/unum/uform-gen2-qwen-500m',
            '@cf/openai/whisper',
            '@cf/runwayml/stable-diffusion-v1-5-inpainting'
        ];

        console.log('🔍 CLOUDFLARE WORKERS AI VISION DIAGNOSTIC');
        console.log('==========================================');
    }

    async runDiagnostics() {
        console.log('\n📋 Current Configuration:');
        console.log(`   Account ID: ${this.accountId ? this.accountId.substring(0, 8) + '...' : 'NOT SET'}`);
        console.log(`   API Token: ${this.apiToken ? 'Set (length: ' + this.apiToken.length + ')' : 'NOT SET'}`);
        console.log(`   Base URL: ${this.baseURL}`);

        if (!this.accountId || !this.apiToken) {
            console.log('\n❌ MISSING CONFIGURATION');
            console.log('   Please set CF_ACCOUNT_ID and CF_API_TOKEN environment variables');
            this.printSetupInstructions();
            return;
        }

        // Test account access
        const accountAccess = await this.testAccountAccess();
        if (!accountAccess) {
            console.log('\n❌ ACCOUNT ACCESS FAILED');
            this.printAccountFixInstructions();
            return;
        }

        // Test available models
        const availableModels = await this.testAvailableModels();

        // Test vision models specifically
        await this.testVisionModels(availableModels);

        // Provide recommendations
        this.provideRecommendations(availableModels);
    }

    async testAccountAccess() {
        console.log('\n🔐 Testing Account Access...');

        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.success) {
                console.log('✅ Account access successful');
                console.log(`   Found ${response.data.result.length} total models`);
                return true;
            } else {
                console.log('❌ Account access failed:', response.data.errors);
                return false;
            }
        } catch (error) {
            console.log('❌ Account access error:', error.response?.data?.errors || error.message);
            return false;
        }
    }

    async testAvailableModels() {
        console.log('\n🤖 Testing Available Models...');

        const availableModels = [];

        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data.success && response.data.result) {
                const models = response.data.result;

                // Check for vision models
                const visionModels = models.filter(model =>
                    model.name.toLowerCase().includes('vision') ||
                    model.name.toLowerCase().includes('llava') ||
                    model.name.toLowerCase().includes('llama') ||
                    model.name.toLowerCase().includes('uform')
                );

                console.log(`✅ Found ${models.length} total models`);
                console.log(`✅ Found ${visionModels.length} vision-capable models:`);

                visionModels.forEach(model => {
                    console.log(`   - ${model.name} (${model.description || 'No description'})`);
                    availableModels.push(model.name);
                });

                return availableModels;
            }
        } catch (error) {
            console.log('❌ Failed to fetch models:', error.message);
        }

        return availableModels;
    }

    async testVisionModels(availableModels) {
        console.log('\n🖼️  Testing Vision Models...');

        const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R8VgO2JdE2s1WJ9T6HG5QVF3Jd6KzNx1K1MqO2dLxZM2pK6NyJpJcO';
        const testPrompt = 'Describe this image briefly.';

        for (const model of this.visionModels) {
            console.log(`\n   Testing ${model}...`);

            try {
                const response = await axios.post(
                    `${this.baseURL}/run/${model}`,
                    {
                        image: testImage,
                        prompt: testPrompt,
                        max_tokens: 100
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000
                    }
                );

                console.log(`   ✅ ${model} - SUCCESS`);
                return model; // Return first working model

            } catch (error) {
                const errorCode = error.response?.data?.errors?.[0]?.code;
                const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;

                console.log(`   ❌ ${model} - FAILED (${errorCode}): ${errorMessage}`);
            }
        }

        return null;
    }

    provideRecommendations(availableModels) {
        console.log('\n🎯 RECOMMENDATIONS');

        if (availableModels.length === 0) {
            console.log('\n❌ No vision models available');
            console.log('   Possible solutions:');
            console.log('   1. Upgrade to Cloudflare paid plan');
            console.log('   2. Enable Workers AI for your account');
            console.log('   3. Switch to alternative vision provider (OpenAI, Anthropic)');
        } else {
            console.log('\n✅ Vision models found! Recommended actions:');
            console.log('   1. Update CF_VISION_MODEL to one of the working models');
            console.log('   2. Test the model with your actual use case');
            console.log('   3. Implement fallback to alternative models if needed');
        }

        console.log('\n🔧 Quick Fix Commands:');
        if (availableModels.includes('@cf/llava-hf/llava-1.5-7b-hf')) {
            console.log('   railway variables set CF_VISION_MODEL="@cf/llava-hf/llava-1.5-7b-hf"');
        } else if (availableModels.includes('@cf/meta/llama-3.2-90b-vision-instruct')) {
            console.log('   railway variables set CF_VISION_MODEL="@cf/meta/llama-3.2-90b-vision-instruct"');
        } else if (availableModels.includes('@cf/unum/uform-gen2-qwen-500m')) {
            console.log('   railway variables set CF_VISION_MODEL="@cf/unum/uform-gen2-qwen-500m"');
        }
    }

    printSetupInstructions() {
        console.log('\n📋 SETUP INSTRUCTIONS');
        console.log('1. Get your Cloudflare Account ID:');
        console.log('   - Go to https://dash.cloudflare.com/');
        console.log('   - Copy Account ID from right sidebar');
        console.log('');
        console.log('2. Create API Token:');
        console.log('   - Go to https://dash.cloudflare.com/profile/api-tokens');
        console.log('   - Click "Create Token"');
        console.log('   - Use "Workers AI" template or create custom token');
        console.log('   - Set permissions: Workers AI:Edit, Account:Read');
        console.log('');
        console.log('3. Set Environment Variables:');
        console.log('   railway variables set CF_ACCOUNT_ID="your_account_id"');
        console.log('   railway variables set CF_API_TOKEN="your_api_token"');
        console.log('   railway variables set CF_VISION_MODEL="@cf/llava-hf/llava-1.5-7b-hf"');
    }

    printAccountFixInstructions() {
        console.log('\n🔧 ACCOUNT ACCESS FIX');
        console.log('1. Verify Account ID is correct');
        console.log('2. Check API Token has Workers AI permissions:');
        console.log('   - Go to https://dash.cloudflare.com/profile/api-tokens');
        console.log('   - Find your token and verify "Workers AI: Edit" permission');
        console.log('3. Ensure account is on paid plan (Workers AI requires paid tier)');
        console.log('4. Enable Workers AI in your Cloudflare dashboard');
    }
}

// Run diagnostics if environment variables are available
async function main() {
    const diagnostic = new CloudflareVisionDiagnostic();

    // Check if we have minimal config
    if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN) {
        console.log('\n⚠️  Environment variables not set locally.');
        console.log('   This diagnostic works best when run on Railway or with local env vars.');
        console.log('   Please set CF_ACCOUNT_ID and CF_API_TOKEN first.\n');

        diagnostic.printSetupInstructions();
        return;
    }

    await diagnostic.runDiagnostics();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CloudflareVisionDiagnostic;
