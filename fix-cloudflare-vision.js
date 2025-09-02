#!/usr/bin/env node

// Cloudflare Workers AI Vision Fix Script
const axios = require('axios');
const { execSync } = require('child_process');

class CloudflareVisionFix {
    constructor() {
        this.accountId = process.env.CF_ACCOUNT_ID;
        this.apiToken = process.env.CF_API_TOKEN;
        this.visionModel = process.env.CF_VISION_MODEL;

        console.log('🔧 CLOUDFLARE WORKERS AI VISION FIX');
        console.log('=====================================');
    }

    async runFix() {
        console.log('\n📋 Step 1: Checking Environment Configuration...');

        if (!this.accountId || !this.apiToken) {
            console.log('❌ Missing CF_ACCOUNT_ID or CF_API_TOKEN');
            this.showSetupInstructions();
            return;
        }

        console.log(`✅ Account ID: ${this.accountId.substring(0, 8)}...`);
        console.log(`✅ API Token: Set (length: ${this.apiToken.length})`);
        console.log(`ℹ️  Current Vision Model: ${this.visionModel || 'Not set'}`);

        console.log('\n📋 Step 2: Testing Account Access...');
        const accountTest = await this.testAccountAccess();

        if (!accountTest.success) {
            console.log('❌ Account access failed');
            this.showAccountFixInstructions();
            return;
        }

        console.log('\n📋 Step 3: Discovering Available Models...');
        const modelsTest = await this.testAvailableModels();

        if (modelsTest.availableModels.length === 0) {
            console.log('❌ No vision models available for your account');
            this.showUpgradeInstructions();
            return;
        }

        console.log('\n📋 Step 4: Testing Vision Models...');
        const workingModel = await this.findWorkingModel(modelsTest.availableModels);

        if (!workingModel) {
            console.log('❌ No working vision models found');
            this.showAlternativeInstructions();
            return;
        }

        console.log('\n📋 Step 5: Applying Configuration...');
        await this.applyConfiguration(workingModel);

        console.log('\n📋 Step 6: Testing Final Configuration...');
        const finalTest = await this.testFinalConfiguration(workingModel);

        if (finalTest.success) {
            console.log('\n🎉 SUCCESS! Your Cloudflare Workers AI is now working!');
            this.showSuccessMessage(workingModel);
        } else {
            console.log('\n❌ Final test failed. Manual intervention required.');
            this.showManualFixInstructions();
        }
    }

    async testAccountAccess() {
        try {
            const response = await axios.get(
                `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/models`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data.success) {
                console.log(`✅ Account access successful - Found ${response.data.result.length} models`);
                return { success: true, models: response.data.result };
            } else {
                console.log('❌ Account access failed:', response.data.errors);
                return { success: false, error: response.data.errors };
            }
        } catch (error) {
            console.log('❌ Account access error:', error.response?.data?.errors || error.message);
            return { success: false, error: error.message };
        }
    }

    async testAvailableModels() {
        const visionKeywords = ['vision', 'llava', 'llama', 'uform', 'whisper'];
        const availableModels = [];

        try {
            const response = await axios.get(
                `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/models`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data.success && response.data.result) {
                const models = response.data.result;

                // Find vision-capable models
                models.forEach(model => {
                    const modelName = model.name.toLowerCase();
                    const hasVision = visionKeywords.some(keyword => modelName.includes(keyword));

                    if (hasVision) {
                        availableModels.push(model.name);
                        console.log(`   ✅ Found: ${model.name}`);
                    }
                });

                console.log(`\n📊 Total models: ${models.length}, Vision models: ${availableModels.length}`);
                return { availableModels, allModels: models };
            }
        } catch (error) {
            console.log('❌ Failed to fetch models:', error.message);
        }

        return { availableModels: [], allModels: [] };
    }

    async findWorkingModel(availableModels) {
        const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R8VgO2JdE2s1WJ9T6HG5QVF3Jd6KzNx1K1MqO2dLxZM2pK6NyJpJcO';
        const testPrompt = 'Describe this image briefly.';

        for (const model of availableModels) {
            console.log(`   Testing ${model}...`);

            try {
                const response = await axios.post(
                    `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`,
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

                console.log(`   ✅ ${model} - WORKING!`);
                return model;

            } catch (error) {
                const errorCode = error.response?.data?.errors?.[0]?.code;
                console.log(`   ❌ ${model} - Failed (${errorCode})`);
            }
        }

        return null;
    }

    async applyConfiguration(workingModel) {
        console.log(`\n🔧 Setting CF_VISION_MODEL to: ${workingModel}`);

        try {
            // Set the vision model
            execSync(`railway variables set CF_VISION_MODEL="${workingModel}"`, { stdio: 'inherit' });
            console.log('✅ CF_VISION_MODEL updated successfully');

            // Verify the current settings
            console.log('\n📋 Current Railway Configuration:');
            try {
                const output = execSync('railway variables | grep CF_', { encoding: 'utf8' });
                console.log(output);
            } catch (error) {
                console.log('   (Could not fetch Railway variables - you may need to check manually)');
            }

        } catch (error) {
            console.log('❌ Failed to update Railway variables. Please run manually:');
            console.log(`   railway variables set CF_VISION_MODEL="${workingModel}"`);
        }
    }

    async testFinalConfiguration(model) {
        console.log(`\n🧪 Testing final configuration with ${model}...`);

        try {
            const response = await axios.post(
                `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`,
                {
                    image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R8VgO2JdE2s1WJ9T6HG5QVF3Jd6KzNx1K1MqO2dLxZM2pK6NyJpJcO',
                    prompt: 'Test food analysis',
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

            return { success: true, response: response.data };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    showSetupInstructions() {
        console.log('\n📋 SETUP INSTRUCTIONS:');
        console.log('1. Go to https://dash.cloudflare.com/profile/api-tokens');
        console.log('2. Create a new token with "Workers AI" template');
        console.log('3. Set permissions: Workers AI:Edit, Account:Read');
        console.log('4. Copy your Account ID from dashboard sidebar');
        console.log('');
        console.log('Set environment variables:');
        console.log('  railway variables set CF_ACCOUNT_ID="your_account_id"');
        console.log('  railway variables set CF_API_TOKEN="your_api_token"');
        console.log('  railway variables set CF_VISION_MODEL="@cf/llava-hf/llava-1.5-7b-hf"');
    }

    showAccountFixInstructions() {
        console.log('\n🔧 ACCOUNT ACCESS FIX:');
        console.log('1. Verify your Account ID is correct');
        console.log('2. Check API token has Workers AI permissions');
        console.log('3. Ensure your Cloudflare account is on a paid plan');
        console.log('4. Enable Workers AI in your dashboard');
        console.log('');
        console.log('Create new API token:');
        console.log('  - Go to https://dash.cloudflare.com/profile/api-tokens');
        console.log('  - Delete old token and create new one with Workers AI permissions');
    }

    showUpgradeInstructions() {
        console.log('\n💰 UPGRADE REQUIRED:');
        console.log('Workers AI requires a paid Cloudflare plan.');
        console.log('Upgrade options:');
        console.log('  - Pro plan: $20/month');
        console.log('  - Business plan: $200/month');
        console.log('');
        console.log('Alternative: Use OpenAI GPT-4 Vision or Anthropic Claude Vision');
    }

    showAlternativeInstructions() {
        console.log('\n🔄 ALTERNATIVE SOLUTIONS:');
        console.log('1. OpenAI GPT-4 Vision (recommended):');
        console.log('   railway variables set OPENAI_API_KEY="your_key"');
        console.log('');
        console.log('2. Anthropic Claude Vision:');
        console.log('   railway variables set ANTHROPIC_API_KEY="your_key"');
        console.log('');
        console.log('3. Local vision model (requires setup)');
    }

    showSuccessMessage(workingModel) {
        console.log('\n🎉 CONFIGURATION SUCCESSFUL!');
        console.log(`✅ Working model: ${workingModel}`);
        console.log('✅ Environment variables updated');
        console.log('✅ Vision analysis should now work');
        console.log('');
        console.log('Next steps:');
        console.log('1. Deploy changes: railway up');
        console.log('2. Test food analysis in your app');
        console.log('3. Monitor for any remaining issues');
    }

    showManualFixInstructions() {
        console.log('\n🔧 MANUAL FIX REQUIRED:');
        console.log('1. Check Railway dashboard for variable updates');
        console.log('2. Verify deployment completed successfully');
        console.log('3. Test food analysis endpoint manually');
        console.log('4. Check server logs for any remaining errors');
    }
}

// Run the fix if this script is executed directly
if (require.main === module) {
    const fixer = new CloudflareVisionFix();
    fixer.runFix().catch(console.error);
}

module.exports = CloudflareVisionFix;
