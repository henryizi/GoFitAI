#!/usr/bin/env node

// Test LLaVA Model Specifically
const axios = require('axios');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config();

class LLaVATester {
    constructor() {
        this.model = '@cf/llava-hf/llava-1.5-7b-hf';
        this.accountId = process.env.CF_ACCOUNT_ID;
        this.apiToken = process.env.CF_API_TOKEN;
        this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
    }

    async testModelAccess() {
        console.log('🔍 TESTING CLOUDFLARE ACCOUNT ACCESS...');
        console.log(`Account ID: ${this.accountId ? '✅ Set' : '❌ Missing'}`);
        console.log(`API Token: ${this.apiToken ? '✅ Set' : '❌ Missing'}`);

        if (!this.accountId || !this.apiToken) {
            console.log('❌ Environment variables not configured');
            return false;
        }

        // First, test basic account access
        try {
            console.log('\n🏠 Testing basic account access...');
            const accountUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}`;

            const response = await axios.get(accountUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ Account access successful!');
            console.log(`Account Name: ${response.data.result?.name || 'Unknown'}`);

        } catch (error) {
            console.log('❌ Account access failed:');
            console.log('Status:', error.response?.status);
            console.log('Error:', error.response?.data?.errors?.[0]?.message || error.message);

            if (error.response?.status === 401) {
                console.log('🔐 AUTHENTICATION ISSUE: Check your API token');
            } else if (error.response?.status === 403) {
                console.log('🚫 PERMISSION ISSUE: Token may not have Workers AI permissions');
            }

            return false;
        }

        // Test Workers AI availability
        try {
            console.log('\n🤖 Testing Workers AI access...');
            const aiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/models`;

            const response = await axios.get(aiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ Workers AI access successful!');
            console.log(`Available models: ${response.data.result?.length || 0}`);

            // Show first few models
            if (response.data.result && response.data.result.length > 0) {
                console.log('📋 First few available models:');
                response.data.result.slice(0, 5).forEach(model => {
                    console.log(`  • ${model.name}`);
                });
            }

            return true;

        } catch (error) {
            console.log('❌ Workers AI access failed:');
            console.log('Status:', error.response?.status);
            const errorCode = error.response?.data?.errors?.[0]?.code;
            const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;

            console.log(`Error (${errorCode}): ${errorMessage}`);

            if (errorCode === 9109) {
                console.log('🔧 ISSUE: Workers AI is not enabled for your account');
            } else if (errorCode === 1101) {
                console.log('💰 ISSUE: Insufficient credits/quota');
            }

            return false;
        }
    }

    async testVisionAnalysis() {
        console.log('\n🖼️  TESTING VISION ANALYSIS...');

        // Test multiple vision models
        const visionModels = [
            '@cf/llava-hf/llava-1.5-7b-hf',
            '@cf/meta/llama-3.2-11b-vision-instruct',
            '@cf/meta/llama-3.2-90b-vision-instruct',
            '@cf/unum/uform-gen2-qwen-500m'
        ];

        let workingVisionModels = [];

        for (const visionModel of visionModels) {
            console.log(`\n🎯 Testing vision model: ${visionModel}`);

            try {
                // Use a simple test image (minimal valid JPEG)
                const simpleImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//2Q==';
                const imageDataUrl = `data:image/jpeg;base64,${simpleImageBase64}`;

                const payload = {
                    image: imageDataUrl,
                    prompt: "What do you see in this image? Describe it briefly.",
                    max_tokens: 200
                };

                console.log('🚀 Sending vision analysis request...');

                const response = await axios.post(
                    `${this.baseURL}/${visionModel}`,
                    payload,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );

                console.log(`✅ Vision model ${visionModel} successful!`);
                console.log('📊 Response:');
                const result = response.data.result || response.data.response || '';
                console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));

                workingVisionModels.push(visionModel);

            } catch (error) {
                const errorCode = error.response?.data?.errors?.[0]?.code;
                const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;

                console.log(`❌ Vision model ${visionModel} failed (${errorCode}): ${errorMessage}`);
            }
        }

        if (workingVisionModels.length > 0) {
            console.log(`\n🎯 Working vision models: ${workingVisionModels.join(', ')}`);
            return true;
        } else {
            console.log('\n❌ No working vision models found');
            return false;
        }
    }

    async testFullService() {
        console.log('\n🔧 TESTING FULL VISION SERVICE...');

        try {
            const VisionService = require('./server/services/visionService');
            const visionService = new VisionService();

            // Read test image
            const testImagePath = './server/test-food-image.jpg';
            if (!fs.existsSync(testImagePath)) {
                console.log('❌ Test image not found');
                return false;
            }

            const testImageBuffer = fs.readFileSync(testImagePath);
            const base64Image = testImageBuffer.toString('base64');

            console.log('🚀 Testing vision service analyzeFoodImage...');

            const result = await visionService.analyzeFoodImage(base64Image);

            console.log('✅ Full service test successful!');
            console.log('📊 Result:', JSON.stringify(result, null, 2));

            return true;
        } catch (error) {
            console.log('❌ Full service test failed:');
            console.log('Error:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 RUNNING COMPREHENSIVE LLaVA MODEL TESTS...\n');

        const accessTest = await this.testModelAccess();
        const visionTest = accessTest ? await this.testVisionAnalysis() : false;
        const serviceTest = await this.testFullService();

        console.log('\n📋 TEST SUMMARY:');
        console.log('='.repeat(50));
        console.log(`Model Access: ${accessTest ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Vision Analysis: ${visionTest ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Full Service: ${serviceTest ? '✅ PASS' : '❌ FAIL'}`);

        if (accessTest && visionTest && serviceTest) {
            console.log('\n🎉 ALL TESTS PASSED! LLaVA model is working correctly.');
        } else {
            console.log('\n⚠️  SOME TESTS FAILED. Check the output above for details.');
            this.provideTroubleshootingGuide();
        }
    }

    provideTroubleshootingGuide() {
        console.log('\n🔧 TROUBLESHOOTING GUIDE:');
        console.log('='.repeat(50));
        console.log('');
        console.log('1. 🌐 Visit https://ai.cloudflare.com/');
        console.log('2. 🔐 Sign in and check your account status');
        console.log('3. 💳 Verify Workers AI is enabled');
        console.log('4. 💰 Check if you have sufficient credits/quota');
        console.log('');
        console.log('5. 🔄 Try these commands:');
        console.log('   node test-llava-model.js');
        console.log('   railway variables --set "CF_VISION_MODEL=@cf/llava-hf/llava-1.5-7b-hf"');
        console.log('   railway deploy');
        console.log('');
        console.log('6. 📞 Common error codes:');
        console.log('   7000: Model not available for your account');
        console.log('   9109: Workers AI not enabled');
        console.log('   1101: Insufficient credits');
        console.log('   10013: Rate limit exceeded');
        console.log('');
        console.log('7. 🆘 If still failing, contact Cloudflare support');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new LLaVATester();
    tester.runAllTests().catch(console.error);
}

module.exports = LLaVATester;
