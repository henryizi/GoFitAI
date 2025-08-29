#!/usr/bin/env node

// Cloudflare LLaVA Setup Script
const { execSync } = require('child_process');
const fs = require('fs');

class CloudflareLLaVASetup {
    constructor() {
        this.requiredVars = [
            'CF_ACCOUNT_ID',
            'CF_API_TOKEN',
            'FOOD_ANALYZE_PROVIDER'
        ];
        this.optionalVars = [
            'CF_VISION_MODEL',
            'VISION_FALLBACK_ENABLED'
        ];
    }

    async checkRailwayLogin() {
        console.log('🔐 CHECKING RAILWAY LOGIN STATUS...');

        try {
            const result = execSync('railway whoami', { encoding: 'utf8' });
            console.log('✅ Railway authenticated as:', result.trim());
            return true;
        } catch (error) {
            console.log('❌ Railway not logged in');
            console.log('Please run: railway login');
            return false;
        }
    }

    async checkEnvironmentVariables() {
        console.log('\n📋 CHECKING ENVIRONMENT VARIABLES...');

        const vars = {};
        let allSet = true;

        for (const varName of this.requiredVars) {
            try {
                const result = execSync(`railway variables get ${varName}`, { encoding: 'utf8' }).trim();
                vars[varName] = result;
                console.log(`✅ ${varName}: ${result ? 'Set' : 'Empty'}`);
            } catch (error) {
                console.log(`❌ ${varName}: Not set`);
                allSet = false;
            }
        }

        for (const varName of this.optionalVars) {
            try {
                const result = execSync(`railway variables get ${varName}`, { encoding: 'utf8' }).trim();
                vars[varName] = result;
                console.log(`ℹ️  ${varName}: ${result || 'Not set'}`);
            } catch (error) {
                console.log(`ℹ️  ${varName}: Not set`);
            }
        }

        return { vars, allSet };
    }

    async setupEnvironmentVariables() {
        console.log('\n🔧 SETTING UP CLOUDFLARE ENVIRONMENT VARIABLES...');

        const variables = [
            {
                name: 'FOOD_ANALYZE_PROVIDER',
                value: 'cloudflare',
                description: 'Set food analysis provider to Cloudflare'
            },
            {
                name: 'CF_VISION_MODEL',
                value: '@cf/llava-hf/llava-1.5-7b-hf',
                description: 'Set primary vision model to LLaVA'
            },
            {
                name: 'VISION_FALLBACK_ENABLED',
                value: 'true',
                description: 'Enable fallback analysis'
            }
        ];

        for (const variable of variables) {
            try {
                console.log(`Setting ${variable.name}...`);
                execSync(`railway variables set "${variable.name}=${variable.value}"`, { stdio: 'inherit' });
                console.log(`✅ ${variable.name} set successfully`);
            } catch (error) {
                console.log(`❌ Failed to set ${variable.name}:`, error.message);
            }
        }

        console.log('\n⚠️  IMPORTANT: You still need to set your Cloudflare credentials:');
        console.log('1. Get your Cloudflare Account ID from: https://dash.cloudflare.com/');
        console.log('2. Get your API Token from: https://dash.cloudflare.com/profile/api-tokens');
        console.log('');
        console.log('Then run these commands:');
        console.log('railway variables set "CF_ACCOUNT_ID=your_account_id_here"');
        console.log('railway variables set "CF_API_TOKEN=your_api_token_here"');
    }

    async createLocalEnvFile() {
        console.log('\n📝 CREATING LOCAL ENVIRONMENT FILE...');

        const envPath = '.env.local';
        const envContent = `# Cloudflare Workers AI Configuration
# Get these values from https://dash.cloudflare.com/
CF_ACCOUNT_ID=your_account_id_here
CF_API_TOKEN=your_api_token_here

# Food Analysis Configuration
FOOD_ANALYZE_PROVIDER=cloudflare
CF_VISION_MODEL=@cf/llava-hf/llava-1.5-7b-hf
VISION_FALLBACK_ENABLED=true

# Add other environment variables as needed
`;

        if (fs.existsSync(envPath)) {
            console.log('⚠️  .env.local already exists, not overwriting');
        } else {
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Created .env.local file');
            console.log('📝 Edit this file with your actual Cloudflare credentials');
        }
    }

    async deployChanges() {
        console.log('\n🚀 DEPLOYING CHANGES...');

        try {
            console.log('Triggering Railway deployment...');
            execSync('railway deploy', { stdio: 'inherit' });
            console.log('✅ Deployment triggered successfully');
        } catch (error) {
            console.log('❌ Deployment failed:', error.message);
        }
    }

    async runFullSetup() {
        console.log('🚀 CLOUDFLARE LLaVA MODEL SETUP');
        console.log('='.repeat(50));

        const isLoggedIn = await this.checkRailwayLogin();
        if (!isLoggedIn) {
            console.log('\n❌ Please login to Railway first:');
            console.log('railway login');
            return;
        }

        const { vars, allSet } = await this.checkEnvironmentVariables();

        if (!allSet) {
            await this.setupEnvironmentVariables();
        } else {
            console.log('\n✅ All required variables are set!');
        }

        await this.createLocalEnvFile();

        console.log('\n📋 NEXT STEPS:');
        console.log('='.repeat(30));
        console.log('1. 🌐 Go to https://dash.cloudflare.com/');
        console.log('2. 🔑 Copy your Account ID from the right sidebar');
        console.log('3. 🔐 Create an API Token with Workers AI permissions');
        console.log('4. 📝 Run these commands with your actual values:');
        console.log('   railway variables set "CF_ACCOUNT_ID=YOUR_ACCOUNT_ID"');
        console.log('   railway variables set "CF_API_TOKEN=YOUR_API_TOKEN"');
        console.log('5. 🚀 Deploy: railway deploy');
        console.log('6. 🧪 Test: node test-llava-model.js');

        const shouldDeploy = await this.askToDeploy();
        if (shouldDeploy) {
            await this.deployChanges();
        }
    }

    async askToDeploy() {
        // Simple prompt for deployment
        console.log('\n❓ Would you like to deploy now? (y/n): ');
        // In a real implementation, you'd use readline for user input
        // For now, we'll assume they want to deploy
        return true;
    }

    provideInstructions() {
        console.log('📋 CLOUDFLARE LLaVA SETUP INSTRUCTIONS');
        console.log('='.repeat(50));
        console.log('');
        console.log('🔧 QUICK SETUP:');
        console.log('node setup-cloudflare-llava.js setup');
        console.log('');
        console.log('🔍 CHECK STATUS:');
        console.log('node setup-cloudflare-llava.js status');
        console.log('');
        console.log('🧪 TEST MODEL:');
        console.log('node test-llava-model.js');
        console.log('');
        console.log('📚 MANUAL STEPS:');
        console.log('1. railway login');
        console.log('2. railway variables set "CF_ACCOUNT_ID=your_id"');
        console.log('3. railway variables set "CF_API_TOKEN=your_token"');
        console.log('4. railway variables set "CF_VISION_MODEL=@cf/llava-hf/llava-1.5-7b-hf"');
        console.log('5. railway deploy');
        console.log('');
        console.log('🔗 LINKS:');
        console.log('• Cloudflare Dashboard: https://dash.cloudflare.com/');
        console.log('• Workers AI: https://ai.cloudflare.com/');
        console.log('• API Tokens: https://dash.cloudflare.com/profile/api-tokens');
    }
}

// Command line interface
if (require.main === module) {
    const setup = new CloudflareLLaVASetup();
    const command = process.argv[2];

    switch (command) {
        case 'setup':
            setup.runFullSetup().catch(console.error);
            break;
        case 'status':
            setup.checkRailwayLogin().then(loggedIn => {
                if (loggedIn) {
                    setup.checkEnvironmentVariables();
                }
            });
            break;
        case 'local':
            setup.createLocalEnvFile();
            break;
        default:
            setup.provideInstructions();
            break;
    }
}

module.exports = CloudflareLLaVASetup;
